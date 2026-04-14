#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const registryPath = path.join(repoRoot, 'projects', 'registry.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const defaults = registry.defaults || {};
const projects = registry.projects || [];
const console = globalThis.console;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  });

  if (result.status !== 0) {
    const error = result.stderr || result.stdout || `${command} failed`;
    throw new Error(error.trim());
  }

  return result.stdout?.trim() || '';
}

function usage(exitCode = 0) {
  console.log(`Usage:
  npm run split:project -- --list
  npm run split:project -- <project-id>
  npm run split:project -- <project-id> --execute [--remote <git-url>] [--cleanup]

Defaults:
  source branch: ${defaults.sourceBranch || 'main'}
  pages branch:  ${defaults.pagesBranch || 'pages'}`);
  process.exit(exitCode);
}

function listProjects() {
  for (const project of projects) {
    console.log(`${project.id.padEnd(22)} ${project.folder} -> ${project.repoName}`);
  }
}

function parseArgs(argv) {
  const options = {
    execute: false,
    cleanup: false,
    remote: null,
    projectId: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--list') {
      return { list: true };
    }

    if (value === '--execute') {
      options.execute = true;
      continue;
    }

    if (value === '--cleanup') {
      options.cleanup = true;
      continue;
    }

    if (value === '--remote') {
      options.remote = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (!options.projectId) {
      options.projectId = value;
      continue;
    }

    usage(1);
  }

  return options;
}

function ensureGitRepo() {
  run('git', ['rev-parse', '--show-toplevel'], { capture: true });
}

function branchExists(branchName) {
  const result = spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], {
    cwd: repoRoot
  });
  return result.status === 0;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.list) {
    listProjects();
    return;
  }

  if (!options.projectId) usage(1);

  ensureGitRepo();

  const project = projects.find(item => item.id === options.projectId);
  if (!project) {
    console.error(`Unknown project id: ${options.projectId}`);
    listProjects();
    process.exit(1);
  }

  const folderPath = path.join(repoRoot, project.folder);
  if (!existsSync(folderPath)) {
    console.error(`Missing folder: ${project.folder}`);
    process.exit(1);
  }

  const splitBranch = `split/${project.id}`;
  const remote = options.remote;
  const splitCommand = ['git', 'subtree', 'split', '--prefix', project.folder, '--branch', splitBranch];
  const pushCommand = remote ? ['git', 'push', remote, `${splitBranch}:main`] : null;

  console.log(`Project:      ${project.title}`);
  console.log(`Folder:       ${project.folder}`);
  console.log(`Target repo:  ${project.repoName}`);
  console.log(`Stage:        ${project.stage || defaults.stage || 'monorepo'}`);
  console.log(`Source repo:  ${project.legacySourceUrl || `https://github.com/${defaults.owner}/${project.repoName}`}`);
  console.log(`Future Pages: ${project.liveUrl || `https://${defaults.owner}.github.io/${project.repoName}/`}`);
  console.log('');

  if (!options.execute) {
    console.log('Dry run only. Commands:');
    console.log(`  ${splitCommand.join(' ')}`);
    if (pushCommand) {
      console.log(`  ${pushCommand.join(' ')}`);
    }
    return;
  }

  if (branchExists(splitBranch)) {
    run('git', ['branch', '-D', splitBranch]);
  }

  run(splitCommand[0], splitCommand.slice(1));

  if (pushCommand) {
    run(pushCommand[0], pushCommand.slice(1));
    if (options.cleanup) {
      run('git', ['branch', '-D', splitBranch]);
    }
  }
}

main();
