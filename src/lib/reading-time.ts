const WORDS_PER_MINUTE = 225;

export function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function readingTimeISO(minutes: number): string {
  return `PT${Math.max(1, minutes)}M`;
}
