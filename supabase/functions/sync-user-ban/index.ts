import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { corsResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PERMANENT_BAN_HOURS = 876000;
const HOUR_MS = 3_600_000;

type ActivePenalty = { kind: 'suspension' | 'ban'; ends_at: string | null };

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function activeLoginPenalties(userId: string): Promise<ActivePenalty[]> {
  const { data, error } = await supabaseAdmin
    .from('user_penalties')
    .select('kind, ends_at')
    .eq('user_id', userId)
    .in('kind', ['suspension', 'ban'])
    .is('revoked_at', null)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
  if (error) throw error;
  return data as ActivePenalty[];
}

function banDuration(penalties: ActivePenalty[]): string {
  if (penalties.length === 0) return 'none';
  if (penalties.some((penalty) => penalty.ends_at === null)) return `${PERMANENT_BAN_HOURS}h`;
  const latestEnd = Math.max(...penalties.map((penalty) => new Date(penalty.ends_at!).getTime()));
  return `${Math.ceil((latestEnd - Date.now()) / HOUR_MS)}h`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse('ok', 200);
  }
  if (req.method !== 'POST') {
    return corsResponse('Method not allowed', 405);
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return corsResponse('Unauthorized', 401);
  }

  const { userId } = await req.json().catch(() => ({}));
  if (typeof userId !== 'string') {
    return corsResponse('Bad request', 400);
  }

  try {
    const { data: role, error: roleError } = await auth.userClient.rpc('get_my_role');
    if (roleError) throw roleError;
    if (!role) {
      return corsResponse('Forbidden', 403);
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: banDuration(await activeLoginPenalties(userId)),
    });
    if (error) throw error;
  } catch (error) {
    console.error('Erro sincronizando o bloqueio de login:', error);
    return corsResponse('Internal error', 500);
  }

  return corsResponse('OK', 200);
});
