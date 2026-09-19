import { requireLogin } from './authGate';
import { registerAlertHandler, type AlertButton } from './alert';

function makeRouter() {
  return { push: jest.fn() } as unknown as Parameters<typeof requireLogin>[0];
}

describe('requireLogin', () => {
  afterEach(() => {
    registerAlertHandler(null);
  });

  it('allows the action through and shows nothing when already authenticated', () => {
    const alertHandler = jest.fn();
    registerAlertHandler(alertHandler);
    const router = makeRouter();

    const allowed = requireLogin(router, true, 'faça login pra continuar');

    expect(allowed).toBe(true);
    expect(alertHandler).not.toHaveBeenCalled();
  });

  it('blocks the action and prompts to sign in when not authenticated', () => {
    const alertHandler = jest.fn();
    registerAlertHandler(alertHandler);
    const router = makeRouter();

    const allowed = requireLogin(router, false, 'faça login pra continuar');

    expect(allowed).toBe(false);
    expect(alertHandler).toHaveBeenCalledTimes(1);
    const [, message] = alertHandler.mock.calls[0];
    expect(message).toBe('faça login pra continuar');
  });

  it('navigates to login when the user taps the sign-in button', () => {
    const alertHandler = jest.fn();
    registerAlertHandler(alertHandler);
    const router = makeRouter();

    requireLogin(router, false, 'faça login pra continuar');

    const [, , buttons] = alertHandler.mock.calls[0] as [string, string, AlertButton[]];
    const signInButton = buttons.find((button) => button.style !== 'cancel');
    signInButton?.onPress?.();

    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });
});
