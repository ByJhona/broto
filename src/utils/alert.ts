export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

type AlertHandler = (title: string, message?: string, buttons?: AlertButton[]) => void;

let handler: AlertHandler | null = null;

export function registerAlertHandler(fn: AlertHandler | null) {
  handler = fn;
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    handler?.(title, message, buttons);
  },
};
