Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Code Style

- Do not use `while` loops. They are poor engineering. Use iteration with bounded limits (e.g. `for` loops with a max iteration count) or recursive approaches instead.

## Changelog Guidelines

All changelog entries live in `src/lib/changelog.ts`. The `ChangelogModal.svelte` component renders them dynamically — never hardcode entries in the modal.

### Data format

Each entry in the `CHANGELOG` array uses this structure:

```ts
{
  version: '0.12.0',
  date: '2026-01-29',
  changes: [
    { category: 'new', description: 'Description of the change' }
  ]
}
```

### Categories

Every change item must have a `category`:
- `new` — New features, mechanics, or content
- `changed` — Modifications to existing behavior
- `fixed` — Bug fixes

### Content rules

- Never list specific upgrade/card names in changelog entries. Keep them a mystery for players to discover.
- Use counts instead (e.g. "Added 8 new poison upgrade cards to discover").
- Describe mechanics changes and bug fixes clearly, but don't spoil card specifics.
- Start descriptions with a verb: "Added", "Fixed", "Redesigned", etc.
- Keep each entry to a single sentence.

### Versioning

- `PATCH` is auto-incremented by the pre-commit hook on every commit.
- `MINOR` is bumped by CI on merge to master.
- Changelog entries track `MAJOR.MINOR.0` versions (the minor release).
- The pre-commit hook enforces that a changelog entry exists for the current minor version.
