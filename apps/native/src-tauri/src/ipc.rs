use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

pub fn start_ipc_server(app: AppHandle) -> Result<u16, Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();

    thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(stream) = stream else {
                continue;
            };

            let app = app.clone();

            thread::spawn(move || {
                let mut stream = stream;
                let mut buffer = [0u8; 2048];
                let Ok(bytes_read) = stream.read(&mut buffer) else {
                    return;
                };

                let request = String::from_utf8_lossy(&buffer[..bytes_read]);

                handle_request(&app, &mut stream, &request);
            });
        }
    });

    Ok(port)
}

fn handle_request(app: &AppHandle, stream: &mut TcpStream, request: &str) {
    let route = request
        .lines()
        .next()
        .unwrap_or("")
        .rsplit_once(' ')
        .map_or("", |(r, _)| r);

    let (status, body) = match route {
        "POST /pick-folder" => handle_pick_folder(app),
        _ => handle_not_found(),
    };

    send_json_response(stream, status, &body);
}

fn handle_pick_folder(app: &AppHandle) -> (u16, String) {
    let folder = app.dialog().file().blocking_pick_folder();
    let path_json = match folder {
        Some(file_path) => {
            let path_str = file_path.as_path().map(|p| p.to_string_lossy().to_string());
            match path_str {
                Some(s) => format!(
                    "{{\"path\":{}}}",
                    serde_json::to_string(&s).unwrap_or_default()
                ),
                None => "{\"path\":null}".to_string(),
            }
        }
        None => "{\"path\":null}".to_string(),
    };

    (200, path_json)
}

fn handle_not_found() -> (u16, String) {
    (404, "{\"error\":\"Not Found\"}".to_string())
}

fn send_json_response(stream: &mut TcpStream, status: u16, body: &str) {
    let status_text = match status {
        200 => "OK",
        404 => "Not Found",
        _ => "Unknown",
    };

    let response = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status,
        status_text,
        body.len(),
        body
    );

    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}
