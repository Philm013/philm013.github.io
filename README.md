# PhilM013 Portfolio Control Plane

This repository is being reduced from a giant multi-project GitHub Pages repo into a lightweight portfolio shell. Its long-term job is to host the landing page at `philm013.github.io`, keep the shared project inventory accurate, and provide tooling for splitting each app into its own repository.

## Current state

- Standalone repositories have been created for the project inventory.
- Static projects now publish from a dedicated `pages` branch in their own repositories.
- `MarkedUp` and `KnowledgeMapper` also have standalone repositories, but they still launch from this monorepo because they require custom hosting beyond plain GitHub Pages.

## Source of truth

- `projects/registry.json` is the canonical inventory for portfolio projects, repo names, branch strategy, and launch/docs links.
- `AGENTS.md` is the canonical repo-wide agent instruction file.
- `.github/copilot-instructions.md` and `GEMINI.md` now stay intentionally thin to avoid drift.

## Repo layout

| Path | Purpose |
| --- | --- |
| `index.html` | Portfolio landing page |
| `projects/registry.json` | Shared project inventory used by the site and migration tooling |
| `scripts/split-project-repo.mjs` | Helper for subtree-based repo extraction |
| `templates/pages-branch-deploy.yml` | Reusable workflow for static split repos that publish to `pages` |
| `skills/repo-split-pages/SKILL.md` | Reusable migration procedure |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run the current repo-wide lint baseline |
| `npm run split:project -- --list` | List project ids from the registry |
| `npm run split:project -- <project-id>` | Dry-run the split command for one project |
| `npm run split:project -- <project-id> --execute --remote <git-url>` | Create a subtree split branch and push it to a new repo |

## Migration workflow

1. Keep the project listed in `projects/registry.json` with its folder, target repo name, and `pages` branch metadata.
2. Dry-run the split with `npm run split:project -- <project-id>`.
3. Create the target GitHub repository.
4. Push the project history into the new repo with `npm run split:project -- <project-id> --execute --remote <git-url>`.
5. Copy `templates/pages-branch-deploy.yml` into the new repo as `.github/workflows/deploy-pages.yml`.
6. Configure GitHub Pages in the new repo to serve from the `pages` branch.
7. Update the project's `stage` in `projects/registry.json` from `monorepo` to `split`.
8. Remove the old folder from this repo only after the standalone repo is live and linked from the portfolio.

The registry has already been updated so the landing page launches split projects from their standalone Pages sites and sends source links to the new repositories.

## Notes

- The standard split-repo convention is `main` for source and `pages` for the published branch.
- Most projects here are static browser apps and fit the Pages-branch template well.
- `MarkedUp`, `KnowledgeMapper`, and similar projects with server/runtime requirements need custom deployment choices before they leave the monorepo.
- Project-local `README.md` files still matter; read them before editing an app.
