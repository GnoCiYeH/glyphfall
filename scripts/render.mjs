import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const rootDir = process.cwd();
const entryPoint = path.join(rootDir, 'src', 'index.ts');
const compositionId = 'GlyphFall';
const speechScript = path.join(rootDir, 'scripts', 'generate_speech_assets.py');
const defaultInputPath = path.join(rootDir, 'examples', 'basic.json');
const buildRootDir = path.join(rootDir, 'build');

const defaultVisuals = {
  fontUrl: 'fonts/SmileySans-Oblique.otf',
  fontFamily: '"Smiley Sans", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  fontWeight: 800,
  autoFitFontSize: true,
  maxFontSize: 104,
  minFontSize: 56,
  lineHeightRatio: 1.16,
  maxTextWidth: 760,
  paddingX: 0,
  paddingY: 0,
  borderRadius: 0,
  activeAnchorY: 960,
  activeLetterSpacing: 2,
};

const defaultLayoutMap = {
  ccw: {
    mode: 'rotate_ccw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
    enterEasing: [0.22, 1, 0.36, 1],
    scaleFactor: 1.08,
  },
  cw: {
    mode: 'rotate_cw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
    enterEasing: [0.22, 1, 0.36, 1],
    scaleFactor: 0.92,
  },
  up: {
    mode: 'translate_up',
    enterDurationFrames: 18,
    containerTransitionFrames: 12,
    enterEasing: [0.22, 1, 0.36, 1],
    scaleFactor: 1.04,
  },
};

const parseCliArgs = () => {
  const args = process.argv.slice(2);
  let inputArg = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--input' || arg === '-i') {
      inputArg = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (!arg.startsWith('-') && !inputArg) {
      inputArg = arg;
    }
  }

  return {
    inputPath: path.resolve(rootDir, inputArg ?? defaultInputPath),
  };
};

const loadJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const sanitizeFileName = (value) =>
  value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-');

const getFileSha256 = (targetPath) =>
  crypto.createHash('sha256').update(fs.readFileSync(targetPath)).digest('hex');

const mergeLayoutMap = (inputLayoutMap = {}) => {
  const merged = {...defaultLayoutMap};

  for (const [key, value] of Object.entries(inputLayoutMap)) {
    const base = defaultLayoutMap[key] ?? {
      mode: value.mode,
      enterDurationFrames: 18,
      containerTransitionFrames: 14,
      enterEasing: [0.22, 1, 0.36, 1],
      scaleFactor: 1,
    };

    merged[key] = {
      ...base,
      ...value,
      mode: value.mode,
    };
  }

  return merged;
};

const getSpeechDurationInFrames = (speech, fps, tailHoldFrames) => {
  const segments = speech?.segments ?? [];
  if (segments.length === 0) {
    return tailHoldFrames;
  }

  const lastEndMs = Math.max(...segments.map((segment) => segment.endMs ?? 0));
  return Math.ceil((lastEndMs / 1000) * fps) + tailHoldFrames;
};

const buildRenderProps = (projectConfig, generatedSpeech, audioDataUrl) => {
  const fps = projectConfig.fps ?? 30;
  const width = projectConfig.width ?? 1080;
  const height = projectConfig.height ?? 1920;
  const tailHoldFrames = projectConfig.tailHoldFrames ?? 36;

  return {
    fps,
    width,
    height,
    tailHoldFrames,
    backgroundColor: projectConfig.backgroundColor ?? '#09090b',
    debug: projectConfig.debug ?? {
      showContainerBounds: true,
      showCaptionBounds: true,
    },
    captions: projectConfig.captions,
    timings: projectConfig.captions.map(() => ({durationSeconds: 1.8})),
    speech: {
      ...generatedSpeech,
      audioSrc: audioDataUrl,
    },
    layoutMap: mergeLayoutMap(projectConfig.layoutMap),
    visuals: {
      ...defaultVisuals,
      ...(projectConfig.visuals ?? {}),
    },
    durationInFrames: getSpeechDurationInFrames(generatedSpeech, fps, tailHoldFrames),
  };
};

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

const runOrThrow = (command, args, label) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
};

const getGeneratedSpeechInputHash = (generatedSpeechPath) => {
  if (!fs.existsSync(generatedSpeechPath)) {
    return null;
  }

  try {
    const payload = loadJson(generatedSpeechPath);
    return payload?.meta?.inputHash ?? null;
  } catch {
    return null;
  }
};

const fileToDataUrl = (filePath, mimeType) => {
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mimeType};base64,${base64}`;
};

const {inputPath} = parseCliArgs();

if (!fs.existsSync(inputPath)) {
  throw new Error(`Input subtitle file not found: ${inputPath}`);
}

const inputHash = getFileSha256(inputPath);
const inputConfig = loadJson(inputPath);
const buildDir = path.join(buildRootDir, inputHash);
const generatedSpeechOutput = path.join(buildDir, 'generated-speech.json');
const audioFileName = path.basename(inputConfig.audioSrc || 'narration.mp3');
const narrationAudioOutput = path.join(buildDir, audioFileName);
const renderPropsOutput = path.join(buildDir, 'render-props.json');
const outputFileName = sanitizeFileName(inputConfig.outputVideoName || inputHash) || inputHash;
const outputLocation = path.join(buildRootDir, 'out', `${outputFileName}.mp4`);

const shouldGenerateSpeechAssets = () => {
  if (process.env.GLYPHFALL_SKIP_SPEECH_GENERATE === '1') {
    return false;
  }

  if (!fs.existsSync(generatedSpeechOutput) || !fs.existsSync(narrationAudioOutput)) {
    return true;
  }

  const generatedInputHash = getGeneratedSpeechInputHash(generatedSpeechOutput);
  return inputHash !== generatedInputHash;
};

const ensureSpeechAssets = () => {
  if (!shouldGenerateSpeechAssets()) {
    console.log('[render] speech assets are up to date');
    return;
  }

  const python = resolvePythonCommand();
  fs.mkdirSync(buildDir, {recursive: true});
  console.log(`[render] generating speech assets from ${inputPath}`);
  runOrThrow(
    python.command,
    [
      ...python.args,
      speechScript,
      '--input',
      inputPath,
      '--output',
      generatedSpeechOutput,
      '--audio',
      narrationAudioOutput,
    ],
    'Speech generation',
  );
};

fs.mkdirSync(path.dirname(outputLocation), {recursive: true});
ensureSpeechAssets();

const generatedSpeech = loadJson(generatedSpeechOutput);
const audioDataUrl = fileToDataUrl(narrationAudioOutput, 'audio/mpeg');
const renderProps = buildRenderProps(inputConfig, generatedSpeech, audioDataUrl);

fs.writeFileSync(
  renderPropsOutput,
  `${JSON.stringify({...renderProps, speech: {...generatedSpeech, audioSrc: narrationAudioOutput}}, null, 2)}\n`,
  'utf8',
);

const serveUrl = await bundle({
  entryPoint,
  onProgress: () => undefined,
});

const composition = await selectComposition({
  serveUrl,
  id: compositionId,
  browserExecutable,
  inputProps: renderProps,
});

await renderMedia({
  serveUrl,
  composition,
  codec: 'h264',
  outputLocation,
  browserExecutable,
  inputProps: renderProps,
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
