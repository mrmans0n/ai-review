import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("window chrome", () => {
  it("centers the native macOS traffic-light buttons in the custom titlebar", () => {
    const mainSource = readFileSync(resolve(__dirname, "../../electron/main.ts"), "utf8");

    expect(mainSource).toMatch(/titleBarStyle:\s*"hiddenInset"/);
    expect(mainSource).toMatch(/trafficLightPosition:\s*\{\s*x:\s*16,\s*y:\s*20\s*\}/);
  });
});
