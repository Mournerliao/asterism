import { createHash } from 'node:crypto';
import { promises as fs, constants as fsConstants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'knowledge/skills/manifest.json');
const checkOnly = process.argv.includes('--check');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readManifest() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

async function listFiles(root, base = root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath, base)));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.relative(base, fullPath).split(path.sep).join('/'));
    }
  }

  return files.sort();
}

async function hashFile(filePath) {
  const contents = await fs.readFile(filePath);
  return createHash('sha256').update(contents).digest('hex');
}

async function compareDirs(sourceRoot, targetRoot) {
  if (!(await pathExists(targetRoot))) {
    return [`missing target directory: ${path.relative(repoRoot, targetRoot)}`];
  }

  const [sourceFiles, targetFiles] = await Promise.all([
    listFiles(sourceRoot),
    listFiles(targetRoot),
  ]);
  const errors = [];
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);

  for (const file of sourceFiles) {
    if (!targetSet.has(file)) {
      errors.push(`missing file: ${file}`);
      continue;
    }

    const [sourceHash, targetHash] = await Promise.all([
      hashFile(path.join(sourceRoot, file)),
      hashFile(path.join(targetRoot, file)),
    ]);

    if (sourceHash !== targetHash) {
      errors.push(`changed file: ${file}`);
    }
  }

  for (const file of targetFiles) {
    if (!sourceSet.has(file)) {
      errors.push(`extra file: ${file}`);
    }
  }

  return errors;
}

async function syncSkill(skill) {
  const sourceRoot = path.join(repoRoot, skill.vendorPath);
  const targetRoot = path.join(repoRoot, skill.agentPath);

  if (!(await pathExists(sourceRoot))) {
    throw new Error(`Missing vendor path for ${skill.name}: ${skill.vendorPath}`);
  }

  if (checkOnly) {
    const errors = await compareDirs(sourceRoot, targetRoot);
    return { name: skill.name, errors };
  }

  await fs.rm(targetRoot, { force: true, recursive: true });
  await fs.mkdir(path.dirname(targetRoot), { recursive: true });
  await fs.cp(sourceRoot, targetRoot, { recursive: true });
  return { name: skill.name, errors: [] };
}

const manifest = await readManifest();
const results = [];

for (const skill of manifest.skills) {
  results.push(await syncSkill(skill));
}

const failures = results.filter((result) => result.errors.length > 0);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`${failure.name}:`);
    for (const error of failure.errors) {
      console.error(`  - ${error}`);
    }
  }

  process.exitCode = 1;
} else {
  const action = checkOnly ? 'verified' : 'synced';
  console.log(`Agent skills ${action}: ${results.map((result) => result.name).join(', ')}`);
}
