# Hoarder

Privacy-focused read-it-later app

Hoarder is a privacy-focused alternative to Instapaper, Pocket and similar read-it-later services

<img width="5344" height="2864" alt="image" src="https://github.com/user-attachments/assets/6a006159-49ef-4489-a1c5-437797f0f4fe" />

## Setup

Clone the repo

```bash
git clone git@github.com:nisanthchunduru/hoarder.git
# or
git clone https://github.com/nisanthchunduru/hoarder.git
```

Install node modules

```bash
cd hoarder
npm install
```

Start dev sever

```bash
npm run dev
```

and visit [http://localhost:5173](http://localhost:5173)

### Building Chrome & Firefox extension

Hoarder can also be installed as a Chrome or Firefox extension. To do so, build the extension

```bash
npm run build-ext
```

`build-ext` NPM script compiles TypeScript/React files (using Vite) to `extension/`

Then, follow the steps below

#### Chrome

1. Open Chrome and visit `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` folder

#### Firefox

1. Open Firefox and visit `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on" and select `extension/manifest.json`

### Build extension zip

If you'd like zip the extension after building, run

```bash
npm run zip-ext
```

`zip-ext` NPM script creates an `extension.zip` file in `build/`

## Features

- Add/delete a link
- Add/delete 1 or more tags to a link

## Collections

- Create/delete a collection
- Add/remove a link from a collection
- Nest a collection under another collection
- Group links in a collection by domain or date added

### Tags

- View links having a tag

### Archive

- Archive/unarchive a link
- View archived links

## Tech Stack

### Frontend

- React
- Vite

### Storage

- IndexedDB

### Languages

- TypeScript

## TODOs

- Release as a Chrome/Firefox extension, a macOS app, or both

## Credits

Built in collaboration with [Kiro CLI](https://kiro.dev/cli/) + Claude Opus 4.5+
