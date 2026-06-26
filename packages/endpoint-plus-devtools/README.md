# endpoint-plus-devtools

Vite companion DevTools panel and AST compiler integration for `endpoint-plus`.

## Features

* 🔍 **AST Project Scanning**: Automatically scans your project's codebase (`.ts`, `.tsx`, `.js`, `.jsx`, `.vue`) at compile-time using the TypeScript Compiler API to index all outbound HTTP calls.
* 🌐 **Interactive DevTools Overlay**: Provides a visual browser dashboard to inspect, trigger, and debug active routes.
* ⚡ **1-Click TypeScript Type Generation**: Captures live JSON responses from your backend and invokes `quicktype-core` to infer and write strongly-typed ambient interfaces (`.d.ts`) directly into your project.
* 🔒 **Vite HMR Isolation**: Temporarily unwatches the generated type declarations file from Vite's `chokidar` watcher to prevent recursive hot-module replacement (HMR) page reloads.
* 💻 **Launch Editor Integration**: Integrates with Node.js editor launchers to open VS Code, Cursor, or WebStorm directly to the specific line of code declaring the scanned API endpoint.

---

## Installation

Install the devtools package as a development dependency:

```bash
pnpm add -D endpoint-plus-devtools
```

To enable automated TypeScript schema inference from live JSON responses, also install the optional peer dependency `quicktype-core`:

```bash
pnpm add -D quicktype-core
```

---

## Configuration

Add the plugin to your `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { endpointPlusDevtools } from 'endpoint-plus-devtools/vite';

export default defineConfig({
  plugins: [
    endpointPlusDevtools({
      // Enabled by default in development mode (vite serve)
      enabled: true,

      // Configuration for automated type-generation
      typegen: {
        // Output path for the generated ambient typescript declarations file
        outputFile: 'src/endpoint-types.d.ts',
      },
    }),
  ],
});
```

### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Set to `false` to disable the DevTools server and scanner entirely. |
| `base` | `string` | `"/__endpoint-plus-devtools"` | The base HTTP path where the DevTools panel UI will be served. |
| `typegen.outputFile` | `string` | `"src/endpoint-types.d.ts"` | Target file path (relative to the Vite project root) where generated types are written. |

---

## How it Works

### 1. Codebase Scanning
When you run `vite`, the plugin scans your `/src` directory for matches of `endpoint-plus` API invocation syntax:
```ts
// The scanner registers: GET /api/users/:userId
api.get(`/api/users/${userId}`);

// The scanner registers: POST /api/submit
api.post('/api/submit', data);
```
It extracts the HTTP method, the path template (automatically parameterizing template literals), and maps it back to the original source file, line number, and column.

### 2. Interactive Route Panel
Open your browser and navigate to the dev server. The DevTools client is automatically injected into the page as a floating panel or can be accessed directly at `http://localhost:5173/__endpoint-plus-devtools/`. Here, you can review the route map and trigger request tests.

### 3. Real Response Type Gen
Once a request finishes, the DevTools capturing layer passes the JSON payload to the backend service. Clicking **"Save"** automatically:
1. Translates the JSON payload into TypeScript interfaces.
2. Derives semantic type names (e.g. `GET /api/users/:id` maps to `GetUsersByIDResponse`).
3. Appends the route type to the `YwEndpoint.Routes` interface block.
4. Writes the changes to the `outputFile`.

The generated types immediately light up your code editor with type-safety:
```ts
// TypeScript matches the path string and infers the correct return type
const users = await api.get('/api/users/123');
//    ^? User
```

---

## License

MIT License.
