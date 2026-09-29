type LevelUpHandler = (level: number) => void;

let handler: LevelUpHandler | null = null;

export function registerLevelUpHandler(fn: LevelUpHandler | null) {
  handler = fn;
}

export const LevelUp = {
  show(level: number) {
    handler?.(level);
  },
};
