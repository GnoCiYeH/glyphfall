export const defaultEnterEasing = [0.22, 1, 0.36, 1] as const;

export const applyCubicBezierEasing = (
  progress: number,
  easing: readonly [number, number, number, number],
) => {
  const [, y1, , y2] = easing;
  const t = Math.min(1, Math.max(0, progress));
  const inverseT = 1 - t;

  return 3 * inverseT * inverseT * t * y1 + 3 * inverseT * t * t * y2 + t * t * t;
};
