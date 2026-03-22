import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const rootDir = process.cwd();
const entryPoint = path.join(rootDir, 'src', 'index.ts');
const outputLocation = path.join(rootDir, 'out', 'subtitle-feed.mp4');
const compositionId = 'SubtitleFeed';

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

fs.mkdirSync(path.dirname(outputLocation), {recursive: true});

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
