const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qjooaimeitfrlficipgp.supabase.co',
  'sb_publishable_H5rfHHg-Oab-2cpDPJis-A_mPw6PJ4e'
);

async function main() {
  const { data, error } = await supabase.from('articles').select('*');
  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }
  console.log('Articles:', JSON.stringify(data, null, 2));
}

main();
