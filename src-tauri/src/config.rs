use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Config {
    #[serde(default)]
    pub repos: Vec<String>,
}

impl Default for Config {
    fn default() -> Self {
        Config { repos: vec![] }
    }
}

/// Returns the config file path: ~/.config/ai-review/config.json
fn config_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Cannot determine home directory".to_string())?;
    Ok(PathBuf::from(home)
        .join(".config")
        .join("ai-review")
        .join("config.json"))
}

/// Read config from disk, creating file + dirs if missing.
pub fn read_config() -> Result<Config, String> {
    let path = config_path()?;
    if !path.exists() {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }
        let default = Config::default();
        let json = serde_json::to_string_pretty(&default)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&path, json)
            .map_err(|e| format!("Failed to write config: {}", e))?;
        return Ok(default);
    }
    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse config: {}", e))
}

/// Write config to disk.
pub fn write_config(config: &Config) -> Result<(), String> {
    let path = config_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write config: {}", e))
}

/// Add a repo path to config. Idempotent.
pub fn add_repo(path: &str) -> Result<Config, String> {
    let mut config = read_config()?;
    let canonical = PathBuf::from(path)
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?
        .to_string_lossy()
        .to_string();
    if !config.repos.contains(&canonical) {
        config.repos.push(canonical);
        write_config(&config)?;
    }
    Ok(config)
}

/// Remove a repo path from config.
pub fn remove_repo(path: &str) -> Result<Config, String> {
    let mut config = read_config()?;
    config.repos.retain(|p| p != path);
    write_config(&config)?;
    Ok(config)
}

/// Return repos list, filtering out paths that no longer exist on disk.
pub fn list_repos() -> Result<Vec<(String, String)>, String> {
    let config = read_config()?;
    let repos: Vec<(String, String)> = config
        .repos
        .iter()
        .filter(|p| PathBuf::from(p).exists())
        .map(|p| {
            let name = PathBuf::from(p)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| p.clone());
            (name, p.clone())
        })
        .collect();
    Ok(repos)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    /// Helper: run test with a temp HOME to isolate config.
    fn with_temp_home<F: FnOnce()>(f: F) {
        let tmp = std::env::temp_dir().join(format!("air-test-{}", std::process::id()));
        fs::create_dir_all(&tmp).unwrap();
        let old_home = env::var("HOME").ok();
        unsafe { env::set_var("HOME", &tmp); }
        f();
        if let Some(h) = old_home {
            unsafe { env::set_var("HOME", h); }
        }
        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_read_creates_default_config() {
        with_temp_home(|| {
            let config = read_config().unwrap();
            assert!(config.repos.is_empty());
            let path = config_path().unwrap();
            assert!(path.exists());
        });
    }

    #[test]
    fn test_add_and_list_repos() {
        with_temp_home(|| {
            let tmp = env::temp_dir();
            let path_str = tmp.to_string_lossy().to_string();
            add_repo(&path_str).unwrap();
            let repos = list_repos().unwrap();
            assert_eq!(repos.len(), 1);
            add_repo(&path_str).unwrap();
            let repos = list_repos().unwrap();
            assert_eq!(repos.len(), 1);
        });
    }

    #[test]
    fn test_remove_repo() {
        with_temp_home(|| {
            let tmp = env::temp_dir();
            let path_str = tmp.canonicalize().unwrap().to_string_lossy().to_string();
            add_repo(&path_str).unwrap();
            assert_eq!(list_repos().unwrap().len(), 1);
            remove_repo(&path_str).unwrap();
            assert_eq!(list_repos().unwrap().len(), 0);
        });
    }

    #[test]
    fn test_list_filters_nonexistent() {
        with_temp_home(|| {
            let mut config = read_config().unwrap();
            config.repos.push("/nonexistent/fake/repo".to_string());
            write_config(&config).unwrap();
            let repos = list_repos().unwrap();
            assert!(repos.is_empty());
        });
    }
}
