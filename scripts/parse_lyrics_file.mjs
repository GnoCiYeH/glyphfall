import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const defaultInput = path.join(rootDir, 'examples', 'lyrics-demo.lrc');
const defaultOutput = path.join(rootDir, 'examples', 'lyrics-demo.json');

const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    input: defaultInput,
    output: defaultOutput,
    audio: 'music/game-bgm.ogg',
    outputVideoName: 'lyrics-demo',
    lastDurationMs: 3200,
    minStartMs: 0,
    layoutSequence: ['ccw', 'cw', 'up'],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--input' && next) {
      options.input = path.resolve(rootDir, next);
      index += 1;
      continue;
    }

    if (arg === '--output' && next) {
      options.output = path.resolve(rootDir, next);
      index += 1;
      continue;
    }

    if (arg === '--audio' && next) {
      options.audio = next;
      index += 1;
      continue;
    }

    if (arg === '--output-video-name' && next) {
      options.outputVideoName = next;
      index += 1;
      continue;
    }

    if (arg === '--last-duration-ms' && next) {
      options.lastDurationMs = Math.max(300, Number(next) || 3200);
      index += 1;
      continue;
    }

    if (arg === '--min-start-ms' && next) {
      options.minStartMs = Math.max(0, Number(next) || 0);
      index += 1;
      continue;
    }

    if (arg === '--layout-sequence' && next) {
      options.layoutSequence = next
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
    }
  }

  return options;
};

const parseTimestampMs = (value) => {
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = match[3] ?? '0';
  const milliseconds = Number(fraction.padEnd(3, '0').slice(0, 3));
  return (minutes * 60 + seconds) * 1000 + milliseconds;
};

const parseLrc = (contents, options) => {
  const entries = [];
  const lines = contents.split(/\r\n|\r|\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const tagPattern = /\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]/g;
    const timestamps = [...trimmed.matchAll(tagPattern)].map((match) => parseTimestampMs(match[1]));
    const text = trimmed.replace(tagPattern, '').trim();

    if (!timestamps.length || !text) {
      continue;
    }

    for (const timestamp of timestamps) {
      if (timestamp === null) {
        continue;
      }

      entries.push({
        startMs: timestamp,
        text,
      });
    }
  }

  entries.sort((left, right) => left.startMs - right.startMs);
  return {
    entries: entries.filter((entry) => entry.startMs >= options.minStartMs),
  };
};

const buildProjectConfig = ({entries}, options) => {
  if (entries.length === 0) {
    throw new Error('No timed lyric lines found in the input file.');
  }

  const captions = entries.map((entry, index) => ({
    id: `lyric-${index + 1}`,
    text: entry.text,
    utteranceId: `lyric-utterance-${index + 1}`,
    layoutKey: options.layoutSequence[index % options.layoutSequence.length] ?? 'ccw',
  }));
  const utterances = entries.map((entry, index) => ({
    id: `lyric-utterance-${index + 1}`,
    text: entry.text,
  }));

  const timings = entries.map((entry, index) => {
    const nextStartMs = entries[index + 1]?.startMs;
    return {
      startMs: entry.startMs,
      endMs: nextStartMs ?? entry.startMs + options.lastDurationMs,
    };
  });

  return {
    fps: 30,
    width: 1080,
    height: 1920,
    tailHoldFrames: 54,
    backgroundColor: '#09090b',
    outputVideoName: options.outputVideoName,
    layoutSequence: options.layoutSequence,
    backgroundMusic: [
      {
        src: options.audio,
        startMs: 0,
        volume: 0.28,
        fadeInMs: 900,
        fadeOutMs: 1400,
      },
    ],
    audioMix: {
      ducking: {
        enabled: false,
        volumeMultiplier: 0.4,
        attackMs: 180,
        releaseMs: 260,
      },
    },
    debug: {
      showContainerBounds: false,
      showCaptionBounds: false,
    },
    visuals: {
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
    },
    effects: {
      captionSettle: {
        enabled: false,
        preset: 'outline-pop',
        durationFrames: 12,
        intensity: 0.22,
        color: '#f8fafc',
      },
      glyphAssemble: {
        enabled: false,
        preset: 'content-slices',
        durationFrames: 20,
        rows: 3,
        cols: 5,
        scatter: 24,
        rotation: 22,
        textRevealStart: 0.62,
        textRevealEnd: 0.96,
      },
    },
    layoutMap: {
      ccw: {
        mode: 'rotate_ccw_90',
        enterDurationFrames: 18,
        containerTransitionFrames: 14,
        scaleFactor: 1.08,
      },
      cw: {
        mode: 'rotate_cw_90',
        enterDurationFrames: 18,
        containerTransitionFrames: 14,
        scaleFactor: 0.92,
      },
      up: {
        mode: 'translate_up',
        enterDurationFrames: 18,
        containerTransitionFrames: 12,
        scaleFactor: 1.04,
      },
    },
    utterances,
    captions,
    timings,
  };
};

const main = () => {
  const options = parseCliArgs();
  const contents = fs.readFileSync(options.input, 'utf8');
  const parsed = parseLrc(contents, options);
  const payload = buildProjectConfig(parsed, options);

  fs.mkdirSync(path.dirname(options.output), {recursive: true});
  fs.writeFileSync(options.output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote lyrics demo config to ${options.output}`);
};

main();
