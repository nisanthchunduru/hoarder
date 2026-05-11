const { cpSync, rmSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const ext = path.join(root, "extension");
const dist = path.join(root, "dist");

console.log("Building extension");

execSync("npx vite build", { cwd: root, stdio: "inherit" });

// Wipe old assets to avoid stale hashed files piling up
rmSync(path.join(ext, "assets"), { recursive: true, force: true });

// Copy dist into extension
for (const name of ["index.html", "popup.html", "assets", "favicon.svg"]) {
  cpSync(path.join(dist, name), path.join(ext, name), { recursive: true, force: true });
}

console.log("\nExtension built in extension/");
