import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { app } from "electron";
import * as path from "node:path";
import * as readline from "node:readline";

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

export class Sidecar {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingCall>();

  start(): void {
    const binPath = this.resolveBinary();
    const child = spawn(binPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => this.handleLine(line));

    child.stderr.on("data", (data) => {
      console.error(`[sidecar] ${data.toString().trimEnd()}`);
    });

    child.on("exit", (code) => {
      console.error(`[sidecar] exited with code ${code}`);
      this.failPending(new Error("sidecar exited"));
      this.child = null;
    });

    this.child = child;
  }

  invoke<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.child) {
      return Promise.reject(new Error("sidecar not running"));
    }
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this.child!.stdin.write(payload + "\n");
    });
  }

  shutdown(): void {
    if (this.child) {
      this.child.stdin.end();
      this.child.kill();
      this.child = null;
    }
  }

  private resolveBinary(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "bin", "core-sidecar");
    }
    return path.join(__dirname, "..", "core", "target", "debug", "core-sidecar");
  }

  private handleLine(line: string): void {
    if (!line.trim()) return;
    let msg: { id?: number; result?: unknown; error?: { message: string } };
    try {
      msg = JSON.parse(line);
    } catch {
      console.error("[sidecar] failed to parse response:", line);
      return;
    }
    if (typeof msg.id !== "number") return;
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    this.pending.delete(msg.id);
    if (msg.error) {
      pending.reject(new Error(msg.error.message));
    } else {
      pending.resolve(msg.result);
    }
  }

  private failPending(err: Error): void {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}
