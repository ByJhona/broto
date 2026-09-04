export type ToastType = 'success' | 'error' | 'info';

type ToastHandler = (message: string, type: ToastType) => void;

let handler: ToastHandler | null = null;

export function registerToastHandler(fn: ToastHandler | null) {
  handler = fn;
}

export const Toast = {
  show(message: string, type: ToastType = 'info') {
    handler?.(message, type);
  },
  success(message: string) {
    handler?.(message, 'success');
  },
  error(message: string) {
    handler?.(message, 'error');
  },
  info(message: string) {
    handler?.(message, 'info');
  },
};
