use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

mod config;
mod files;
mod git;

// Global state to store the working directory
struct AppState {
    working_dir: Mutex<PathBuf>,
    wait_mode: Mutex<bool>,
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
fn is_wait_mode(state: tauri::State<AppState>) -> bool {
    *state.wait_mode.lock().unwrap()
}

#[tauri::command]
fn submit_feedback(feedback: String) {
    println!("{}", feedback);
    std::process::exit(0);
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
fn get_commit_ref_diff(path: String, commit: String) -> Result<git::GitDiffResult, String> {
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

#[tauri::command]
fn get_file_at_ref(path: String, git_ref: String, file_path: String) -> Result<String, String> {
    let dir = PathBuf::from(path);
    git::get_file_at_ref(&dir, &git_ref, &file_path)
}

#[tauri::command]
fn list_commits(path: String, limit: u32) -> Result<Vec<git::CommitInfo>, String> {
    let dir = PathBuf::from(path);
    git::list_commits(&dir, limit)
}

#[tauri::command]
fn get_commit_diff(path: String, hash: String) -> Result<git::GitDiffResult, String> {
    let dir = PathBuf::from(path);
    git::get_commit_diff(&dir, &hash)
}

#[tauri::command]
fn list_branches(path: String) -> Result<Vec<git::BranchInfo>, String> {
    let dir = PathBuf::from(path);
    git::list_branches(&dir)
}

#[tauri::command]
fn get_branch_diff(path: String, branch: String) -> Result<git::GitDiffResult, String> {
    let dir = PathBuf::from(path);
    git::get_branch_diff(&dir, &branch)
}

#[tauri::command]
fn list_files_at_ref(path: String, git_ref: String) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(path);
    git::list_files_at_ref(&dir, &git_ref)
}

#[tauri::command]
fn has_gg_stacks(path: String) -> bool {
    let dir = PathBuf::from(path);
    git::has_gg_stacks(&dir)
}

#[tauri::command]
fn list_gg_stacks(path: String) -> Result<Vec<git::GgStackInfo>, String> {
    let dir = PathBuf::from(path);
    git::list_gg_stacks(&dir)
}

#[tauri::command]
fn get_gg_stack_entries(
    path: String,
    stack_name: String,
) -> Result<Vec<git::GgStackEntry>, String> {
    let dir = PathBuf::from(path);
    git::get_gg_stack_entries(&dir, &stack_name)
}

#[tauri::command]
fn get_gg_stack_diff(path: String, stack_name: String) -> Result<String, String> {
    let dir = PathBuf::from(path);
    git::get_gg_stack_diff(&dir, &stack_name)
}

#[tauri::command]
fn get_gg_entry_diff(path: String, stack_name: String, hash: String) -> Result<String, String> {
    let dir = PathBuf::from(path);
    git::get_gg_entry_diff(&dir, &stack_name, &hash)
}

#[derive(serde::Serialize)]
struct InstallCliResult {
    success: bool,
    message: String,
    path_warning: bool,
}

#[derive(serde::Serialize)]
struct RepoInfo {
    name: String,
    path: String,
}

#[tauri::command]
fn check_cli_installed() -> bool {
    #[cfg(not(target_family = "unix"))]
    {
        return false;
    }

    #[cfg(target_family = "unix")]
    {
        use std::fs;

        // Get the home directory
        let Ok(home_dir) = std::env::var("HOME") else {
            return false;
        };

        let cli_path = PathBuf::from(&home_dir)
            .join(".local")
            .join("bin")
            .join("air");

        // Check if the file exists
        if !cli_path.exists() {
            return false;
        }

        // Check if it's a symlink
        let Ok(metadata) = fs::symlink_metadata(&cli_path) else {
            return false;
        };

        if !metadata.file_type().is_symlink() {
            return false;
        }

        // Check if the symlink points to a valid executable
        let Ok(target) = fs::read_link(&cli_path) else {
            return false;
        };

        // Verify the target exists and is executable
        if !target.exists() {
            return false;
        }

        // Get current executable path, resolving symlinks
        let Ok(current_exe) = std::env::current_exe().and_then(|p| p.canonicalize()) else {
            return false;
        };

        // Canonicalize target too for comparison
        let target_canonical = target.canonicalize().unwrap_or(target);
        target_canonical == current_exe
    }
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

        // Get the current executable path, resolving any symlinks
        let exe_path = std::env::current_exe()
            .and_then(|p| p.canonicalize())
            .map_err(|e| format!("Failed to get executable path: {}", e))?;

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
            "CLI installed successfully! You can now use 'air' from your terminal.".to_string()
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

#[tauri::command]
fn list_repos() -> Result<Vec<RepoInfo>, String> {
    let repos = config::list_repos()?;
    Ok(repos
        .into_iter()
        .map(|(name, path)| RepoInfo { name, path })
        .collect())
}

#[tauri::command]
fn add_repo(path: String) -> Result<RepoInfo, String> {
    let dir = PathBuf::from(&path);
    if !git::is_git_repo(&dir) {
        return Err("Not a git repository".to_string());
    }
    config::add_repo(&path)?;
    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());
    Ok(RepoInfo { name, path })
}

#[tauri::command]
fn remove_repo(path: String) -> Result<(), String> {
    config::remove_repo(&path)?;
    Ok(())
}

#[tauri::command]
fn switch_repo(path: String, state: tauri::State<AppState>) -> Result<git::GitDiffResult, String> {
    let dir = PathBuf::from(&path);
    if !git::is_git_repo(&dir) {
        return Err("Not a git repository".to_string());
    }
    let mut wd = state.working_dir.lock().unwrap();
    *wd = dir.clone();
    drop(wd);
    git::get_unstaged_diff(&dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let wait_mode = args.iter().any(|arg| arg == "--wait-mode");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            // Default to current directory
            let mut working_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

            // Check if a directory was passed as argument (ignore flags)
            if let Some(dir_arg) = args.iter().skip(1).find(|arg| !arg.starts_with("--")) {
                let arg_path = PathBuf::from(dir_arg);
                if arg_path.exists() && arg_path.is_dir() {
                    working_dir = arg_path;
                }
            }

            // Auto-add current repo to config if it's a git repo
            let wd = working_dir.clone();
            if git::is_git_repo(&wd) {
                let _ = config::add_repo(&wd.to_string_lossy());
            }

            // Initialize app state with working directory
            app.manage(AppState {
                working_dir: Mutex::new(working_dir),
                wait_mode: Mutex::new(wait_mode),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_working_directory,
            is_wait_mode,
            submit_feedback,
            is_git_repo,
            get_unstaged_diff,
            get_staged_diff,
            get_commit_ref_diff,
            list_files,
            read_file_content,
            get_file_at_ref,
            list_commits,
            get_commit_diff,
            list_branches,
            get_branch_diff,
            list_files_at_ref,
            has_gg_stacks,
            list_gg_stacks,
            get_gg_stack_entries,
            get_gg_stack_diff,
            get_gg_entry_diff,
            check_cli_installed,
            install_cli,
            list_repos,
            add_repo,
            remove_repo,
            switch_repo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    if wait_mode {
        std::process::exit(1);
    }
}
