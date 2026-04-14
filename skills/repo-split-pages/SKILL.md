---
name: repo-split-pages
description: >
  Split a project out of the portfolio monorepo, push it into its own repository,
  and publish it from a dedicated pages branch while keeping the portfolio registry in sync.
---

# Repo Split to Pages Branch

## Use when

- A project folder in `projects/registry.json` is ready to leave `philm013.github.io`
- You need a repeatable path from monorepo folder to standalone GitHub Pages repo

## Procedure

1. Read `projects/registry.json` and confirm the project's `folder`, `repoName`, and current `stage`.
2. Dry-run the split command with `npm run split:project -- -- <project-id>` and verify the folder/repo mapping.
3. Create the target GitHub repository if it does not already exist.
4. Run `npm run split:project -- -- <project-id> --execute --remote <git-url>` to create a subtree split branch and push it to `main` in the new repo.
5. Copy `templates/pages-branch-deploy.yml` into the new repo as `.github/workflows/deploy-pages.yml`.
6. In the new repository, enable GitHub Pages to serve from the `pages` branch.
7. Update `projects/registry.json`:
   - set `stage` to `split`
   - keep `repoName`
   - update `liveUrl` or `sourceUrl` only if the final repo name or path differs
8. Remove or archive the old folder from the portfolio repo only after the new repo is live and linked from the portfolio.

## Guardrails

- Do not assume every app is static. `MarkedUp`, `KnowledgeMapper`, and other projects with server/runtime needs may require custom deployment instead of the Pages template.
- Preserve URLs where possible so project links do not churn during migration.
- Keep the registry accurate; the landing page depends on it.
