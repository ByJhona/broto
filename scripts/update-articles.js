const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qjooaimeitfrlficipgp.supabase.co',
  'sb_publishable_H5rfHHg-Oab-2cpDPJis-A_mPw6PJ4e'
);

async function main() {
  const { data: articles, error } = await supabase.from('articles').select('id, slug, title, locale');
  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  console.log(`Found ${articles.length} articles. Updating cover_urls...`);

  for (const article of articles) {
    // We create a prompt based on the slug to get a contextual image
    const contextMap = {
      'what-plants-do-unseen': 'beautiful close up photography of a vibrant green plant leaf glowing in the sun',
      'why-have-plants-at-home': 'beautiful photography of cozy sunny living room filled with lush green house plants',
      'plant-care-myths': 'beautiful photography of someone gently watering a small potted plant on a wooden table',
    };

    const basePrompt = contextMap[article.slug] || `beautiful photography of ${article.slug.replace(/-/g, ' ')} plant`;
    
    const coverUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(basePrompt)}?width=800&height=600&nologo=true`;

    const { error: updateError } = await supabase
      .from('articles')
      .update({ cover_url: coverUrl })
      .eq('id', article.id);

    if (updateError) {
      console.error(`Error updating article ${article.id}:`, updateError);
    } else {
      console.log(`Updated [${article.locale}] ${article.slug} -> ${coverUrl}`);
    }
  }

  console.log('Finished updating all articles!');
}

main();
