import type { AlertButton } from './alert';

type ActionSheetHandler = (title: string, buttons: AlertButton[]) => void;

let handler: ActionSheetHandler | null = null;

export function registerActionSheetHandler(fn: ActionSheetHandler | null) {
  handler = fn;
}

export const ActionSheet = {
  show(title: string, buttons: AlertButton[]) {
    handler?.(title, buttons);
  },
};
