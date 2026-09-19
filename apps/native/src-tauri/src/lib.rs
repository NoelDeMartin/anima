use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItem},
    path::BaseDirectory,
    tray::TrayIconBuilder,
    App, AppHandle, Manager, RunEvent,
};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

const BACKEND_URL: &str = "http://localhost:1191";

pub struct BackendState {
    pub child: Mutex<Option<CommandChild>>,
}

#[cfg(unix)]
fn kill_process_tree(pid: u32) {
    let pid_str = pid.to_string();
    let _ = std::process::Command::new("pkill")
        .args(["-TERM", "-P", &pid_str])
        .status();
    let _ = std::process::Command::new("pkill")
        .args(["-9", "-P", &pid_str])
        .status();
}

#[cfg(windows)]
fn kill_process_tree(pid: u32) {
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .status();
}

#[cfg(not(any(unix, windows)))]
fn kill_process_tree(_pid: u32) {}

fn kill_backend(app: &AppHandle) {
    if let Some(state) = app.try_state::<BackendState>() {
        if let Ok(mut lock) = state.child.lock() {
            if let Some(child) = lock.take() {
                kill_process_tree(child.pid());
                let _ = child.kill();
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn hide_dock_icon(app: &App) {
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
}

#[cfg(not(target_os = "macos"))]
fn hide_dock_icon(_app: &App) {}

fn resolve_backend_dir(app: &App) -> PathBuf {
    #[cfg(debug_assertions)]
    {
        let dev_path = PathBuf::from("resources/backend");
        if dev_path.join("index.js").exists() {
            return dev_path.canonicalize().unwrap_or(dev_path);
        }
    }

    app.path()
        .resolve("resources/backend", BaseDirectory::Resource)
        .unwrap_or_else(|_| PathBuf::from("resources/backend"))
}

fn spawn_backend(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let backend_dir = resolve_backend_dir(app);
    let entry_file = backend_dir.join("index.js");

    #[cfg(debug_assertions)]
    {
        println!("[native] Resolved backend dir: {:?}", backend_dir);
        println!(
            "[native] Resolved entry file: {:?} (exists: {})",
            entry_file,
            entry_file.exists()
        );
    }

    let mut command = app
        .shell()
        .sidecar("node")?
        .current_dir(&backend_dir)
        .args([entry_file.to_string_lossy().as_ref()]);

    let managed_pod = std::env::var("MANAGED_POD").unwrap_or_else(|_| "true".to_string());
    command = command.env("MANAGED_POD", managed_pod);

    let serve_frontend = std::env::var("SERVE_FRONTEND").unwrap_or_else(|_| "true".to_string());
    command = command.env("SERVE_FRONTEND", serve_frontend);

    if let Ok(val) = std::env::var("E2E") {
        command = command.env("E2E", val);
    }

    let (mut rx, child) = command.spawn()?;

    app.manage(BackendState {
        child: Mutex::new(Some(child)),
    });

    // Drain stdout/stderr asynchronously to avoid pipe backpressure blocking
    tauri::async_runtime::spawn(async move {
        #[cfg(debug_assertions)]
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[node] {}", String::from_utf8_lossy(&line))
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[node] {}", String::from_utf8_lossy(&line))
                }
                _ => {}
            }
        }
        #[cfg(not(debug_assertions))]
        while rx.recv().await.is_some() {}
    });

    Ok(())
}

fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "open", "Open App", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let mut tray_builder = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                let _ = app.opener().open_url(BACKEND_URL, None::<&str>);
            }
            "quit" => {
                kill_backend(app);
                app.exit(0);
            }
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone());
    }

    tray_builder.build(app)?;

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            hide_dock_icon(app);
            spawn_backend(app)?;
            setup_tray(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                kill_backend(app_handle);
            }
        });
}
