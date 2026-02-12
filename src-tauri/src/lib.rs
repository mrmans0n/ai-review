use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

mod files;
mod git;

// Global state to store the working directory
struct AppState {
    working_dir: Mutex<PathBuf>,
}

#[tauri::command]
fn get_working_directory(state: tauri::State<AppState>) -> String {
    state
        .working_dir
        .lock()
        .unwrap()
        .to_string_lossy()
        .to_string()
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

#[derive(serde::Serialize)]
struct InstallCliResult {
    success: bool,
    message: String,
    path_warning: bool,
}

#[tauri::command]
fn install_cli() -> Result<InstallCliResult, String> {
    #[cfg(not(target_family = "unix"))]
    {
        return Err("CLI installation is only supported on macOS and Linux".to_string());
    }

    #[cfg(target_family = "unix")]
    {
        use std::fs;
        use std::os::unix::fs::symlink;

        // Get the current executable path
        let exe_path =
            std::env::current_exe().map_err(|e| format!("Failed to get executable path: {}", e))?;

        // Expand home directory
        let home_dir =
            std::env::var("HOME").map_err(|_| "Failed to get HOME directory".to_string())?;
        let local_bin = PathBuf::from(&home_dir).join(".local").join("bin");
        let cli_path = local_bin.join("air");

        // Create ~/.local/bin if it doesn't exist
        if !local_bin.exists() {
            fs::create_dir_all(&local_bin).map_err(|e| {
                format!("Failed to create directory {}: {}", local_bin.display(), e)
            })?;
        }

        // Remove existing symlink if it exists
        if cli_path.exists() {
            fs::remove_file(&cli_path)
                .map_err(|e| format!("Failed to remove existing CLI: {}", e))?;
        }

        // Create symlink
        symlink(&exe_path, &cli_path).map_err(|e| format!("Failed to create symlink: {}", e))?;

        // Check if ~/.local/bin is in PATH
        let path_env = std::env::var("PATH").unwrap_or_default();
        let local_bin_str = local_bin.to_string_lossy();
        let in_path = path_env.split(':').any(|p| p == local_bin_str);

        let message = if in_path {
            format!("CLI installed successfully! You can now use 'air' from your terminal.")
        } else {
            format!(
                "CLI installed to {}. Add this directory to your PATH to use 'air' from anywhere.",
                local_bin.display()
            )
        };

        Ok(InstallCliResult {
            success: true,
            message,
            path_warning: !in_path,
        })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Get CLI arguments
            let args: Vec<String> = std::env::args().collect();

            // Default to current directory
            let mut working_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

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
            install_cli,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
