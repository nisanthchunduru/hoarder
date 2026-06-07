const { cpSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const assets = path.join(root, "extension-assets");
const ext = path.join(root, "build", "extension");

console.log("Building extension");

execSync("npx vite build --outDir build/extension --emptyOutDir true", {
  cwd: root,
  stdio: "inherit",
});

for (const name of ["manifest.json", "icon-128.png"]) {
  cpSync(path.join(assets, name), path.join(ext, name), { recursive: true, force: true });
}

console.log("\nExtension built in build/extension/");
