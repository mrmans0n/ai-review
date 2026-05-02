use core_launcher::{parse_args, ParsedArgs};

#[test]
fn parses_wait_and_json_flags() {
    let args = vec!["air".into(), "--wait".into(), "--json".into()];
    let parsed = parse_args(&args, "/home/me");
    assert!(parsed.wait_mode);
    assert!(parsed.json_output);
    assert_eq!(parsed.working_dir, "/home/me");
}

#[test]
fn parses_commit_flag_into_diff_args() {
    let args = vec!["air".into(), "--commit".into(), "HEAD~3".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.diff_args, vec!["--diff-commit".to_string(), "HEAD~3".to_string()]);
}

#[test]
fn parses_branch_flag() {
    let args = vec!["air".into(), "--branch".into(), "main".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.diff_args, vec!["--diff-branch".to_string(), "main".to_string()]);
}

#[test]
fn parses_commits_range() {
    let args = vec!["air".into(), "--commits".into(), "abc..def".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.diff_args, vec!["--diff-range".to_string(), "abc..def".to_string()]);
}

#[test]
fn positional_arg_overrides_default_dir() {
    let args = vec!["air".into(), "/repos/foo".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.working_dir, "/repos/foo");
}

#[test]
fn defaults_to_provided_cwd_when_no_positional() {
    let args = vec!["air".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.working_dir, "/home/me");
}

#[allow(dead_code)]
fn _ensure_default_constructible() -> ParsedArgs {
    ParsedArgs::default()
}
