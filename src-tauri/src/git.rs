use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct CommitInfo {
    pub hash: String,       // full hash
    pub short_hash: String, // short hash
    pub message: String,    // commit message
    pub author: String,     // author name
    pub date: String,       // relative date
    pub refs: String,       // branch/tag refs
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BranchInfo {
    pub name: String,
    pub short_hash: String,
    pub subject: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GgStackInfo {
    pub name: String,
    pub base: String,
    pub commit_count: usize,
    pub is_current: bool,
    pub username: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GgStackEntry {
    pub hash: String,
    pub short_hash: String,
    pub title: String,
    pub gg_id: Option<String>,
    pub mr_number: Option<u64>,
    pub position: usize,
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
    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to get changed files: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_porcelain_status(&stdout, staged))
}

/// Parse git status --porcelain output
/// Format: XY filename where X=index status, Y=working tree status
/// If staged=true, only return files with X in {M, A, D, R, C} (not ' ' or '?')
/// If staged=false, return all changed files
fn parse_porcelain_status(output: &str, staged: bool) -> Vec<GitFile> {
    output
        .lines()
        .filter_map(|line| {
            if line.len() < 4 {
                return None;
            }

            let index_status = line.chars().next().unwrap_or(' ');
            let worktree_status = line.chars().nth(1).unwrap_or(' ');
            let path = line[3..].trim().to_string();

            // Filter based on staged flag
            if staged {
                // For staged files, index status must not be ' ' or '?'
                if index_status == ' ' || index_status == '?' {
                    return None;
                }
            }

            // Determine file status based on index and worktree status
            let status = if staged {
                // Use index status for staged files
                match index_status {
                    'M' => "modified",
                    'A' => "added",
                    'D' => "deleted",
                    'R' => "renamed",
                    'C' => "modified", // copied
                    _ => "modified",
                }
            } else {
                // Use both statuses for unstaged (prioritize worktree)
                match (index_status, worktree_status) {
                    (_, 'M') => "modified",
                    ('M', _) => "modified",
                    ('A', _) => "added",
                    (_, 'D') => "deleted",
                    ('D', _) => "deleted",
                    ('R', _) => "renamed",
                    _ => "modified",
                }
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

/// List recent commits
pub fn list_commits(dir: &Path, limit: u32) -> Result<Vec<CommitInfo>, String> {
    let output = Command::new("git")
        .arg("log")
        .arg("--oneline")
        .arg("--format=%H|%h|%s|%an|%ar|%D")
        .arg(format!("-{}", limit))
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to execute git log: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_commit_log(&stdout))
}

/// Parse git log output with format "%H|%h|%s|%an|%ar|%D"
fn parse_commit_log(output: &str) -> Vec<CommitInfo> {
    output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() < 5 {
                return None;
            }

            // Format: hash|short_hash|message|author|date|refs
            // Since message can contain pipes, we need to reconstruct it
            // from parts[2] to parts[parts.len() - 3]
            let message = if parts.len() > 5 {
                parts[2..parts.len() - 3].join("|")
            } else {
                parts[2].to_string()
            };

            Some(CommitInfo {
                hash: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                message,
                author: parts[parts.len() - 3].to_string(),
                date: parts[parts.len() - 2].to_string(),
                refs: parts[parts.len() - 1].to_string(),
            })
        })
        .collect()
}

/// List local and remote branches
pub fn list_branches(dir: &Path) -> Result<Vec<BranchInfo>, String> {
    let output = Command::new("git")
        .arg("branch")
        .arg("-a")
        .arg("--format=%(refname:short)|%(objectname:short)|%(subject)|%(authorname)|%(committerdate:relative)")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to execute git branch: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_branch_list(&stdout))
}

fn parse_branch_list(output: &str) -> Vec<BranchInfo> {
    output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() < 5 {
                return None;
            }

            Some(BranchInfo {
                name: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                subject: parts[2].to_string(),
                author: parts[3].to_string(),
                date: parts[4].to_string(),
            })
        })
        .collect()
}

