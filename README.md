# Hoarder

A private, easily self-hostable and beautiful Read It Later app

Hoarder is a privacy-focused alternative to Instapaper, Pocket and similar services

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

## TODOs

- Release as a Chrome extension, a macOS app, or both
- If released as a Chrome extension, offer an option to store data locally for guaranteed privacy

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

### Backend

- Express
- better-sqlite3

### Languages

- TypeScript

## Credits

Built in collaboration with [Kiro CLI](https://kiro.dev/cli/) + Claude Opus 4.5+
