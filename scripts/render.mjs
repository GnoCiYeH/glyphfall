import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const rootDir = process.cwd();
const entryPoint = path.join(rootDir, 'src', 'index.ts');
const outputLocation = path.join(rootDir, 'out', 'subtitle-feed.mp4');
const compositionId = 'SubtitleFeed';
const subtitlesInput = path.join(rootDir, 'src', 'data', 'subtitles.json');
const generatedSpeechOutput = path.join(rootDir, 'src', 'data', 'generated-speech.json');
const narrationAudioOutput = path.join(rootDir, 'public', 'audio', 'narration.mp3');
const speechScript = path.join(rootDir, 'scripts', 'generate_speech_assets.py');

const windowsBrowserCandidates = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  process.env.ProgramFiles
    ? path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe')
    : null,
  process.env['ProgramFiles(x86)']
    ? path.join(process.env['ProgramFiles(x86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')
    : null,
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
    : null,
  process.env.ProgramFiles
    ? path.join(process.env.ProgramFiles, 'Chromium', 'Application', 'chrome.exe')
    : null,
  process.env['ProgramFiles(x86)']
    ? path.join(process.env['ProgramFiles(x86)'], 'Chromium', 'Application', 'chrome.exe')
    : null,
  process.env.ProgramFiles
    ? path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    : null,
].filter(Boolean);

const unixBrowserCandidates = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  '/snap/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

const browserCandidates = [
  ...(process.platform === 'win32' ? windowsBrowserCandidates : unixBrowserCandidates),
];

const browserExecutable = browserCandidates.find((candidate) => fs.existsSync(candidate));

if (!browserExecutable) {
  throw new Error(
    `No local Chromium executable found. Checked: ${browserCandidates.join(', ')}`,
  );
}

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

  throw new Error('No Python executable found for the speech generation pipeline.');
};

const getFileSha256 = (targetPath) =>
  crypto.createHash('sha256').update(fs.readFileSync(targetPath)).digest('hex');

const getGeneratedSpeechInputHash = () => {
  if (!fs.existsSync(generatedSpeechOutput)) {
    return null;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(generatedSpeechOutput, 'utf8'));
    return payload?.meta?.inputHash ?? null;
  } catch {
    return null;
  }
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

const shouldGenerateSpeechAssets = () => {
  if (process.env.GLYPHFALL_SKIP_SPEECH_GENERATE === '1') {
    return false;
  }

  if (!fs.existsSync(generatedSpeechOutput) || !fs.existsSync(narrationAudioOutput)) {
    return true;
  }

  const currentInputHash = getFileSha256(subtitlesInput);
  const generatedInputHash = getGeneratedSpeechInputHash();

  return currentInputHash !== generatedInputHash;
};

const ensureSpeechAssets = () => {
  if (!shouldGenerateSpeechAssets()) {
    console.log('[render] speech assets are up to date');
    return;
  }

  const python = resolvePythonCommand();
  console.log('[render] generating speech assets before render');
  runOrThrow(
    python.command,
    [...python.args, speechScript],
    'Speech generation',
  );
};

fs.mkdirSync(path.dirname(outputLocation), {recursive: true});
ensureSpeechAssets();

const serveUrl = await bundle({
  entryPoint,
  onProgress: () => undefined,
});

const composition = await selectComposition({
  serveUrl,
  id: compositionId,
  browserExecutable,
  inputProps: {},
});

await renderMedia({
  serveUrl,
  composition,
  codec: 'h264',
  outputLocation,
  browserExecutable,
  inputProps: {},
  overwrite: true,
  onProgress: (progress) => {
    const percent = `${(progress.progress * 100).toFixed(1)}%`;
    const rendered = `${progress.renderedFrames}/${composition.durationInFrames}`;
    const encoded = `${progress.encodedFrames}/${composition.durationInFrames}`;

    process.stdout.write(
      `\r[render] stage=${progress.stitchStage} progress=${percent} rendered=${rendered} encoded=${encoded}`,
    );
  },
});

process.stdout.write('\n');
console.log(`Rendered to ${outputLocation}`);
