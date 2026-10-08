import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { corsResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PERMANENT_BAN_HOURS = 876000;
const MAX_SUSPENSION_DAYS = 3650;

type AppRole = 'moderator' | 'admin';

type ModerateUserRequest = {
  userId: string;
  action: 'suspend' | 'unsuspend';
  days: number | null;
  reason: string | null;
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parseRequest(body: Record<string, unknown>): ModerateUserRequest | null {
  const { userId, action, days = null, reason = null } = body;
  if (typeof userId !== 'string' || (action !== 'suspend' && action !== 'unsuspend')) return null;
  if (days !== null && (!Number.isInteger(days) || (days as number) < 1 || (days as number) > MAX_SUSPENSION_DAYS)) return null;
  if (reason !== null && typeof reason !== 'string') return null;
  return { userId, action, days: days as number | null, reason: reason as string | null };
}

async function roleOf(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.role as AppRole | undefined) ?? null;
}

function canModerate(moderatorRole: AppRole, targetRole: AppRole | null): boolean {
  if (targetRole === null) return true;
  return moderatorRole === 'admin' && targetRole === 'moderator';
}

function banDuration(request: ModerateUserRequest): string {
  if (request.action === 'unsuspend') return 'none';
  const hours = request.days === null ? PERMANENT_BAN_HOURS : request.days * 24;
  return `${hours}h`;
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

  const request = parseRequest(await req.json().catch(() => ({})));
  if (!request || request.userId === auth.user.id) {
    return corsResponse('Bad request', 400);
  }

  try {
    const moderatorRole = await roleOf(auth.user.id);
    if (!moderatorRole || !canModerate(moderatorRole, await roleOf(request.userId))) {
      return corsResponse('Forbidden', 403);
    }

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(request.userId, {
      ban_duration: banDuration(request),
    });
    if (banError) throw banError;

    const { error: logError } = await supabaseAdmin.from('moderation_actions').insert({
      moderator_id: auth.user.id,
      action: request.action === 'suspend' ? 'suspend_user' : 'unsuspend_user',
      target_user_id: request.userId,
      reason: request.reason,
      details: request.action === 'suspend' ? { days: request.days } : {},
    });
    if (logError) throw logError;
  } catch (error) {
    console.error('Erro moderando o usuário:', error);
    return corsResponse('Internal error', 500);
  }

  return corsResponse('OK', 200);
});
