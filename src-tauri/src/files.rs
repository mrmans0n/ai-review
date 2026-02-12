use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
}

/// Read file contents
pub fn read_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// List files in a directory (recursive, respecting .gitignore if in git repo)
pub fn list_files(dir: &PathBuf, max_depth: usize) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    
    // Try to use git ls-files for better performance and .gitignore support
    if dir.join(".git").exists() {
        let output = Command::new("git")
            .arg("ls-files")
            .current_dir(dir)
            .output()
            .ok();
        
        if let Some(output) = output {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let path = line.trim();
                    if !path.is_empty() {
                        files.push(path.to_string());
                    }
                }
                return Ok(files);
            }
        }
    }
    
    // Fallback to recursive directory walk
    let mut file_entries = Vec::new();
    walk_dir(dir, dir, &mut file_entries, 0, max_depth)?;
    
    // Extract just the paths
    Ok(file_entries.iter().map(|f| f.path.clone()).collect())
}

/// Recursive directory walker (fallback when git is not available)
fn walk_dir(
    base: &PathBuf,
    current: &PathBuf,
    files: &mut Vec<FileEntry>,
    depth: usize,
    max_depth: usize,
) -> Result<(), String> {
    if depth > max_depth {
        return Ok(());
    }
    
    let entries = fs::read_dir(current)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let name = entry
            .file_name()
            .to_string_lossy()
            .to_string();
        
        // Skip hidden files and common directories to ignore
        if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" {
            continue;
        }
        
        let relative_path = path
            .strip_prefix(base)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();
        
        if path.is_dir() {
            walk_dir(base, &path, files, depth + 1, max_depth)?;
        } else {
            files.push(FileEntry {
                path: relative_path,
                name,
                is_dir: false,
            });
        }
    }
    
    Ok(())
}
