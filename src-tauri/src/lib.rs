use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

mod git;
mod files;

// Global state to store the working directory
struct AppState {
    working_dir: Mutex<PathBuf>,
}

#[tauri::command]
fn get_working_directory(state: tauri::State<AppState>) -> String {
    state.working_dir.lock().unwrap().to_string_lossy().to_string()
}

#[tauri::command]
fn is_git_repo(path: String) -> bool {
    let dir = PathBuf::from(path);
    git::is_git_repo(&dir)
}

#[tauri::command]
fn get_unstaged_diff(path: String) -> Result<git::GitDiffResult, String> {
    let dir = PathBuf::from(path);
    git::get_unstaged_diff(&dir)
}

#[tauri::command]
fn get_staged_diff(path: String) -> Result<git::GitDiffResult, String> {
    let dir = PathBuf::from(path);
    git::get_staged_diff(&dir)
}

#[tauri::command]
fn get_commit_diff(path: String, commit: String) -> Result<git::GitDiffResult, String> {
    let dir = PathBuf::from(path);
    // Parse commit ref to get the number (e.g., "HEAD~1" -> 1)
    let n = if commit == "HEAD" {
        0
    } else if let Some(num_str) = commit.strip_prefix("HEAD~") {
        num_str.parse::<u32>().unwrap_or(1)
    } else {
        1
    };
    git::get_head_diff(&dir, n)
}

#[tauri::command]
fn list_files(path: String) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(path);
    files::list_files(&dir, 10)
}

#[tauri::command]
fn read_file_content(path: String, file_path: String) -> Result<String, String> {
    let dir = PathBuf::from(path);
    let full_path = dir.join(file_path);
    files::read_file(&full_path.to_string_lossy())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Get CLI arguments
            let args: Vec<String> = std::env::args().collect();
            
            // Default to current directory
            let mut working_dir = std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."));
            
            // Check if a directory was passed as argument
            if args.len() > 1 {
                let arg_path = PathBuf::from(&args[1]);
                if arg_path.exists() && arg_path.is_dir() {
                    working_dir = arg_path;
                }
            }
            
            // Initialize app state with working directory
            app.manage(AppState {
                working_dir: Mutex::new(working_dir),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_working_directory,
            is_git_repo,
            get_unstaged_diff,
            get_staged_diff,
            get_commit_diff,
            list_files,
            read_file_content,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
