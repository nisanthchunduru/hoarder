const { cpSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const ext = path.join(root, "extension");
const dist = path.join(root, "dist");

// Build
execSync("npx vite build", { cwd: root, stdio: "inherit" });

// Copy dist into extension
for (const name of ["index.html", "assets", "favicon.svg"]) {
  cpSync(path.join(dist, name), path.join(ext, name), { recursive: true, force: true });
}

console.log("\nExtension built in extension/");
console.log("Load it in Chrome: chrome://extensions → Load unpacked → select extension/");
console.log("Load it in Firefox: about:debugging → This Firefox → Load Temporary Add-on → select extension/manifest.json");
