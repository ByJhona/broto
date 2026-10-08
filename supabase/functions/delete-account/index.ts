import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY');

const USER_BUCKETS = ['avatars', 'chat-photos', 'plant-photos', 'posts'];
const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listFolderPage(bucket: string, folder: string, offset: number) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, { limit: LIST_PAGE_SIZE, offset });
  if (error) throw error;
  return data;
}

async function listFiles(bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const items = await listFolderPage(bucket, folder, offset);
    for (const item of items) {
      const path = `${folder}/${item.name}`;
      if (item.id) paths.push(path);
      else paths.push(...(await listFiles(bucket, path)));
    }
    if (items.length < LIST_PAGE_SIZE) return paths;
  }
}

async function removeUserFiles(bucket: string, userId: string): Promise<void> {
  const paths = await listFiles(bucket, userId);
  for (let start = 0; start < paths.length; start += REMOVE_BATCH_SIZE) {
    const { error } = await supabaseAdmin.storage.from(bucket).remove(paths.slice(start, start + REMOVE_BATCH_SIZE));
    if (error) throw error;
  }
}

async function deleteRevenueCatCustomer(userId: string): Promise<void> {
  if (!REVENUECAT_SECRET_API_KEY) return;
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}` },
  });
  if (!response.ok && response.status !== 404) {
    console.error(`RevenueCat respondeu ${response.status} ao excluir o cliente:`, await response.text());
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = auth.user.id;

  try {
    for (const bucket of USER_BUCKETS) {
      await removeUserFiles(bucket, userId);
    }
    await deleteRevenueCatCustomer(userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
  } catch (error) {
    console.error('Erro excluindo a conta:', error);
    return new Response('Internal error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});
