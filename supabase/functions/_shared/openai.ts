import OpenAI from 'npm:openai';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function callOpenAI(body: Record<string, unknown>): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-5.6-luna',
    ...(body as any),
  });

  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('A OpenAI não retornou nenhum conteúdo.');
  }

  return content;
}
