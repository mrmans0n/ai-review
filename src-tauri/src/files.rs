use std::fs;
use std::path::Path;
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
pub fn list_files(dir: &Path, max_depth: usize) -> Result<Vec<String>, String> {
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
    base: &Path,
    current: &Path,
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_read_file_success() {
        use std::io::Write;
        
        let temp_dir = env::temp_dir();
        let file_path = temp_dir.join("test_read.txt");
        
        // Create test file
        let content = "Hello, World!";
        let mut file = fs::File::create(&file_path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        
        // Test reading
        let result = read_file(&file_path.to_string_lossy());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), content);
        
        // Cleanup
        let _ = fs::remove_file(&file_path);
    }

    #[test]
    fn test_read_file_not_found() {
        let result = read_file("/nonexistent/file.txt");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to read file"));
    }

    #[test]
    fn test_walk_dir_basic() {
        use std::io::Write;
        
        let temp_dir = env::temp_dir().join("test_walk_basic");
        let _ = fs::create_dir_all(&temp_dir);
        
        // Create test files
        let file1 = temp_dir.join("file1.txt");
        let file2 = temp_dir.join("file2.rs");
        fs::File::create(&file1).unwrap().write_all(b"test1").unwrap();
        fs::File::create(&file2).unwrap().write_all(b"test2").unwrap();
        
        // Test walk
        let mut files = Vec::new();
        walk_dir(&temp_dir, &temp_dir, &mut files, 0, 10).unwrap();
        
        assert_eq!(files.len(), 2);
        assert!(files.iter().any(|f| f.name == "file1.txt"));
        assert!(files.iter().any(|f| f.name == "file2.rs"));
        
        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_walk_dir_nested() {
        use std::io::Write;
        
        let temp_dir = env::temp_dir().join("test_walk_nested");
        let sub_dir = temp_dir.join("subdir");
        let _ = fs::create_dir_all(&sub_dir);
        
        // Create test files
        let file1 = temp_dir.join("root.txt");
        let file2 = sub_dir.join("nested.txt");
        fs::File::create(&file1).unwrap().write_all(b"root").unwrap();
        fs::File::create(&file2).unwrap().write_all(b"nested").unwrap();
        
        // Test walk
        let mut files = Vec::new();
        walk_dir(&temp_dir, &temp_dir, &mut files, 0, 10).unwrap();
        
        assert_eq!(files.len(), 2);
        assert!(files.iter().any(|f| f.name == "root.txt"));
        assert!(files.iter().any(|f| f.name == "nested.txt"));
        
        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_walk_dir_skips_hidden() {
        use std::io::Write;
        
        let temp_dir = env::temp_dir().join("test_walk_hidden");
        let _ = fs::create_dir_all(&temp_dir);
        
        // Create test files (including hidden)
        let visible = temp_dir.join("visible.txt");
        let hidden = temp_dir.join(".hidden.txt");
        fs::File::create(&visible).unwrap().write_all(b"visible").unwrap();
        fs::File::create(&hidden).unwrap().write_all(b"hidden").unwrap();
        
        // Test walk
        let mut files = Vec::new();
        walk_dir(&temp_dir, &temp_dir, &mut files, 0, 10).unwrap();
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].name, "visible.txt");
        
        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_walk_dir_max_depth() {
        use std::io::Write;
        
        let temp_dir = env::temp_dir().join("test_walk_depth");
        let level1 = temp_dir.join("level1");
        let level2 = level1.join("level2");
        let _ = fs::create_dir_all(&level2);
        
        // Create files at different levels
        let file0 = temp_dir.join("root.txt");
        let file1 = level1.join("level1.txt");
        let file2 = level2.join("level2.txt");
        fs::File::create(&file0).unwrap().write_all(b"0").unwrap();
        fs::File::create(&file1).unwrap().write_all(b"1").unwrap();
        fs::File::create(&file2).unwrap().write_all(b"2").unwrap();
        
        // Test walk with max_depth = 1
        let mut files = Vec::new();
        walk_dir(&temp_dir, &temp_dir, &mut files, 0, 1).unwrap();
        
        // Should get root.txt and level1.txt, but not level2.txt
        assert_eq!(files.len(), 2);
        assert!(files.iter().any(|f| f.name == "root.txt"));
        assert!(files.iter().any(|f| f.name == "level1.txt"));
        assert!(!files.iter().any(|f| f.name == "level2.txt"));
        
        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_walk_dir_skips_node_modules() {
        use std::io::Write;
        
        let temp_dir = env::temp_dir().join("test_walk_node_modules");
        let node_modules = temp_dir.join("node_modules");
        let _ = fs::create_dir_all(&node_modules);
        
        // Create files
        let visible = temp_dir.join("package.json");
        let in_node_modules = node_modules.join("library.js");
        fs::File::create(&visible).unwrap().write_all(b"{}").unwrap();
        fs::File::create(&in_node_modules).unwrap().write_all(b"code").unwrap();
        
        // Test walk
        let mut files = Vec::new();
        walk_dir(&temp_dir, &temp_dir, &mut files, 0, 10).unwrap();
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].name, "package.json");
        
        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
