// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // When launched via the "air" CLI symlink, re-invoke the binary via its
    // canonical path so macOS applies the .app bundle's activation policy and
    // the Tauri window actually appears. With argv[0] == "air", LaunchServices
    // can't walk up to Info.plist and treats the process as a background tool
    // — the window stays hidden no matter what Tauri does.
    //
    // Non-wait mode: spawn detached and exit so the terminal prompt returns.
    // Wait mode: exec() in place so stdio is inherited and the caller can read
    // JSON feedback from stdout / detect exit.
    // The --foreground flag prevents infinite re-invocation loops.
    #[cfg(target_family = "unix")]
    {
        let args: Vec<String> = std::env::args().collect();
        let exe_name = args
            .first()
            .and_then(|a| std::path::Path::new(a).file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("");

        let is_wait =
            args.contains(&"--wait".to_string()) || args.contains(&"--wait-mode".to_string());

        if exe_name == "air" && !args.contains(&"--foreground".to_string()) {
            use std::os::unix::process::CommandExt;
            use std::process::Command;

            // Resolve the real executable path (follows symlink)
            let exe = std::env::current_exe()
                .and_then(|p| p.canonicalize())
                .expect("Failed to resolve executable path");

            // Forward original args + --foreground sentinel
            let mut child_args: Vec<String> = args[1..].to_vec();
            child_args.push("--foreground".to_string());

            let mut cmd = Command::new(&exe);
            cmd.args(&child_args);

            if is_wait {
                // Replace this process so stdio stays connected to the caller.
                let err = cmd.exec();
                panic!("Failed to exec ai-review: {}", err);
            } else {
                use std::process::Stdio;
                let _child = cmd
                    .stdin(Stdio::null())
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .process_group(0) // Detach from terminal process group
                    .spawn()
                    .expect("Failed to launch ai-review in background");
                std::process::exit(0);
            }
        }
    }

    ai_review_lib::run()
}
