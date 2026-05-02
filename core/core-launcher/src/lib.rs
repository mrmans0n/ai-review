#[derive(Debug, Default, PartialEq, Eq)]
pub struct ParsedArgs {
    pub wait_mode: bool,
    pub json_output: bool,
    pub working_dir: String,
    pub diff_args: Vec<String>,
}

pub fn parse_args(args: &[String], default_dir: &str) -> ParsedArgs {
    let mut out = ParsedArgs {
        working_dir: default_dir.to_string(),
        ..Default::default()
    };

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--wait" => {
                out.wait_mode = true;
                i += 1;
            }
            "--json" => {
                out.json_output = true;
                i += 1;
            }
            "--commit" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-commit".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --commit requires a value");
                    std::process::exit(1);
                }
            }
            "--commits" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-range".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --commits requires a value");
                    std::process::exit(1);
                }
            }
            "--branch" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-branch".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --branch requires a value");
                    std::process::exit(1);
                }
            }
            arg if !arg.starts_with("--") => {
                out.working_dir = arg.to_string();
                i += 1;
            }
            other => {
                eprintln!("Error: unknown option '{}'", other);
                std::process::exit(1);
            }
        }
    }

    out
}
