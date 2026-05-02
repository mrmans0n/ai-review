use core_launcher::{parse_args, ParsedArgs};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

#[cfg(target_os = "macos")]
fn locate_app() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("/Applications/AI Review.app"),
        std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join("Applications").join("AI Review.app"))
            .unwrap_or_default(),
    ];
    candidates.into_iter().find(|p| p.exists())
}

#[cfg(target_os = "linux")]
fn locate_app() -> Option<PathBuf> {
    // 1. Check $PATH via `which`
    if let Ok(out) = Command::new("which").arg("ai-review").output() {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !s.is_empty() {
                return Some(PathBuf::from(s));
            }
        }
    }

    // 2. Common install paths
    let mut candidates: Vec<PathBuf> = vec![
        PathBuf::from("/usr/bin/ai-review"),
        PathBuf::from("/usr/local/bin/ai-review"),
        PathBuf::from("/opt/AI Review/ai-review"),
    ];
    if let Ok(home) = std::env::var("HOME") {
        candidates.push(
            PathBuf::from(&home)
                .join(".local")
                .join("bin")
                .join("ai-review"),
        );
        candidates.push(PathBuf::from(&home).join("Applications").join("ai-review"));
    }

    // 3. Dev fallback: relative to the launcher binary itself
    if let Ok(self_exe) = std::env::current_exe() {
        if let Some(workspace) = self_exe.ancestors().find(|p| p.join("release").exists()) {
            candidates.push(
                workspace
                    .join("release")
                    .join("linux-unpacked")
                    .join("ai-review"),
            );
        }
    }

    candidates.into_iter().find(|p| p.exists())
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
fn locate_app() -> Option<PathBuf> {
    None
}

fn missing_app_message() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "Error: AI Review.app not found in /Applications or ~/Applications.\nBuild and install: pnpm electron:build:install"
    }
    #[cfg(target_os = "linux")]
    {
        "Error: ai-review binary not found in $PATH or common install dirs.\nBuild: pnpm electron:build (output at release/linux-unpacked/ai-review)"
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        "Error: this platform is not supported by the air launcher."
    }
}

fn build_app_args(
    parsed: &ParsedArgs,
    working_dir: &str,
    feedback_path: Option<&Path>,
) -> Vec<String> {
    let mut app_args: Vec<String> = vec![working_dir.to_string()];
    app_args.extend(parsed.diff_args.iter().cloned());
    if parsed.json_output {
        app_args.push("--json-output".into());
    }
    if parsed.wait_mode {
        app_args.push("--wait-mode".into());
        if let Some(p) = feedback_path {
            app_args.push("--feedback-pipe".into());
            app_args.push(p.to_string_lossy().to_string());
        }
    }
    app_args
}

#[cfg(target_os = "macos")]
fn launch(
    app_path: &Path,
    app_args: &[String],
    wait: bool,
) -> std::io::Result<std::process::ExitStatus> {
    if wait {
        Command::new("open")
            .arg("-W")
            .arg("-a")
            .arg(app_path)
            .arg("--args")
            .args(app_args)
            .status()
    } else {
        Command::new("open")
            .arg("-a")
            .arg(app_path)
            .arg("--args")
            .args(app_args)
            .spawn()
            .map(|_| std::process::ExitStatus::default())
    }
}

#[cfg(not(target_os = "macos"))]
fn launch(
    app_path: &Path,
    app_args: &[String],
    wait: bool,
) -> std::io::Result<std::process::ExitStatus> {
    let mut cmd = Command::new(app_path);
    cmd.args(app_args);
    if wait {
        cmd.status()
    } else {
        cmd.spawn().map(|_| std::process::ExitStatus::default())
    }
}

fn run() -> ExitCode {
    let raw_args: Vec<String> = std::env::args().collect();
    let cwd = std::env::current_dir()
        .ok()
        .and_then(|p| p.canonicalize().ok())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());
    let parsed: ParsedArgs = parse_args(&raw_args, &cwd);

    let working_dir = match std::fs::canonicalize(&parsed.working_dir) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => parsed.working_dir.clone(),
    };

    let Some(app_path) = locate_app() else {
        eprintln!("{}", missing_app_message());
        return ExitCode::from(1);
    };

    let feedback_path = if parsed.wait_mode {
        let pid = std::process::id();
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        Some(std::env::temp_dir().join(format!("ai-review-feedback-{}-{}.txt", pid, ts)))
    } else {
        None
    };

    let app_args = build_app_args(&parsed, &working_dir, feedback_path.as_deref());

    if parsed.wait_mode {
        match launch(&app_path, &app_args, true) {
            Ok(status) if status.success() => {
                if let Some(p) = &feedback_path {
                    if let Ok(contents) = std::fs::read_to_string(p) {
                        print!("{}", contents);
                        let _ = std::fs::remove_file(p);
                        return ExitCode::from(0);
                    }
                }
                eprintln!("no feedback submitted");
                ExitCode::from(1)
            }
            Ok(_) => ExitCode::from(1),
            Err(e) => {
                eprintln!("Error launching app: {}", e);
                ExitCode::from(1)
            }
        }
    } else {
        match launch(&app_path, &app_args, false) {
            Ok(_) => ExitCode::from(0),
            Err(e) => {
                eprintln!("Error launching app: {}", e);
                ExitCode::from(1)
            }
        }
    }
}

fn main() -> ExitCode {
    run()
}
