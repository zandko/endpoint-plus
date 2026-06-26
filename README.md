# Endpoint-Plus Monorepo

An adapter-based HTTP endpoint toolkit and companion developer tooling.

📦 **endpoint-plus**: [![npm version](https://img.shields.io/npm/v/endpoint-plus.svg?style=flat-square)](https://www.npmjs.com/package/endpoint-plus) [![npm downloads](https://img.shields.io/npm/dm/endpoint-plus.svg?style=flat-square)](https://www.npmjs.com/package/endpoint-plus)
🛠️ **endpoint-plus-devtools**: [![npm version](https://img.shields.io/npm/v/endpoint-plus-devtools.svg?style=flat-square)](https://www.npmjs.com/package/endpoint-plus-devtools) [![npm downloads](https://img.shields.io/npm/dm/endpoint-plus-devtools.svg?style=flat-square)](https://www.npmjs.com/package/endpoint-plus-devtools)

## Workspace Packages

This monorepo contains the following packages:

- **[endpoint-plus](./packages/endpoint-plus)**: The core TypeScript HTTP client library. Supports multiple runtimes (browser, Node.js, Mini-program), transports (Fetch, Axios), plugins (caching, retries, refresh token, rate-limiting, and more), and full compile-time type-safety.
- **[endpoint-plus-devtools](./packages/endpoint-plus-devtools)**: Devtools companion panel and Vite compiler integration for debugging endpoints and auto-generating TypeScript type declarations from API request/response flows.

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0

### Installing Dependencies

Install workspace dependencies and link the internal packages:

```bash
pnpm install
```

### Build All Packages

To build both packages in the workspace:

```bash
pnpm build
```

### Run Tests

To run the unit test suites for all packages:

```bash
pnpm test
```

### Type Checking

To run TypeScript checks across the workspace:

```bash
pnpm type-check
```

## Releasing and Versioning

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and releases.

### Creating a Changeset

When you make a change that requires a new version release, run:

```bash
pnpm changeset
```

Follow the prompts to specify the package(s) affected, the semver bump type (major, minor, or patch), and write a summary of changes.

### Versioning Packages

To consume changesets and bump package versions (and update changelogs):

```bash
pnpm version-packages
```

### Publishing

To build, test, and publish packages to npm:

```bash
pnpm release
```

## AI Assistant Skills

This monorepo includes a `skills/` directory containing system prompts, documentation, references, and examples optimized for AI coding assistants (such as Antigravity, Cursor, Copilot, etc.).

By loading these skills, your AI assistant will instantly know how to correctly configure, use, and migrate to `endpoint-plus` in your projects.

### Loading Skills in AI Coding Assistants

To make these skills available to your agent, copy or link the `skills` directory into your project's customizations directory:

1. Create a `.agents` directory in your consumer project root:
   ```bash
   mkdir -p .agents/skills
   ```
2. Copy the `endpoint-plus` skill folder:
   ```bash
   cp -r /path/to/endpoint-plus/skills .agents/skills/endpoint-plus
   ```

The agent will automatically discover the skill and load its instructions when you ask questions or perform tasks related to `endpoint-plus`.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
