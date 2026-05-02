use core_lib::{config, files, git};
use serde::Deserialize;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use std::path::PathBuf;

#[derive(Deserialize)]
struct Request {
    jsonrpc: String,
    id: Value,
    method: String,
    #[serde(default)]
    params: Value,
}

fn err(id: Value, code: i32, message: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": { "code": code, "message": message },
    })
}

fn ok(id: Value, result: Value) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "result": result,
    })
}

fn param_str(params: &Value, key: &str) -> Result<String, String> {
    params
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("missing or non-string param: {}", key))
}

fn param_u32(params: &Value, key: &str) -> Result<u32, String> {
    params
        .get(key)
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .ok_or_else(|| format!("missing or non-numeric param: {}", key))
}

fn dispatch(method: &str, params: &Value) -> Result<Value, String> {
    match method {
        "is_git_repo" => {
            let path = PathBuf::from(param_str(params, "path")?);
            Ok(json!(git::is_git_repo(&path)))
        }
        "get_unstaged_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::get_unstaged_diff(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_staged_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::get_staged_diff(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_git_change_status" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::get_git_change_status(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_commit_ref_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let commit = param_str(params, "commit")?;
            let r = if commit == "HEAD" {
                git::get_head_diff(&path, 0)
            } else if let Some(num_str) = commit.strip_prefix("HEAD~") {
                let n = num_str.parse::<u32>().unwrap_or(1);
                git::get_head_diff(&path, n)
            } else {
                git::get_commit_diff(&path, &commit)
            };
            r.map(|v| serde_json::to_value(v).unwrap())
        }
        "get_range_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let range = param_str(params, "range")?;
            git::get_range_diff(&path, &range).map(|v| serde_json::to_value(v).unwrap())
        }
        "list_files" => {
            let path = PathBuf::from(param_str(params, "path")?);
            files::list_files(&path, 10).map(|v| serde_json::to_value(v).unwrap())
        }
        "read_file_content" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let file_path = param_str(params, "filePath")?;
            let full = path.join(file_path);
            files::read_file(&full.to_string_lossy()).map(|v| json!(v))
        }
        "read_file_content_base64" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let file_path = param_str(params, "filePath")?;
            let full = path.join(file_path);
            files::read_file_base64(&full.to_string_lossy()).map(|v| json!(v))
        }
        "get_file_at_ref" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            let file_path = param_str(params, "filePath")?;
            git::get_file_at_ref(&path, &git_ref, &file_path).map(|v| json!(v))
        }
        "get_file_at_ref_base64" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            let file_path = param_str(params, "filePath")?;
            git::get_file_at_ref_base64(&path, &git_ref, &file_path).map(|v| json!(v))
        }
        "get_lfs_file_at_ref" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            let file_path = param_str(params, "filePath")?;
            git::get_lfs_file_at_ref(&path, &git_ref, &file_path).map(|v| json!(v))
        }
        "get_lfs_file_at_ref_base64" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            let file_path = param_str(params, "filePath")?;
            git::get_lfs_file_at_ref_base64(&path, &git_ref, &file_path).map(|v| json!(v))
        }
        "list_commits" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let limit = param_u32(params, "limit")?;
            git::list_commits(&path, limit).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_commit_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let hash = param_str(params, "hash")?;
            git::get_commit_diff(&path, &hash).map(|v| serde_json::to_value(v).unwrap())
        }
        "list_branches" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::list_branches(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_branch_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let branch = param_str(params, "branch")?;
            git::get_branch_diff(&path, &branch).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_branch_base" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let branch = param_str(params, "branch")?;
            git::get_branch_base(&path, &branch).map(|v| json!(v))
        }
        "list_files_at_ref" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            git::list_files_at_ref(&path, &git_ref).map(|v| serde_json::to_value(v).unwrap())
        }
        "has_gg_stacks" => {
            let path = PathBuf::from(param_str(params, "path")?);
            Ok(json!(git::has_gg_stacks(&path)))
        }
        "list_worktrees" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::list_worktrees(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "has_worktrees" => {
            let path = PathBuf::from(param_str(params, "path")?);
            Ok(json!(git::has_worktrees(&path)))
        }
        "list_gg_stacks" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::list_gg_stacks(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_gg_stack_entries" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let stack_name = param_str(params, "stackName")?;
            git::get_gg_stack_entries(&path, &stack_name).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_merge_base_refs" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let ref1 = param_str(params, "ref1")?;
            let ref2 = param_str(params, "ref2")?;
            git::get_merge_base_refs(&path, &ref1, &ref2).map(|v| json!(v))
        }
        "get_gg_stack_base" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let stack_name = param_str(params, "stackName")?;
            git::get_gg_stack_base(&path, &stack_name).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_gg_stack_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let stack_name = param_str(params, "stackName")?;
            git::get_gg_stack_diff(&path, &stack_name).map(|v| json!(v))
        }
        "get_gg_entry_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let stack_name = param_str(params, "stackName")?;
            let hash = param_str(params, "hash")?;
            git::get_gg_entry_diff(&path, &stack_name, &hash).map(|v| json!(v))
        }
        "list_repos" => {
            let repos = config::list_repos()?;
            let mut result: Vec<serde_json::Value> = repos
                .into_iter()
                .map(|(name, path)| {
                    let ts = git::last_commit_timestamp(&PathBuf::from(&path));
                    json!({ "name": name, "path": path, "last_activity": ts })
                })
                .collect();
            result.sort_by(|a, b| {
                b["last_activity"]
                    .as_i64()
                    .unwrap_or(0)
                    .cmp(&a["last_activity"].as_i64().unwrap_or(0))
            });
            Ok(json!(result))
        }
        "add_repo" => {
            let path = param_str(params, "path")?;
            let dir = PathBuf::from(&path);
            if !git::is_git_repo(&dir) {
                return Err("Not a git repository".to_string());
            }
            config::add_repo(&path)?;
            let name = dir
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| path.clone());
            Ok(json!({
                "name": name,
                "path": path,
                "last_activity": git::last_commit_timestamp(&dir),
            }))
        }
        "remove_repo" => {
            let path = param_str(params, "path")?;
            config::remove_repo(&path)?;
            Ok(Value::Null)
        }
        "switch_repo" => {
            let path = param_str(params, "path")?;
            let dir = PathBuf::from(&path);
            if !git::is_git_repo(&dir) {
                return Err("Not a git repository".to_string());
            }
            git::get_unstaged_diff(&dir).map(|v| serde_json::to_value(v).unwrap())
        }
        _ => Err(format!("__UNKNOWN_METHOD__:{}", method)),
    }
}

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = stdout.lock();

    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }

        let parsed: Result<Request, _> = serde_json::from_str(&line);
        let response = match parsed {
            Err(e) => err(Value::Null, -32700, &format!("parse error: {}", e)),
            Ok(req) if req.jsonrpc != "2.0" => err(req.id, -32600, "jsonrpc version must be 2.0"),
            Ok(req) => match dispatch(&req.method, &req.params) {
                Ok(result) => ok(req.id, result),
                Err(e) if e.starts_with("__UNKNOWN_METHOD__:") => {
                    err(req.id, -32601, &format!("method not found: {}", &e[19..]))
                }
                Err(message) => err(req.id, -32000, &message),
            },
        };

        let line = serde_json::to_string(&response).unwrap_or_else(|_| {
            r#"{"jsonrpc":"2.0","id":null,"error":{"code":-32603,"message":"internal"}}"#
                .to_string()
        });
        if writeln!(out, "{}", line).is_err() {
            break;
        }
        let _ = out.flush();
    }
}
