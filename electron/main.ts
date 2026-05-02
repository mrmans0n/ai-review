import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { Sidecar } from "./sidecar";
import { buildMenu } from "./menu";
import { parseLaunchArgs, type LaunchArgs } from "./argv";

let mainWindow: BrowserWindow | null = null;
const sidecar = new Sidecar();
let launchArgs: LaunchArgs;

const SIDECAR_METHODS = new Set<string>([
  "is_git_repo",
  "get_unstaged_diff",
  "get_staged_diff",
  "get_git_change_status",
  "get_commit_ref_diff",
  "get_range_diff",
  "list_files",
  "read_file_content",
  "read_file_content_base64",
  "get_file_at_ref",
  "get_file_at_ref_base64",
  "get_lfs_file_at_ref",
  "get_lfs_file_at_ref_base64",
  "list_commits",
  "get_commit_diff",
  "list_branches",
  "get_branch_diff",
  "get_branch_base",
  "list_files_at_ref",
  "has_gg_stacks",
  "list_worktrees",
  "has_worktrees",
  "list_gg_stacks",
  "get_gg_stack_entries",
  "get_merge_base_refs",
  "get_gg_stack_base",
  "get_gg_stack_diff",
  "get_gg_entry_diff",
  "list_repos",
  "add_repo",
  "remove_repo",
  "switch_repo",
]);

function parseInitialArgs(): LaunchArgs {
  const argv = process.argv.slice(app.isPackaged ? 1 : 2);
  const cwd = process.cwd();
  return parseLaunchArgs(argv, cwd);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#282c34",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 20 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.on("focus", () => {
    mainWindow?.webContents.send("app:focus");
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  } else {
    void mainWindow.loadURL("http://localhost:1420");
  }
}

function registerIpc(): void {
  ipcMain.handle("bridge:invoke", async (_e, method: string, params: Record<string, unknown> = {}) => {
    switch (method) {
      case "get_working_directory":
        return launchArgs.workingDir;
      case "is_wait_mode":
        return launchArgs.waitMode;
      case "is_json_output":
        return launchArgs.jsonOutput;
      case "get_initial_diff_mode":
        return launchArgs.initialDiffMode;
      case "submit_feedback": {
        const feedback = String((params as { feedback?: string }).feedback ?? "");
        if (launchArgs.feedbackPipe) {
          await fs.promises.writeFile(launchArgs.feedbackPipe, feedback, "utf8");
        } else {
          process.stdout.write(feedback);
        }
        app.quit();
        return null;
      }
      case "check_cli_installed":
        return await checkCliInstalled();
      case "install_cli":
        return await installCli();
      default:
        if (SIDECAR_METHODS.has(method)) {
          return sidecar.invoke(method, params);
        }
        throw new Error(`unknown method: ${method}`);
    }
  });

  ipcMain.handle("window:setTitle", (_e, title: string) => {
    mainWindow?.setTitle(title);
  });

  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

async function checkCliInstalled(): Promise<boolean> {
  if (process.platform === "win32") return false;
  const home = os.homedir();
  const cliPath = path.join(home, ".local", "bin", "air");
  try {
    const stats = await fs.promises.lstat(cliPath);
    if (!stats.isSymbolicLink()) return false;
    const target = await fs.promises.readlink(cliPath);
    const expected = launcherBinaryPath();
    const targetReal = path.resolve(path.dirname(cliPath), target);
    return path.resolve(targetReal) === path.resolve(expected);
  } catch {
    return false;
  }
}

interface InstallCliResult {
  success: boolean;
  message: string;
  path_warning: boolean;
}

async function installCli(): Promise<InstallCliResult> {
  if (process.platform === "win32") {
    return {
      success: false,
      message: "CLI installation is only supported on macOS and Linux",
      path_warning: false,
    };
  }
  try {
    const home = os.homedir();
    const localBin = path.join(home, ".local", "bin");
    const cliPath = path.join(localBin, "air");
    const launcher = launcherBinaryPath();

    await fs.promises.mkdir(localBin, { recursive: true });
    try {
      await fs.promises.unlink(cliPath);
    } catch {
      // not present, fine
    }
    await fs.promises.symlink(launcher, cliPath);

    const pathEnv = process.env.PATH ?? "";
    const inPath = pathEnv.split(path.delimiter).includes(localBin);
    const message = inPath
      ? "CLI installed successfully! You can now use 'air' from your terminal."
      : `CLI installed to ${localBin}. Add this directory to your PATH to use 'air' from anywhere.`;

    return { success: true, message, path_warning: !inPath };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
      path_warning: false,
    };
  }
}

function launcherBinaryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", "core-launcher");
  }
  return path.join(__dirname, "..", "core", "target", "debug", "core-launcher");
}

app.whenReady().then(() => {
  launchArgs = parseInitialArgs();
  sidecar.start();
  registerIpc();
  Menu.setApplicationMenu(buildMenu(() => mainWindow));
  createWindow();
});

app.on("window-all-closed", () => {
  sidecar.shutdown();
  app.quit();
});

app.on("before-quit", () => {
  sidecar.shutdown();
});

void shell;
