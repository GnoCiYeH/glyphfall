import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const rootDir = process.cwd();
const examplesDir = path.join(rootDir, 'examples');
const scriptPath = path.join(rootDir, 'scripts', 'generate_speech_assets.py');

const pythonCandidates =
  process.platform === 'win32'
    ? [
        path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
        process.env.PYTHON,
        'python',
        'py',
      ]
    : [path.join(rootDir, '.venv', 'bin', 'python'), process.env.PYTHON, 'python3', 'python'];

const resolvePythonCommand = () => {
  for (const candidate of pythonCandidates.filter(Boolean)) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate)) {
        return {command: candidate, args: []};
      }
      continue;
    }

    if (candidate === 'py') {
      return {command: 'py', args: ['-3']};
    }

    return {command: candidate, args: []};
  }

  throw new Error('No Python executable found for preview generation.');
};

const runOrThrow = (command, args, label) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
};

const examplePaths = fs
  .readdirSync(examplesDir)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => path.join(examplesDir, name));

if (examplePaths.length === 0) {
  throw new Error('No example JSON files found.');
}

const python = resolvePythonCommand();

for (const examplePath of examplePaths) {
  console.log(`[speech:generate:examples] generating preview for ${path.basename(examplePath)}`);
  runOrThrow(
    python.command,
    [...python.args, scriptPath, '--input', examplePath],
    `Preview generation for ${path.basename(examplePath)}`,
  );
}

console.log('[speech:generate:examples] all example previews are up to date');
