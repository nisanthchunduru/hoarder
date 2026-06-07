// web-ext configuration — applied to every web-ext subcommand.
// Docs: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/

const { existsSync, mkdirSync } = require("fs");
const { homedir } = require("os");
const { join, resolve } = require("path");

const FIREFOX_RELEASE_STREAMS = [
  "Firefox Developer Edition",
  "Firefox Nightly",
  "Firefox Beta",
  "Firefox",
];

function getFirefoxBinPath() {
  const applicationsDirectoriesPaths = [
    "/Applications",
    join(homedir(), "Applications"),
  ];
  for (const applicationsDirectoryPath of applicationsDirectoriesPaths) {
    for (const stream of FIREFOX_RELEASE_STREAMS) {
      const binPath = join(
        applicationsDirectoryPath,
        `${stream}.app`,
        "Contents/MacOS/firefox",
      );
      if (existsSync(binPath)) return binPath;
    }
  }
  return undefined; // fall back to web-ext's default lookup
}

// web-ext requires the profile directory to already exist when passed as a
// path, so ensure it's there.
const profileDir = resolve(__dirname, ".web-ext-profile");
mkdirSync(profileDir, { recursive: true });

module.exports = {
  sourceDir: "./build/extension",
  artifactsDir: "./build",
  ignoreFiles: [".DS_Store"],
  run: {
    firefox: getFirefoxBinPath(),
    // Persist IndexedDB + reloads across sessions so saved links stick
    firefoxProfile: profileDir,
    keepProfileChanges: true,
    profileCreateIfMissing: true,
    startUrl: ["about:debugging#/runtime/this-firefox"],
  },
  build: {
    overwriteDest: true,
  },
};
