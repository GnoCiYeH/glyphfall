import {SpeechChunkingConfig, TimedSegment, TimedWord} from './types';

export const defaultChunkingConfig: SpeechChunkingConfig = {
  maxCharsPerCaption: 14,
  breakOnPunctuation: true,
  punctuationChars: ['，', '。', '！', '？', ',', '.', '!', '?', ';', '；', ':', '：'],
  mergeShortTail: true,
};

const getTextLength = (text: string) => Array.from(text).length;

const endsWithPunctuation = (text: string, config: SpeechChunkingConfig) => {
  return config.punctuationChars.some((character) => text.endsWith(character));
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
    const nextWords = [...currentWords, word];
    const nextText = nextWords.map((item) => item.text).join('');

    if (currentWords.length > 0 && getTextLength(nextText) > config.maxCharsPerCaption) {
      flush();
    }

    currentWords.push(word);

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
