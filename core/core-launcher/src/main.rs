use core_launcher::{parse_args, ParsedArgs};
use std::path::PathBuf;
use std::process::{Command, ExitCode};

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

fn run() -> ExitCode {
    let raw_args: Vec<String> = std::env::args().collect();
    let cwd = std::env::current_dir()
        .ok()
        .and_then(|p| p.canonicalize().ok())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());
    let parsed: ParsedArgs = parse_args(&raw_args, &cwd);

    // Canonicalize whatever the user gave us as a working dir.
    let working_dir = match std::fs::canonicalize(&parsed.working_dir) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => parsed.working_dir.clone(),
    };

    let Some(app_path) = locate_app() else {
        eprintln!("Error: AI Review.app not found in /Applications or ~/Applications.");
        eprintln!("Build the app first with: pnpm electron:build");
        return ExitCode::from(1);
    };

    // For --wait/--json, set up a temp file the app can write feedback to.
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

    let mut app_args: Vec<String> = vec![working_dir];
    app_args.extend(parsed.diff_args.iter().cloned());
    if parsed.json_output {
        app_args.push("--json-output".into());
    }
    if parsed.wait_mode {
        app_args.push("--wait-mode".into());
        if let Some(p) = &feedback_path {
            app_args.push("--feedback-pipe".into());
            app_args.push(p.to_string_lossy().to_string());
        }
    }

    if parsed.wait_mode {
        let status = Command::new("open")
            .arg("-W")
            .arg("-a")
            .arg(&app_path)
            .arg("--args")
            .args(&app_args)
            .status();

        match status {
            Ok(s) if s.success() => {
                if let Some(p) = &feedback_path {
                    if let Ok(contents) = std::fs::read_to_string(p) {
                        print!("{}", contents);
                        let _ = std::fs::remove_file(p);
                        return ExitCode::from(0);
                    }
                }
                ExitCode::from(1)
            }
            Ok(_) => ExitCode::from(1),
            Err(e) => {
                eprintln!("Error launching app: {}", e);
                ExitCode::from(1)
            }
        }
    } else {
        let _ = Command::new("open")
            .arg("-a")
            .arg(&app_path)
            .arg("--args")
            .args(&app_args)
            .spawn();
        ExitCode::from(0)
    }
}

fn main() -> ExitCode {
    run()
}
