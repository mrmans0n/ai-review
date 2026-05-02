import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { app } from "electron";
import * as path from "node:path";
import * as readline from "node:readline";

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

// Backoff/thrash-guard tuning. If we see RESTART_LIMIT restarts within
// RESTART_WINDOW_MS, we give up and stop respawning to avoid burning CPU on a
// tight crash loop. The user will see RPC failures, which is preferable.
const RESTART_BACKOFF_MS = 500;
const RESTART_LIMIT = 3;
const RESTART_WINDOW_MS = 10_000;

export class Sidecar {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingCall>();
  private intentionalShutdown = false;
  private restartTimer: NodeJS.Timeout | null = null;
  private restartCount = 0;
  private firstRestartAt = 0;
  private respawnDisabled = false;

  start(): void {
    this.intentionalShutdown = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

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

      if (this.intentionalShutdown || this.respawnDisabled) {
        return;
      }

      const now = Date.now();
      if (this.restartCount === 0 || now - this.firstRestartAt > RESTART_WINDOW_MS) {
        this.firstRestartAt = now;
        this.restartCount = 1;
      } else {
        this.restartCount += 1;
      }

      if (this.restartCount > RESTART_LIMIT) {
        console.error(
          `[sidecar] crashed ${this.restartCount} times within ${RESTART_WINDOW_MS}ms; ` +
            `disabling respawn to avoid a tight loop`,
        );
        this.respawnDisabled = true;
        return;
      }

      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        if (!this.intentionalShutdown && !this.respawnDisabled) {
          this.start();
        }
      }, RESTART_BACKOFF_MS);
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
    this.intentionalShutdown = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
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
    // A successful response is evidence the sidecar is healthy; reset the
    // thrash counter so a future crash gets a fresh budget.
    this.restartCount = 0;
    this.firstRestartAt = 0;
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
