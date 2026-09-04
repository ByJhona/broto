import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';

export async function getAuthenticatedUser(
  req: Request
): Promise<{ userClient: SupabaseClient; user: User } | null> {
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) return null;

  return { userClient, user };
}