/// Get raw diff for a specific commit by hash
pub fn get_commit_diff(dir: &Path, hash: &str) -> Result<String, String> {
    let diff_output = Command::new("git")
        .arg("show")
        .arg(hash)
        .arg("--format=")
        .arg("--no-color")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to execute git show: {}", e))?;

    if !diff_output.status.success() {
        return Err(String::from_utf8_lossy(&diff_output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&diff_output.stdout).to_string())
}

/// Get raw diff comparing base branch and selected branch
pub fn get_branch_diff(dir: &Path, branch: &str) -> Result<String, String> {
    // Prefer main if present, otherwise compare against current branch
    let has_main = Command::new("git")
        .arg("show-ref")
        .arg("--verify")
        .arg("--quiet")
        .arg("refs/heads/main")
        .current_dir(dir)
        .status()
        .map(|status| status.success())
        .unwrap_or(false);

    let base = if has_main {
        "main".to_string()
    } else {
        let output = Command::new("git")
            .arg("rev-parse")
            .arg("--abbrev-ref")
            .arg("HEAD")
            .current_dir(dir)
            .output()
            .map_err(|e| format!("Failed to resolve current branch: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        String::from_utf8_lossy(&output.stdout).trim().to_string()
    };

    let diff_output = Command::new("git")
        .arg("diff")
        .arg("--no-color")
        .arg(format!("{}...{}", base, branch))
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to execute branch diff: {}", e))?;

    if !diff_output.status.success() {
        return Err(String::from_utf8_lossy(&diff_output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&diff_output.stdout).to_string())
}

// =============================================================================
// git-gud Stack Support
// =============================================================================

/// Resolve the git directory for gg state files.
///
/// In a normal repo: `.git/gg/`
/// In a worktree: `.git/worktrees/<name>/gg/` (where `.git` is a file
/// containing `gitdir: /path/to/main/.git/worktrees/<name>`)
fn resolve_gg_dir(dir: &Path) -> Option<PathBuf> {
    use std::fs;

    let dot_git = dir.join(".git");

    if dot_git.is_dir() {
        // Normal repo: .git is a directory
        let gg_dir = dot_git.join("gg");
        if gg_dir.exists() {
            return Some(gg_dir);
        }
        return Some(gg_dir); // Return even if not exists (for has_gg_stacks check)
    }

    if dot_git.is_file() {
        // Worktree: .git is a file with "gitdir: <path>"
        if let Ok(content) = fs::read_to_string(&dot_git) {
            if let Some(gitdir_str) = content.trim().strip_prefix("gitdir:") {
                let gitdir = PathBuf::from(gitdir_str.trim());
                // Resolve relative paths against the working dir
                let gitdir = if gitdir.is_relative() {
                    dir.join(&gitdir)
                } else {
                    gitdir
                };
                // Worktree git dir: e.g. /repo/.git/worktrees/<name>
                // gg state lives at /repo/.git/worktrees/<name>/gg/
                let gg_dir = gitdir.join("gg");
                return Some(gg_dir);
            }
        }
    }

    None
}

/// Check if git-gud stacks are available in the repository
pub fn has_gg_stacks(dir: &Path) -> bool {
    resolve_gg_dir(dir)
        .map(|gg_dir| gg_dir.join("config.json").exists())
        .unwrap_or(false)
}

/// Read git-gud config file
fn read_gg_config(dir: &Path) -> Result<serde_json::Value, String> {
    use std::fs;
    let gg_dir = resolve_gg_dir(dir).ok_or("Not a git repository")?;
    let config_path = gg_dir.join("config.json");
    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read gg config: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse git-gud config: {}", e))
}

/// Get the default base branch from git-gud config
fn get_default_base(config: &serde_json::Value) -> String {
    config
        .get("defaults")
        .and_then(|d| d.get("base"))
        .and_then(|b| b.as_str())
        .unwrap_or("main")
        .to_string()
}

/// Get the current stack name from .git/gg/current_stack
fn get_current_stack(dir: &Path) -> Option<String> {
    use std::fs;
    let gg_dir = resolve_gg_dir(dir)?;
    let current_stack_path = gg_dir.join("current_stack");
    fs::read_to_string(current_stack_path)
        .ok()
        .map(|s| s.trim().to_string())
}

/// Extract GG-ID from commit message body
fn extract_gg_id(commit_body: &str) -> Option<String> {
    for line in commit_body.lines() {
        let trimmed = line.trim();
        if let Some(gg_id) = trimmed.strip_prefix("GG-ID:") {
            return Some(gg_id.trim().to_string());
        }
    }
    None
}

/// Get git config value
fn get_git_config(dir: &Path, key: &str) -> Option<String> {
    let output = Command::new("git")
        .arg("config")
        .arg(key)
        .current_dir(dir)
        .output()
        .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}

/// Parse username from branch name (e.g., "user/stack" -> "user")
fn extract_username_from_branch(branch: &str) -> Option<String> {
    branch.split('/').next().map(|s| s.to_string())
}

/// Check if a branch name is a stack branch (user/name without --)
fn is_stack_branch(branch: &str) -> bool {
    let parts: Vec<&str> = branch.split('/').collect();
    if parts.len() != 2 {
        return false;
    }
    !parts[1].contains("--")
}

/// Extract stack name from branch name (e.g., "user/stack" -> "stack")
fn extract_stack_name(branch: &str) -> Option<String> {
    let parts: Vec<&str> = branch.split('/').collect();
    if parts.len() == 2 && !parts[1].contains("--") {
        Some(parts[1].to_string())
    } else {
        None
    }
}

/// List all git-gud stacks in the repository
pub fn list_gg_stacks(dir: &Path) -> Result<Vec<GgStackInfo>, String> {
    let config = read_gg_config(dir)?;
    let default_base = get_default_base(&config);
    let current_stack_branch = get_current_stack(dir);

    // Get all local branches
    let branches_output = Command::new("git")
        .arg("for-each-ref")
        .arg("--format=%(refname:short)")
        .arg("refs/heads/")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to list branches: {}", e))?;

    if !branches_output.status.success() {
        return Err(String::from_utf8_lossy(&branches_output.stderr).to_string());
    }

    let branches_str = String::from_utf8_lossy(&branches_output.stdout);
    let mut stacks = Vec::new();
    let mut seen_stacks = std::collections::HashSet::new();

    // First, get username from git config as fallback
    let default_username =
        get_git_config(dir, "user.name").unwrap_or_else(|| "unknown".to_string());

    // Find all stack branches
    for branch in branches_str.lines() {
        if !is_stack_branch(branch) {
            continue;
        }

        let Some(stack_name) = extract_stack_name(branch) else {
            continue;
        };

        if seen_stacks.contains(&stack_name) {
            continue;
        }
        seen_stacks.insert(stack_name.clone());

        let username =
            extract_username_from_branch(branch).unwrap_or_else(|| default_username.clone());

        // Get base for this stack
        let base = config
            .get("stacks")
            .and_then(|s| s.get(&stack_name))
            .and_then(|s| s.get("base"))
            .and_then(|b| b.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| default_base.clone());

        // Count commits in stack
        let count_output = Command::new("git")
            .arg("rev-list")
            .arg("--count")
            .arg(format!("{}..{}", base, branch))
            .current_dir(dir)
            .output()
            .map_err(|e| format!("Failed to count commits: {}", e))?;

        let commit_count = if count_output.status.success() {
            String::from_utf8_lossy(&count_output.stdout)
                .trim()
                .parse::<usize>()
                .unwrap_or(0)
        } else {
            0
        };

        let is_current = current_stack_branch
            .as_ref()
            .map(|cs| cs == branch)
            .unwrap_or(false);

        stacks.push(GgStackInfo {
            name: stack_name,
            base,
            commit_count,
            is_current,
            username,
        });
    }

    // Sort by name
    stacks.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(stacks)
}

/// Get entries (commits) for a specific git-gud stack
pub fn get_gg_stack_entries(dir: &Path, stack_name: &str) -> Result<Vec<GgStackEntry>, String> {
    let config = read_gg_config(dir)?;
    let default_base = get_default_base(&config);

    // Get base for this stack
    let base = config
        .get("stacks")
        .and_then(|s| s.get(stack_name))
        .and_then(|s| s.get("base"))
        .and_then(|b| b.as_str())
        .map(|s| s.to_string())
        .unwrap_or(default_base);

    // Find the stack branch
    let branches_output = Command::new("git")
        .arg("for-each-ref")
        .arg("--format=%(refname:short)")
        .arg("refs/heads/")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to list branches: {}", e))?;

    let branches_str = String::from_utf8_lossy(&branches_output.stdout);
    let stack_branch = branches_str
        .lines()
        .find(|b| is_stack_branch(b) && extract_stack_name(b).as_deref() == Some(stack_name))
        .ok_or_else(|| format!("Stack branch not found for: {}", stack_name))?;

    // Get commits in the stack (from base to HEAD, in order)
    let log_output = Command::new("git")
        .arg("log")
        .arg("--reverse")
        .arg("--format=%H|%h|%s|%b")
        .arg(format!("{}..{}", base, stack_branch))
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to get stack commits: {}", e))?;

    if !log_output.status.success() {
        return Err(String::from_utf8_lossy(&log_output.stderr).to_string());
    }

    let log_str = String::from_utf8_lossy(&log_output.stdout);
    let mut entries = Vec::new();

    // Parse commits
    let commits_raw = log_str.split("\n\n");
    for (position, commit_block) in commits_raw.enumerate() {
        if commit_block.trim().is_empty() {
            continue;
        }

        let lines: Vec<&str> = commit_block.lines().collect();
        if lines.is_empty() {
            continue;
        }

        let header_parts: Vec<&str> = lines[0].split('|').collect();
        if header_parts.len() < 3 {
            continue;
        }

        let hash = header_parts[0].to_string();
        let short_hash = header_parts[1].to_string();
        let title = header_parts[2].to_string();

        // Extract body (everything after the header line)
        let body = lines[1..].join("\n");
        let gg_id = extract_gg_id(&body);

        // Get MR number from config
        let mr_number = if let Some(ref id) = gg_id {
            config
                .get("stacks")
                .and_then(|s| s.get(stack_name))
                .and_then(|s| s.get("mrs"))
                .and_then(|mrs| mrs.get(id))
                .and_then(|n| n.as_u64())
        } else {
            None
        };

        entries.push(GgStackEntry {
            hash,
            short_hash,
            title,
            gg_id,
            mr_number,
            position,
        });
    }

    Ok(entries)
}

/// Get diff for entire git-gud stack (base..stack-head)
pub fn get_gg_stack_diff(dir: &Path, stack_name: &str) -> Result<String, String> {
    let config = read_gg_config(dir)?;
    let default_base = get_default_base(&config);

    // Get base for this stack
    let base = config
        .get("stacks")
        .and_then(|s| s.get(stack_name))
        .and_then(|s| s.get("base"))
        .and_then(|b| b.as_str())
        .map(|s| s.to_string())
        .unwrap_or(default_base);

    // Find the stack branch
    let branches_output = Command::new("git")
        .arg("for-each-ref")
        .arg("--format=%(refname:short)")
        .arg("refs/heads/")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to list branches: {}", e))?;

    let branches_str = String::from_utf8_lossy(&branches_output.stdout);
    let stack_branch = branches_str
        .lines()
        .find(|b| is_stack_branch(b) && extract_stack_name(b).as_deref() == Some(stack_name))
        .ok_or_else(|| format!("Stack branch not found for: {}", stack_name))?;

    // Get diff
    let diff_output = Command::new("git")
        .arg("diff")
        .arg("--no-color")
        .arg(format!("{}..{}", base, stack_branch))
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to get stack diff: {}", e))?;

    if !diff_output.status.success() {
        return Err(String::from_utf8_lossy(&diff_output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&diff_output.stdout).to_string())
}

/// Get diff for a single commit in a git-gud stack
pub fn get_gg_entry_diff(dir: &Path, _stack_name: &str, hash: &str) -> Result<String, String> {
    // Use git show to get the diff for a single commit
    let diff_output = Command::new("git")
        .arg("show")
        .arg(hash)
        .arg("--format=")
        .arg("--no-color")
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to get entry diff: {}", e))?;

    if !diff_output.status.success() {
        return Err(String::from_utf8_lossy(&diff_output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&diff_output.stdout).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_porcelain_status_modified() {
        let output = " M src/main.rs\n";
        let files = parse_porcelain_status(output, false);

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/main.rs");
        assert_eq!(files[0].status, "modified");
    }

    #[test]
    fn test_parse_porcelain_status_added() {
        let output = "A  src/new.rs\n";
        let files = parse_porcelain_status(output, false);

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/new.rs");
        assert_eq!(files[0].status, "added");
    }

    #[test]
    fn test_parse_porcelain_status_deleted() {
        let output = " D src/old.rs\n";
        let files = parse_porcelain_status(output, false);

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/old.rs");
        assert_eq!(files[0].status, "deleted");
    }

    #[test]
    fn test_parse_porcelain_status_multiple() {
        let output = " M src/main.rs\nA  src/new.rs\n D src/old.rs\n";
        let files = parse_porcelain_status(output, false);

        assert_eq!(files.len(), 3);
        assert_eq!(files[0].status, "modified");
        assert_eq!(files[1].status, "added");
        assert_eq!(files[2].status, "deleted");
    }

    #[test]
    fn test_parse_porcelain_status_empty() {
        let output = "";
        let files = parse_porcelain_status(output, false);

        assert_eq!(files.len(), 0);
    }

    #[test]
    fn test_parse_porcelain_status_modified_both() {
        let output = "MM src/file.rs\n";
        let files = parse_porcelain_status(output, false);

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].status, "modified");
    }

    #[test]
    fn test_parse_porcelain_status_staged_only() {
        let output = "M  src/staged.rs\n M src/unstaged.rs\n";
        let files = parse_porcelain_status(output, true);

        // Only the staged file (M with space after) should be returned
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/staged.rs");
        assert_eq!(files[0].status, "modified");
    }

    #[test]
    fn test_parse_porcelain_status_unstaged_all() {
        let output = "M  src/staged.rs\n M src/unstaged.rs\n";
        let files = parse_porcelain_status(output, false);

        // Both files should be returned for unstaged
        assert_eq!(files.len(), 2);
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

    #[test]
    fn test_parse_commit_log_single() {
        let output =
            "abc123def456|abc123d|Initial commit|John Doe|2 days ago|HEAD -> main, origin/main\n";
        let commits = parse_commit_log(output);

        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].hash, "abc123def456");
        assert_eq!(commits[0].short_hash, "abc123d");
        assert_eq!(commits[0].message, "Initial commit");
        assert_eq!(commits[0].author, "John Doe");
        assert_eq!(commits[0].date, "2 days ago");
        assert_eq!(commits[0].refs, "HEAD -> main, origin/main");
    }

    #[test]
    fn test_parse_commit_log_multiple() {
        let output = "abc123|abc1|First commit|Alice|1 day ago|HEAD -> main\ndef456|def4|Second commit|Bob|2 days ago|\n";
        let commits = parse_commit_log(output);

        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].hash, "abc123");
        assert_eq!(commits[0].short_hash, "abc1");
        assert_eq!(commits[0].message, "First commit");
        assert_eq!(commits[0].author, "Alice");
        assert_eq!(commits[1].hash, "def456");
        assert_eq!(commits[1].author, "Bob");
    }

    #[test]
    fn test_parse_commit_log_no_refs() {
        let output = "abc123|abc1|Commit without refs|Alice|1 day ago|\n";
        let commits = parse_commit_log(output);

        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].refs, "");
    }

    #[test]
    fn test_parse_commit_log_empty() {
        let output = "";
        let commits = parse_commit_log(output);

        assert_eq!(commits.len(), 0);
    }

    #[test]
    fn test_parse_commit_log_invalid_line() {
        let output = "invalid|line\n";
        let commits = parse_commit_log(output);

        assert_eq!(commits.len(), 0);
    }

    #[test]
    fn test_parse_commit_log_message_with_pipe() {
        let output = "abc123|abc1|Fix: update config | add tests|Alice|1 day ago|main\n";
        let commits = parse_commit_log(output);

        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].message, "Fix: update config | add tests");
        assert_eq!(commits[0].author, "Alice");
        assert_eq!(commits[0].date, "1 day ago");
        assert_eq!(commits[0].refs, "main");
    }

    #[test]
    fn test_parse_branch_list_single() {
        let output = "main|abc1234|Initial commit|Alice|2 days ago\n";
        let branches = parse_branch_list(output);

        assert_eq!(branches.len(), 1);
        assert_eq!(branches[0].name, "main");
        assert_eq!(branches[0].short_hash, "abc1234");
        assert_eq!(branches[0].subject, "Initial commit");
        assert_eq!(branches[0].author, "Alice");
        assert_eq!(branches[0].date, "2 days ago");
    }

    #[test]
    fn test_parse_branch_list_multiple() {
        let output = "main|abc1234|Main work|Alice|1 day ago\norigin/main|def5678|Remote main|Bob|3 days ago\n";
        let branches = parse_branch_list(output);

        assert_eq!(branches.len(), 2);
        assert_eq!(branches[0].name, "main");
        assert_eq!(branches[1].name, "origin/main");
    }

    #[test]
    fn test_parse_branch_list_empty() {
        let branches = parse_branch_list("");
        assert_eq!(branches.len(), 0);
    }

    #[test]
    fn test_parse_branch_list_invalid_line() {
        let branches = parse_branch_list("main|abc123\n");
        assert_eq!(branches.len(), 0);
    }
}
