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
fn get_working_dir(state: tauri::State<AppState>) -> String {
    state.working_dir.lock().unwrap().to_string_lossy().to_string()
}

#[tauri::command]
fn set_working_dir(state: tauri::State<AppState>, dir: String) -> Result<(), String> {
    let path = PathBuf::from(dir);
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", path.display()));
    }
    *state.working_dir.lock().unwrap() = path;
    Ok(())
}

#[tauri::command]
fn is_git_repo(state: tauri::State<AppState>) -> bool {
    let dir = state.working_dir.lock().unwrap().clone();
    git::is_git_repo(&dir)
}

#[tauri::command]
fn get_git_root(state: tauri::State<AppState>) -> Option<String> {
    let dir = state.working_dir.lock().unwrap().clone();
    git::get_git_root(&dir).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn get_unstaged_diff(state: tauri::State<AppState>) -> Result<git::GitDiffResult, String> {
    let dir = state.working_dir.lock().unwrap().clone();
    git::get_unstaged_diff(&dir)
}

#[tauri::command]
fn get_staged_diff(state: tauri::State<AppState>) -> Result<git::GitDiffResult, String> {
    let dir = state.working_dir.lock().unwrap().clone();
    git::get_staged_diff(&dir)
}

#[tauri::command]
fn get_head_diff(state: tauri::State<AppState>, n: u32) -> Result<git::GitDiffResult, String> {
    let dir = state.working_dir.lock().unwrap().clone();
    git::get_head_diff(&dir, n)
}

#[tauri::command]
fn get_file_diff(state: tauri::State<AppState>, file_path: String, staged: bool) -> Result<String, String> {
    let dir = state.working_dir.lock().unwrap().clone();
    git::get_file_diff(&dir, &file_path, staged)
}

#[tauri::command]
fn read_file(state: tauri::State<AppState>, file_path: String) -> Result<String, String> {
    let dir = state.working_dir.lock().unwrap().clone();
    let full_path = dir.join(file_path);
    files::read_file(&full_path.to_string_lossy())
}

#[tauri::command]
fn list_files(state: tauri::State<AppState>) -> Result<Vec<files::FileEntry>, String> {
    let dir = state.working_dir.lock().unwrap().clone();
    files::list_files(&dir, 10) // max depth 10
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
            get_working_dir,
            set_working_dir,
            is_git_repo,
            get_git_root,
            get_unstaged_diff,
            get_staged_diff,
            get_head_diff,
            get_file_diff,
            read_file,
            list_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
