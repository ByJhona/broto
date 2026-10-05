export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

export type AlertOptions = {
  onDismiss?: () => void;
};

type AlertHandler = (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => void;

let handler: AlertHandler | null = null;

export function registerAlertHandler(fn: AlertHandler | null) {
  handler = fn;
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    handler?.(title, message, buttons, options);
  },
};

export function closeAlertButton(t: (key: string) => string): AlertButton {
  return { text: t('common:close'), style: 'cancel' };
}
