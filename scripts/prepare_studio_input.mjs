import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

const rootDir = process.cwd();
const defaultInput = path.join(rootDir, 'build', 'local-midnight-lament-demo.json');
const defaultOutput = path.join(rootDir, 'public', 'studio-input', 'current.json');
const defaultAssetsDir = path.join(rootDir, 'public', 'studio-input', 'assets');

const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    input: defaultInput,
    output: defaultOutput,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if ((arg === '--input' || arg === '-i') && next) {
      options.input = path.resolve(rootDir, next);
      index += 1;
      continue;
    }

    if ((arg === '--output' || arg === '-o') && next) {
      options.output = path.resolve(rootDir, next);
      index += 1;
    }
  }

  return options;
};

const loadJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const resolveLocalAudioPath = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  if (value.startsWith('file:')) {
    return fileURLToPath(value);
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  return null;
};

const materializeAudioSource = (value, assetsDir) => {
  const localPath = resolveLocalAudioPath(value);
  if (!localPath) {
    return value;
  }

  const extension = path.extname(localPath);
  const basename = path.basename(localPath, extension);
  const hash = crypto.createHash('sha1').update(localPath).digest('hex').slice(0, 8);
  const targetFileName = `${basename}-${hash}${extension}`;
  const targetPath = path.join(assetsDir, targetFileName);

  fs.mkdirSync(assetsDir, {recursive: true});
  fs.copyFileSync(localPath, targetPath);

  return `studio-input/assets/${targetFileName}`;
};

const materializeProjectConfig = (payload) => {
  const assetsDir = defaultAssetsDir;

  return {
    ...payload,
    audioSrc: payload.audioSrc ? materializeAudioSource(payload.audioSrc, assetsDir) : payload.audioSrc,
    backgroundMusic: (payload.backgroundMusic ?? []).map((cue) => ({
      ...cue,
      src: materializeAudioSource(cue.src, assetsDir),
    })),
  };
};

const main = () => {
  const options = parseCliArgs();

  if (!fs.existsSync(options.input)) {
    throw new Error(`Studio input file not found: ${options.input}`);
  }

  const payload = materializeProjectConfig(loadJson(options.input));
  fs.mkdirSync(path.dirname(options.output), {recursive: true});
  fs.writeFileSync(options.output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote studio input manifest to ${options.output}`);
};

main();
