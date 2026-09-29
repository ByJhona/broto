import { hasFieldErrors, validateEmailOnly, validateLogin, validateNewPassword, validateSignup } from './authValidation';

const t = (key: string) => key;

describe('validateLogin', () => {
  it('flags each missing field on its own', () => {
    const errors = validateLogin({ email: '', password: '' }, t);

    expect(errors.email).toBe('auth:emailRequired');
    expect(errors.password).toBe('auth:passwordRequired');
  });

  it('rejects a malformed email and nothing else', () => {
    const errors = validateLogin({ email: 'maria@', password: 'segredo' }, t);

    expect(errors.email).toBe('auth:emailInvalid');
    expect(errors.password).toBeUndefined();
  });

  it('accepts a filled, well-formed login even with surrounding spaces', () => {
    expect(hasFieldErrors(validateLogin({ email: '  maria@email.com ', password: 'segredo' }, t))).toBe(false);
  });
});

describe('email format', () => {
  it('accepts common addresses and rejects incomplete ones', () => {
    expect(validateEmailOnly('maria@email.com.br', t).email).toBeUndefined();
    expect(validateEmailOnly('maria.souza@email.com', t).email).toBeUndefined();
    expect(validateEmailOnly('maria@email', t).email).toBe('auth:emailInvalid');
    expect(validateEmailOnly('maria@.com', t).email).toBe('auth:emailInvalid');
    expect(validateEmailOnly('maria @email.com', t).email).toBe('auth:emailInvalid');
  });
});

describe('validateSignup', () => {
  it('requires a name, a valid email and a password of at least 6 characters', () => {
    const errors = validateSignup({ name: '  ', email: 'x', password: '123' }, t);

    expect(errors.name).toBe('auth:nameRequired');
    expect(errors.email).toBe('auth:emailInvalid');
    expect(errors.password).toBe('auth:passwordMinLength');
  });

  it('accepts a complete signup', () => {
    expect(hasFieldErrors(validateSignup({ name: 'Maria', email: 'maria@email.com', password: '123456' }, t))).toBe(false);
  });
});

describe('validateNewPassword', () => {
  it('only checks the minimum length', () => {
    expect(validateNewPassword('12345', t).password).toBe('auth:passwordMinLength');
    expect(hasFieldErrors(validateNewPassword('123456', t))).toBe(false);
  });
});
