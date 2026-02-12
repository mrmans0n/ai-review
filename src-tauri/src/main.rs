// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // When launched via the "air" CLI symlink, re-spawn as a detached background
    // process and exit immediately so the terminal gets control back.
    // The --foreground flag prevents infinite re-spawn loops.
    #[cfg(target_family = "unix")]
    {
        let args: Vec<String> = std::env::args().collect();
        let exe_name = args
            .first()
            .and_then(|a| std::path::Path::new(a).file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("");

        if exe_name == "air" && !args.contains(&"--foreground".to_string()) {
            use std::os::unix::process::CommandExt;
            use std::process::{Command, Stdio};

            // Resolve the real executable path (follows symlink)
            let exe = std::env::current_exe()
                .and_then(|p| p.canonicalize())
                .expect("Failed to resolve executable path");

            // Forward original args + --foreground sentinel
            let mut child_args: Vec<String> = args[1..].to_vec();
            child_args.push("--foreground".to_string());

            let _child = Command::new(&exe)
                .args(&child_args)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .process_group(0) // Detach from terminal process group
                .spawn()
                .expect("Failed to launch ai-review in background");

            std::process::exit(0);
        }
    }

    ai_review_lib::run()
}
