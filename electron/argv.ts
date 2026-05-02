export type InitialDiffMode =
  | { type: "commit"; value: string }
  | { type: "range"; value: string }
  | { type: "branch"; value: string };

export interface LaunchArgs {
  workingDir: string;
  waitMode: boolean;
  jsonOutput: boolean;
  initialDiffMode: InitialDiffMode | null;
  feedbackPipe: string | null;
}

export function parseLaunchArgs(argv: string[], defaultDir: string): LaunchArgs {
  const out: LaunchArgs = {
    workingDir: defaultDir,
    waitMode: false,
    jsonOutput: false,
    initialDiffMode: null,
    feedbackPipe: null,
  };

  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    switch (a) {
      case "--wait":
      case "--wait-mode":
        out.waitMode = true;
        i += 1;
        break;
      case "--json":
      case "--json-output":
        out.jsonOutput = true;
        i += 1;
        break;
      case "--diff-commit":
      case "--commit":
        out.initialDiffMode = { type: "commit", value: argv[i + 1] ?? "" };
        i += 2;
        break;
      case "--diff-range":
      case "--commits":
        out.initialDiffMode = { type: "range", value: argv[i + 1] ?? "" };
        i += 2;
        break;
      case "--diff-branch":
      case "--branch":
        out.initialDiffMode = { type: "branch", value: argv[i + 1] ?? "" };
        i += 2;
        break;
      case "--feedback-pipe":
        out.feedbackPipe = argv[i + 1] ?? null;
        i += 2;
        break;
      default:
        if (!a.startsWith("--")) {
          out.workingDir = a;
        }
        i += 1;
        break;
    }
  }

  return out;
}
