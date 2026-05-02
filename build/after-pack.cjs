const fs = require("node:fs");
const path = require("node:path");

exports.default = async function (context) {
  const platform = context.electronPlatformName;
  const appOut = context.appOutDir;

  let binDir;
  if (platform === "darwin") {
    const appName = `${context.packager.appInfo.productFilename}.app`;
    binDir = path.join(appOut, appName, "Contents", "Resources", "bin");
  } else if (platform === "linux") {
    binDir = path.join(appOut, "resources", "bin");
  } else {
    return;
  }

  if (!fs.existsSync(binDir)) {
    console.warn(`[after-pack] bin dir not found: ${binDir}`);
    return;
  }

  for (const file of fs.readdirSync(binDir)) {
    const p = path.join(binDir, file);
    fs.chmodSync(p, 0o755);
    console.log(`[after-pack] chmod +x ${p}`);
  }
};
