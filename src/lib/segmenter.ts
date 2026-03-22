import {SpeechChunkingConfig, TimedSegment, TimedWord} from './types';

export const defaultChunkingConfig: SpeechChunkingConfig = {
  maxCharsPerCaption: 14,
  breakOnPunctuation: true,
  punctuationChars: ['，', '。', '！', '？', ',', '.', '!', '?', ';', '；', ':', '：'],
  mergeShortTail: true,
  pauseThresholdMs: 360,
  breakOnPause: true,
  minCharsPerCaption: 4,
};

const getTextLength = (text: string) => Array.from(text).length;

const endsWithPunctuation = (text: string, config: SpeechChunkingConfig) => {
  return config.punctuationChars.some((character) => text.endsWith(character));
};

const getPauseDuration = (previousWord: TimedWord | undefined, nextWord: TimedWord) => {
  if (!previousWord) {
    return 0;
  }

  return Math.max(0, nextWord.startMs - previousWord.endMs);
};

export const chunkWordsToSegments = (
  words: TimedWord[],
  partialConfig?: Partial<SpeechChunkingConfig>,
): TimedSegment[] => {
  const config: SpeechChunkingConfig = {
    ...defaultChunkingConfig,
    ...partialConfig,
  };

  if (words.length === 0) {
    return [];
  }

  const segments: TimedSegment[] = [];
  let currentWords: TimedWord[] = [];
  let previousWord: TimedWord | undefined;

  const flush = () => {
    if (currentWords.length === 0) {
      return;
    }

    const text = currentWords.map((word) => word.text).join('');
    segments.push({
      id: `seg-${segments.length + 1}`,
      text,
      startMs: currentWords[0].startMs,
      endMs: currentWords[currentWords.length - 1].endMs,
    });
    currentWords = [];
  };

  for (const word of words) {
    const pauseDuration = getPauseDuration(previousWord, word);
    const nextWords = [...currentWords, word];
    const nextText = nextWords.map((item) => item.text).join('');
    const currentText = currentWords.map((item) => item.text).join('');
    const reachedMinLength = getTextLength(currentText) >= config.minCharsPerCaption;

    if (
      currentWords.length > 0 &&
      config.breakOnPause &&
      pauseDuration >= config.pauseThresholdMs &&
      reachedMinLength
    ) {
      flush();
    }

    if (currentWords.length > 0 && getTextLength(nextText) > config.maxCharsPerCaption) {
      flush();
    }

    currentWords.push(word);
    previousWord = word;

    if (config.breakOnPunctuation && endsWithPunctuation(word.text, config)) {
      flush();
    }
  }

  flush();

  if (!config.mergeShortTail || segments.length < 2) {
    return segments;
  }

  const tail = segments[segments.length - 1];
  if (getTextLength(tail.text) > Math.floor(config.maxCharsPerCaption / 2)) {
    return segments;
  }

  const previous = segments[segments.length - 2];

  return [
    ...segments.slice(0, -2),
    {
      id: previous.id,
      text: `${previous.text}${tail.text}`,
      startMs: previous.startMs,
      endMs: tail.endMs,
    },
  ];
};
