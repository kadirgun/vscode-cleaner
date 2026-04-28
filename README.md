# VS Code Cleaner

A tool to clean VS Code workspace storage folders. Finds unused workspaces, shows their sizes, and lets you select and delete them.

## Installation

```bash
npm install -g vscode-cleaner
```

or

```bash
pnpm add -g vscode-cleaner
```

## Quick Start

Without installing:

```bash
npx vscode-cleaner
```

With installation:

```bash
vscode-cleaner
```

## Flags

### `--only <types>`

Filter workspaces by type. Multiple types can be specified with comma separation.

| Type        | Description                                     |
| ----------- | ----------------------------------------------- |
| `deleted`   | Workspaces whose target folder no longer exists |
| `remote`    | Remote container workspaces                     |
| `duplicate` | Workspaces sharing the same target path         |

```bash
vscode-cleaner --only deleted        # only deleted
vscode-cleaner --only remote         # only remote
vscode-cleaner --only duplicate      # only duplicate
vscode-cleaner --only deleted,remote # deleted + remote
```

### `--filter <text>`

Search by workspace name or UUID. Case-insensitive partial match.

```bash
vscode-cleaner --filter api-server  # name contains "api-server"
vscode-cleaner --filter 04ddb8ba    # UUID starts with "04ddb8ba"
```

### `--age <duration>`

Filter workspaces by age. Syntax: `<number><unit>`

| Unit | Description |
| ---- | ----------- |
| `d`  | Day         |
| `w`  | Week        |
| `m`  | Month       |
| `y`  | Year        |

```bash
vscode-cleaner --age 1d    # older than 1 day
vscode-cleaner --age 1w    # older than 1 week
vscode-cleaner --age 1m    # older than 1 month
vscode-cleaner --age 1y    # older than 1 year
```

### `--sort <field>`

Sort workspaces by field. Default: `date`

| Field  | Description  |
| ------ | ------------ |
| `date` | Newest first |
| `age`  | Oldest first |

```bash
vscode-cleaner --sort date    # default
vscode-cleaner --sort age     # oldest first
```

## Combining Flags

Flags can be combined:

```bash
vscode-cleaner --only deleted --age 1y
vscode-cleaner --only remote,duplicate --sort age
vscode-cleaner --filter api-server --only deleted
vscode-cleaner --only deleted,remote,duplicate --age 6m --sort age
```

## UI View

Workspace list shows size, date, UUID and name:

```
  245.5 MB 5mo  04ddb8ba my-project (deleted)
  201.8 MB 4mo  8dfedab3 experiment (deleted)
  192.1 KB 1y  66105b82 api-server (remote)
```

### Labels

| Label         | Meaning                                       |
| ------------- | --------------------------------------------- |
| `(deleted)`   | Target folder no longer exists                |
| `(remote)`    | VS Code remote container                      |
| `(duplicate)` | Another workspace shares the same target path |

## Selection and Deletion

1. Press **Space** to select workspaces
2. Press **Enter** to confirm
3. Press **a** to select all
4. Press **i** to invert selection

## Shortcuts

| Shortcut | Action            |
| -------- | ----------------- |
| `Space`  | Select / Deselect |
| `a`      | Select all        |
| `i`      | Invert selection  |
| `Enter`  | Confirm           |
| `↑↓`     | Navigate          |
