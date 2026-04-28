import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("window chrome", () => {
  it("centers the native macOS traffic-light buttons in the custom titlebar", () => {
    const config = JSON.parse(readFileSync(resolve(__dirname, "../../src-tauri/tauri.conf.json"), "utf8"));
    const windowConfig = config.app.windows[0];

    expect(windowConfig.titleBarStyle).toBe("Overlay");
    expect(windowConfig.hiddenTitle).toBe(true);
    expect(windowConfig.trafficLightPosition).toEqual({
      x: 16,
      y: 20,
    });
  });
});
