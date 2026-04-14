# AGENTS.md

## Repository role

This repository is the `philm013.github.io` portfolio shell. It should remain small and focused on:

- the landing page at `index.html`
- the shared project registry at `projects/registry.json`
- migration tooling and templates for moving projects into their own repositories

Application code should move toward per-project repositories. Treat this repo as the control plane, not the long-term home for every app.

## Source of truth

- `AGENTS.md` is the single repository-wide source of truth for agent instructions.
- Tool-specific files such as `.github/copilot-instructions.md` and `GEMINI.md` should only add thin pointers or truly tool-specific notes.
- Reusable procedures belong in `skills/**/SKILL.md`.

## Working conventions

- Before changing an app folder, read that folder's local `README.md` first.
- Prefer explicit metadata over runtime discovery. The portfolio should read from `projects/registry.json`, not infer its state by crawling the repository tree.
- For split repositories, standardize on:
  - source branch: `main`
  - Pages branch: `pages`
- Keep project metadata stable during migration: preserve folder names, repo names, URLs, and launch paths unless there is a clear reason to change them.

## Commands

- `npm run lint` - repository lint baseline
- `npm run split:project -- --list` - list projects in the registry
- `npm run split:project -- <project-id>` - print split commands for one project
- `npm run split:project -- <project-id> --execute --remote <git-url>` - create the subtree split branch and push it to a new repo

## Deployment expectations

- The root portfolio repo stays published as the user site.
- Static split repos should publish from a dedicated `pages` branch using the template in `templates/pages-branch-deploy.yml`.
- Projects with required backend/server components need custom deployment decisions and should not blindly adopt the static Pages template.
