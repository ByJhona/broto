import type { PostgrestError } from '@supabase/supabase-js';

export class WriteNotAppliedError extends Error {
  constructor() {
    super('WRITE_NOT_APPLIED');
    this.name = 'WriteNotAppliedError';
  }
}

type WriteResult = {
  error: PostgrestError | null;
  count: number | null;
};

export function ensureWriteApplied({ error, count }: WriteResult): void {
  if (error) throw error;
  if (!count) throw new WriteNotAppliedError();
}
