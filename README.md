# @vantagecompute/docusaurus-plugin-godoc

A Docusaurus plugin that auto-generates SDK reference documentation from Go source code using `go doc`.

## Features

- Parses `go doc -all` output for each configured package
- Generates one Markdown page per package with types, functions, methods, and doc comments
- Generates an SDK reference index page with package summary table
- Optionally extracts cobra command tree for CLI command reference pages
- Runs at Docusaurus build time (or standalone via CLI)

## Installation

```bash
npm install @vantagecompute/docusaurus-plugin-godoc
```

## Usage

In your `docusaurus.config.ts`:

```ts
plugins: [
  [
    '@vantagecompute/docusaurus-plugin-godoc',
    {
      projectRoot: path.join(__dirname, '..'),
      packages: [
        {path: './cmd', name: 'cmd'},
        {path: './internal/cache', name: 'internal/cache'},
      ],
      outputDir: './docs/sdk-reference',
      // Optional: generate commands page from cobra help output
      generateCommands: false,
      binaryName: 'v8x',
      commandsOutputPath: './docs/commands.mdx',
    },
  ],
],
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectRoot` | string | required | Path to Go project root (where go.mod lives) |
| `packages` | array | `[]` | Packages to document. Each: `{path, name, label?}` |
| `outputDir` | string | `./docs/sdk-reference` | Output directory for generated markdown |
| `generateCommands` | boolean | `false` | Generate a commands reference from cobra help |
| `binaryName` | string | - | CLI binary name (used for commands generation) |
| `commandsOutputPath` | string | `./docs/commands.mdx` | Output path for commands page |

## Standalone CLI

Generate docs without a full Docusaurus build:

```bash
node node_modules/@vantagecompute/docusaurus-plugin-godoc/src/generate.js \
  --project-root ../.. \
  --output-dir ./docs/sdk-reference \
  --packages ./cmd,./internal/cache,./internal/output
```

## Requirements

- Go must be installed and on `$PATH`
- The Go project must be buildable (`go doc` needs compilable source)

## How it Works

1. At Docusaurus `loadContent` phase, runs `go doc -all <package>` for each configured package
2. Parses the structured text output into types, functions, methods, constants, and variables
3. Renders each package as a Markdown page with Go code blocks and doc comments
4. Generates an index page listing all packages with summary info

## License

MIT
