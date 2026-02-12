use std::path::{Path, PathBuf};
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
pub fn is_git_repo(dir: &Path) -> bool {
    dir.join(".git").exists()
}

/// Get the git root directory
#[allow(dead_code)]
pub fn get_git_root(dir: &Path) -> Option<PathBuf> {
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
pub fn get_unstaged_diff(dir: &Path) -> Result<GitDiffResult, String> {
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
pub fn get_staged_diff(dir: &Path) -> Result<GitDiffResult, String> {
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
pub fn get_head_diff(dir: &Path, n: u32) -> Result<GitDiffResult, String> {
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
fn get_changed_files(dir: &Path, staged: bool) -> Result<Vec<GitFile>, String> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_porcelain_status_modified() {
        let output = " M src/main.rs\n";
        let files = parse_porcelain_status(output);
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/main.rs");
        assert_eq!(files[0].status, "modified");
    }

    #[test]
    fn test_parse_porcelain_status_added() {
        let output = "A  src/new.rs\n";
        let files = parse_porcelain_status(output);
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/new.rs");
        assert_eq!(files[0].status, "added");
    }

    #[test]
    fn test_parse_porcelain_status_deleted() {
        let output = " D src/old.rs\n";
        let files = parse_porcelain_status(output);
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/old.rs");
        assert_eq!(files[0].status, "deleted");
    }

    #[test]
    fn test_parse_porcelain_status_multiple() {
        let output = " M src/main.rs\nA  src/new.rs\n D src/old.rs\n";
        let files = parse_porcelain_status(output);
        
        assert_eq!(files.len(), 3);
        assert_eq!(files[0].status, "modified");
        assert_eq!(files[1].status, "added");
        assert_eq!(files[2].status, "deleted");
    }

    #[test]
    fn test_parse_porcelain_status_empty() {
        let output = "";
        let files = parse_porcelain_status(output);
        
        assert_eq!(files.len(), 0);
    }

    #[test]
    fn test_parse_porcelain_status_modified_both() {
        let output = "MM src/file.rs\n";
        let files = parse_porcelain_status(output);
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].status, "modified");
    }

    #[test]
    fn test_parse_file_status_modified() {
        let output = "M\tsrc/main.rs\n";
        let files = parse_file_status(output);
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/main.rs");
        assert_eq!(files[0].status, "modified");
    }

    #[test]
    fn test_parse_file_status_added() {
        let output = "A\tsrc/new.rs\n";
        let files = parse_file_status(output);
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/new.rs");
        assert_eq!(files[0].status, "added");
    }

    #[test]
    fn test_parse_file_status_deleted() {
        let output = "D\tsrc/old.rs\n";
        let files = parse_file_status(output);
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/old.rs");
        assert_eq!(files[0].status, "deleted");
    }

    #[test]
    fn test_parse_file_status_multiple() {
        let output = "M\tsrc/main.rs\nA\tsrc/new.rs\nD\tsrc/old.rs\n";
        let files = parse_file_status(output);
        
        assert_eq!(files.len(), 3);
        assert_eq!(files[0].status, "modified");
        assert_eq!(files[1].status, "added");
        assert_eq!(files[2].status, "deleted");
    }

    #[test]
    fn test_parse_file_status_empty() {
        let output = "";
        let files = parse_file_status(output);
        
        assert_eq!(files.len(), 0);
    }

    #[test]
    fn test_parse_file_status_invalid_line() {
        let output = "M\n";
        let files = parse_file_status(output);
        
        assert_eq!(files.len(), 0);
    }

    #[test]
    fn test_is_git_repo_true() {
        use std::env;
        use std::fs;
        
        // Create a temporary directory with .git
        let temp_dir = env::temp_dir().join("test_git_repo");
        let _ = fs::create_dir_all(&temp_dir);
        let git_dir = temp_dir.join(".git");
        let _ = fs::create_dir_all(&git_dir);
        
        assert!(is_git_repo(&temp_dir));
        
        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_is_git_repo_false() {
        use std::env;
        
        let temp_dir = env::temp_dir().join("test_not_git_repo");
        assert!(!is_git_repo(&temp_dir));
    }
}

/// Get diff for a specific file
#[allow(dead_code)]
pub fn get_file_diff(dir: &Path, file_path: &str, staged: bool) -> Result<String, String> {
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
