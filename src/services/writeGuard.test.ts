import type { PostgrestError } from '@supabase/supabase-js';
import { ensureWriteApplied, WriteNotAppliedError } from './writeGuard';

describe('ensureWriteApplied', () => {
  it('passes when the database confirms the row changed', () => {
    expect(() => ensureWriteApplied({ error: null, count: 1 })).not.toThrow();
  });

  it('fails when row level security silently skipped the row', () => {
    expect(() => ensureWriteApplied({ error: null, count: 0 })).toThrow(WriteNotAppliedError);
    expect(() => ensureWriteApplied({ error: null, count: null })).toThrow(WriteNotAppliedError);
  });

  it('rethrows the database error', () => {
    const error = { message: 'boom', details: '', hint: '', code: '42501', name: 'PostgrestError' } as PostgrestError;
    expect(() => ensureWriteApplied({ error, count: null })).toThrow(error);
  });
});
