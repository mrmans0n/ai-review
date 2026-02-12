use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GitFile {
    pub path: String,
    pub status: String, // "modified", "added", "deleted", "renamed"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitDiffResult {
    pub diff: String,
    pub files: Vec<GitFile>,
}

/// Check if a directory is a git repository
pub fn is_git_repo(dir: &PathBuf) -> bool {
    dir.join(".git").exists()
}

/// Get the git root directory
pub fn get_git_root(dir: &PathBuf) -> Option<PathBuf> {
    let output = Command::new("git")
        .arg("rev-parse")
        .arg("--show-toplevel")
        .current_dir(dir)
        .output()
        .ok()?;
    
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Some(PathBuf::from(path))
    } else {
        None
    }
}

/// Get unstaged changes
pub fn get_unstaged_diff(dir: &PathBuf) -> Result<GitDiffResult, String> {
    let diff_output = Command::new("git")
        .arg("diff")
        .arg("--no-color")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to execute git diff: {}", e))?;
    
    if !diff_output.status.success() {
        return Err(String::from_utf8_lossy(&diff_output.stderr).to_string());
    }
    
    let diff = String::from_utf8_lossy(&diff_output.stdout).to_string();
    let files = get_changed_files(dir, false)?;
    
    Ok(GitDiffResult { diff, files })
}

/// Get staged changes
pub fn get_staged_diff(dir: &PathBuf) -> Result<GitDiffResult, String> {
    let diff_output = Command::new("git")
        .arg("diff")
        .arg("--staged")
        .arg("--no-color")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to execute git diff --staged: {}", e))?;
    
    if !diff_output.status.success() {
        return Err(String::from_utf8_lossy(&diff_output.stderr).to_string());
    }
    
    let diff = String::from_utf8_lossy(&diff_output.stdout).to_string();
    let files = get_changed_files(dir, true)?;
    
    Ok(GitDiffResult { diff, files })
}

/// Get diff against HEAD~N
pub fn get_head_diff(dir: &PathBuf, n: u32) -> Result<GitDiffResult, String> {
    let ref_spec = if n == 0 {
        "HEAD".to_string()
    } else {
        format!("HEAD~{}", n)
    };
    
    let diff_output = Command::new("git")
        .arg("diff")
        .arg(&ref_spec)
        .arg("--no-color")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to execute git diff {}: {}", ref_spec, e))?;
    
    if !diff_output.status.success() {
        return Err(String::from_utf8_lossy(&diff_output.stderr).to_string());
    }
    
    let diff = String::from_utf8_lossy(&diff_output.stdout).to_string();
    
    // Get files changed in that commit
    let files_output = Command::new("git")
        .arg("diff-tree")
        .arg("--no-commit-id")
        .arg("--name-status")
        .arg("-r")
        .arg(&ref_spec)
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to get changed files: {}", e))?;
    
    let files = parse_file_status(&String::from_utf8_lossy(&files_output.stdout));
    
    Ok(GitDiffResult { diff, files })
}

/// Get list of changed files
fn get_changed_files(dir: &PathBuf, staged: bool) -> Result<Vec<GitFile>, String> {
    let mut args = vec!["status", "--porcelain"];
    if staged {
        args.push("--staged");
    }
    
    let output = Command::new("git")
        .args(&args)
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to get changed files: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_porcelain_status(&stdout))
}

/// Parse git status --porcelain output
fn parse_porcelain_status(output: &str) -> Vec<GitFile> {
    output
        .lines()
        .filter_map(|line| {
            if line.len() < 4 {
                return None;
            }
            
            let status_code = &line[0..2];
            let path = line[3..].trim().to_string();
            
            let status = match status_code.trim() {
                "M" | " M" | "MM" => "modified",
                "A" | "AM" => "added",
                "D" | " D" => "deleted",
                "R" => "renamed",
                _ => "modified",
            };
            
            Some(GitFile {
                path,
                status: status.to_string(),
            })
        })
        .collect()
}

/// Parse git diff-tree --name-status output
fn parse_file_status(output: &str) -> Vec<GitFile> {
    output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 2 {
                return None;
            }
            
            let status = match parts[0] {
                "M" => "modified",
                "A" => "added",
                "D" => "deleted",
                "R" => "renamed",
                _ => "modified",
            };
            
            Some(GitFile {
                path: parts[1].to_string(),
                status: status.to_string(),
            })
        })
        .collect()
}

/// Get diff for a specific file
pub fn get_file_diff(dir: &PathBuf, file_path: &str, staged: bool) -> Result<String, String> {
    let mut args = vec!["diff", "--no-color"];
    if staged {
        args.push("--staged");
    }
    args.push(file_path);
    
    let output = Command::new("git")
        .args(&args)
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to get file diff: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
