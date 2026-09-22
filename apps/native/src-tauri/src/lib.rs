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

mod ipc;

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
fn hide_dock_icon(app: &mut App) {
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
}

#[cfg(not(target_os = "macos"))]
fn hide_dock_icon(_app: &mut App) {}

fn resolve_backend_dir(app: &App) -> Result<PathBuf, Box<dyn std::error::Error>> {
    if let Ok(custom_dir) = std::env::var("ANIMA_BACKEND_DIR") {
        return Ok(PathBuf::from(custom_dir));
    }

    if tauri::is_dev() {
        let dev_path = PathBuf::from("resources/backend");
        if dev_path.join("index.js").exists() {
            return Ok(dev_path.canonicalize().unwrap_or(dev_path));
        }
    }

    let resource_path = app
        .path()
        .resolve("resources/backend", BaseDirectory::Resource)?;
    Ok(resource_path)
}

fn spawn_backend(app: &App, ipc_port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let backend_dir = resolve_backend_dir(app)?;
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

    if !entry_file.exists() {
        return Err(format!("Backend entry file not found at {:?}", entry_file).into());
    }

    let mut command = app
        .shell()
        .sidecar("node")?
        .current_dir(&backend_dir)
        .args(["index.js"]);

    let managed_pod = std::env::var("MANAGED_POD").unwrap_or_else(|_| "true".to_string());
    command = command.env("MANAGED_POD", managed_pod);

    let serve_frontend = std::env::var("SERVE_FRONTEND").unwrap_or_else(|_| "true".to_string());
    command = command.env("SERVE_FRONTEND", serve_frontend);

    command = command.env("ANIMA_NATIVE", "true");
    command = command.env("ANIMA_NATIVE_IPC_PORT", ipc_port.to_string());

    let node_env = std::env::var("NODE_ENV").unwrap_or_else(|_| {
        if tauri::is_dev() {
            "development".to_string()
        } else {
            "production".to_string()
        }
    });
    command = command.env("NODE_ENV", node_env);

    if let Ok(val) = std::env::var("E2E") {
        command = command.env("E2E", val);
    }

    let (mut rx, child) = command.spawn()?;

    app.manage(BackendState {
        child: Mutex::new(Some(child)),
    });

    // Drain stdout/stderr asynchronously to avoid pipe backpressure blocking
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[node] {}", String::from_utf8_lossy(&line))
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[node] {}", String::from_utf8_lossy(&line))
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!("[node] Process terminated with code: {:?}", payload.code)
                }
                _ => {}
            }
        }
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
        .tooltip("Ànima")
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Err(err) = app.opener().open_url(BACKEND_URL, None::<&str>) {
                    eprintln!("[native] Failed to open URL: {err}");
                }
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
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let ipc_port = ipc::start_ipc_server(app.handle().clone())?;

            hide_dock_icon(app);
            spawn_backend(app, ipc_port)?;
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
