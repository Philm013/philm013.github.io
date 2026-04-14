# PhilM013 Portfolio Control Plane

This repository is the control plane for `philm013.github.io`. It is no longer the long-term home for every project. Its purpose is to:

1. serve the portfolio landing page
2. store the shared project inventory
3. document the process for adding, updating, splitting, and retiring projects

## Current state

- Static projects have already been moved into standalone repositories.
- Those static repositories publish from their own `pages` branches.
- The landing page reads `projects/registry.json` and launches split projects from their standalone Pages URLs.
- `MarkedUp` and `KnowledgeMapper` still launch from this repo because they need custom hosting beyond plain GitHub Pages.

## Source of truth

| File | Role |
| --- | --- |
| `projects/registry.json` | Canonical inventory for what appears on the portfolio |
| `index.html` | Portfolio UI that renders the registry |
| `AGENTS.md` | Repo-wide operating guidance for agents |
| `README.md` | Human guide for maintaining the portfolio shell |

Do not treat folder discovery as the source of truth. The registry drives the site.

## Repo layout

| Path | Purpose |
| --- | --- |
| `index.html` | Portfolio landing page |
| `projects/registry.json` | Portfolio project inventory |
| `scripts/split-project-repo.mjs` | Helper for splitting a still-local project into its own repo |
| `templates/pages-branch-deploy.yml` | Optional workflow template for static repos that publish to `pages` |
| `skills/repo-split-pages/SKILL.md` | Reusable split-repo procedure |
| `MarkedUp/` | Local holdout until custom hosting is ready |
| `KnowledgeMapper/` | Local holdout until custom hosting is ready |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run the current root lint baseline |
| `npm run split:project -- --list` | List project ids from the registry |
| `npm run split:project -- <project-id>` | Dry-run the split helper for a project that still exists locally |
| `npm run split:project -- <project-id> --execute --remote <git-url>` | Push a local project subtree into a new repository |

There is no root automated test suite. The root repo is a static portfolio shell plus metadata.

## Registry schema

Each project in `projects/registry.json` should describe the public state of that project, not just its old monorepo location.

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable slug used by scripts and internal references |
| `folder` | yes | Local folder name if the project still exists in this repo |
| `repoName` | yes | Standalone repository name |
| `title` | yes | Display title in the portfolio |
| `category` | yes | One of the portfolio categories used for filtering |
| `description` | yes | Short portfolio summary |
| `tags` | yes | Portfolio tags |
| `techStack` | yes | Short technology labels for cards |
| `icon` | yes | Iconify/Lucide icon name |
| `sourceUrl` | recommended | Canonical source repository URL |
| `liveUrl` | recommended for Pages-hosted projects | Public launch URL |
| `detailsUrl` | optional | Explicit docs/details URL if it should differ from the source repo |
| `launchPath` | optional | Local monorepo launch path; mainly for projects that still launch from this repo |
| `stage` | yes | `split` for standalone repos, `monorepo` for local holdouts |
| `hosting` | yes | `pages` for GitHub Pages, `custom` for non-Pages hosting |
| `notes` | optional | Maintenance note for unusual cases |

### Recommended patterns

**Static standalone project**

```json
{
  "id": "future-tool",
  "folder": "FutureTool",
  "repoName": "FutureTool",
  "title": "FutureTool",
  "category": "productivity",
  "description": "Short summary for the landing page.",
  "tags": ["Utility", "Browser"],
  "techStack": ["JavaScript", "IndexedDB"],
  "icon": "lucide:tool-case",
  "sourceUrl": "https://github.com/Philm013/FutureTool",
  "liveUrl": "https://philm013.github.io/FutureTool/",
  "stage": "split",
  "hosting": "pages"
}
```

**Custom-hosting project still launched from this repo**

```json
{
  "id": "server-tool",
  "folder": "ServerTool",
  "repoName": "ServerTool",
  "title": "ServerTool",
  "category": "ai",
  "description": "Project that still depends on a backend.",
  "tags": ["AI", "Server"],
  "techStack": ["Node.js", "Express"],
  "icon": "lucide:server",
  "sourceUrl": "https://github.com/Philm013/ServerTool",
  "launchPath": "./ServerTool/index.html",
  "stage": "monorepo",
  "hosting": "custom",
  "notes": "Keep local launch until custom hosting is configured."
}
```

## How to add a future project

### Option 1: Add a new static project that already lives in its own repo

Use this when the project should never live in the monorepo.

1. Create the standalone repository.
2. Push the project to `main`.
3. Push the published snapshot to `pages`.
4. Enable GitHub Pages to serve from `pages`.
5. Add a new entry to `projects/registry.json` with:
   - `sourceUrl`
   - `liveUrl`
   - `stage: "split"`
   - `hosting: "pages"`
6. Run `npm run lint`.
7. Commit and push this portfolio repo.

### Option 2: Start locally, then split later

Use this only when the project is still being incubated in this repo.

1. Create the local folder.
2. Add the project entry to `projects/registry.json`.
3. While the project is still local, keep:
   - `stage: "monorepo"`
   - `launchPath` pointing to the local entry file
4. When it is ready to leave:
   - create the target repo
   - run `npm run split:project -- <project-id>` to dry-run
   - run `npm run split:project -- <project-id> --execute --remote <git-url>` if you want subtree history
5. After the standalone repo is live:
   - set `sourceUrl`
   - set `liveUrl`
   - change `stage` to `split`
   - change `hosting` to `pages`
   - remove `launchPath` if the monorepo copy is no longer needed
6. Remove the local folder from this repo once it is no longer needed.

### Option 3: Add a custom-hosting project

Use this for anything that needs a backend, proxy, worker, or private runtime.

1. Create the standalone repo.
2. Keep the project local here only if the portfolio still needs a local launch path.
3. Set:
   - `sourceUrl`
   - `stage: "monorepo"` until the public host is ready
   - `hosting: "custom"`
   - `notes` explaining why it is still local
4. Once custom hosting is ready, replace `launchPath` with `liveUrl` and switch the project to its fully split state.

## How to update an existing project

### Metadata-only update

If the repo and hosting model have not changed:

1. Update the entry in `projects/registry.json`.
2. Keep `id` stable.
3. Run `npm run lint`.
4. Commit and push this repo.

### Repo rename or URL change

If a project repo is renamed:

1. Update `repoName`.
2. Update `sourceUrl`.
3. Update `liveUrl` if the Pages URL changes.
4. Confirm the portfolio card still launches correctly.

### Hosting change

If a project moves from local/custom hosting to Pages:

1. Publish the project from its standalone repo.
2. Set `liveUrl`.
3. Change `stage` to `split`.
4. Change `hosting` to `pages`.
5. Remove `notes` and `launchPath` if they are no longer needed.
6. Delete the local project folder from this repo once safe.

## Cleanup rules

- Do not reintroduce project source folders here unless there is a clear reason.
- Remove stale local launch paths once a project is fully split.
- Prefer `sourceUrl` over older field names when adding future entries.
- Keep the root repo focused on the portfolio shell, shared assets, and the two custom-hosting holdouts.
- If a folder is removed from this repo, make sure the registry no longer depends on local docs or local launch links for that project.

## Remaining holdouts

| Project | Why it remains local |
| --- | --- |
| `MarkedUp` | Requires Node/Express proxy and Playwright capture services |
| `KnowledgeMapper` | Requires a separate Node backend for Gemini/tool execution |

## Operational checklist

Before pushing a portfolio-shell change:

1. Update `projects/registry.json`.
2. Confirm `index.html` still renders the intended source/live links.
3. Run `npm run lint`.
4. Commit only shell/control-plane changes in this repo.
