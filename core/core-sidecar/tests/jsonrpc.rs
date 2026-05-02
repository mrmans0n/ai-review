use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};

fn send(child_stdin: &mut std::process::ChildStdin, line: &str) {
    writeln!(child_stdin, "{}", line).unwrap();
    child_stdin.flush().unwrap();
}

fn recv(reader: &mut BufReader<std::process::ChildStdout>) -> serde_json::Value {
    let mut line = String::new();
    reader.read_line(&mut line).unwrap();
    serde_json::from_str(&line).unwrap()
}

fn spawn() -> (std::process::Child, BufReader<std::process::ChildStdout>) {
    let bin = env!("CARGO_BIN_EXE_core-sidecar");
    let mut child = Command::new(bin)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let stdout = child.stdout.take().unwrap();
    (child, BufReader::new(stdout))
}

#[test]
fn responds_to_is_git_repo_with_false_for_nonrepo() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":1,"method":"is_git_repo","params":{"path":"/tmp"}}"#,
    );
    let resp = recv(&mut reader);
    assert_eq!(resp["jsonrpc"], "2.0");
    assert_eq!(resp["id"], 1);
    assert!(resp["result"].is_boolean());
    drop(stdin);
    let _ = child.wait();
}

#[test]
fn returns_error_for_unknown_method() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":2,"method":"no_such_method","params":{}}"#,
    );
    let resp = recv(&mut reader);
    assert_eq!(resp["id"], 2);
    assert_eq!(resp["error"]["code"], -32601);
    drop(stdin);
    let _ = child.wait();
}

#[test]
fn returns_error_for_malformed_json() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(&mut stdin, r#"this is not json"#);
    let resp = recv(&mut reader);
    assert_eq!(resp["error"]["code"], -32700);
    drop(stdin);
    let _ = child.wait();
}

#[test]
fn surfaces_core_lib_errors_in_error_field() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":3,"method":"get_unstaged_diff","params":{"path":"/definitely/not/a/repo"}}"#,
    );
    let resp = recv(&mut reader);
    assert_eq!(resp["id"], 3);
    assert!(resp["error"]["message"].is_string());
    drop(stdin);
    let _ = child.wait();
}

#[test]
fn handles_pipelined_requests_in_order() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":10,"method":"is_git_repo","params":{"path":"/tmp"}}"#,
    );
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":11,"method":"is_git_repo","params":{"path":"/tmp"}}"#,
    );
    let r1 = recv(&mut reader);
    let r2 = recv(&mut reader);
    assert_eq!(r1["id"], 10);
    assert_eq!(r2["id"], 11);
    drop(stdin);
    let _ = child.wait();
}
