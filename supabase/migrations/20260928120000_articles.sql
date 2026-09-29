CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "locale" "text" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "dek" "text" NOT NULL,
    "cover_url" "text",
    "reading_minutes" smallint NOT NULL,
    "body" "jsonb" NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "articles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "articles_locale_slug_key" UNIQUE ("locale", "slug"),
    CONSTRAINT "articles_locale_check" CHECK (("locale" = ANY (ARRAY['pt'::"text", 'en'::"text"]))),
    CONSTRAINT "articles_slug_format_check" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')),
    CONSTRAINT "articles_reading_minutes_check" CHECK (("reading_minutes" > 0)),
    CONSTRAINT "articles_body_is_array_check" CHECK (("jsonb_typeof"("body") = 'array'::"text"))
);

ALTER TABLE "public"."articles" OWNER TO "postgres";

CREATE INDEX "articles_locale_published_at_idx" ON "public"."articles" USING "btree" ("locale", "published_at" DESC);

ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published articles" ON "public"."articles"
  FOR SELECT TO "anon", "authenticated"
  USING ((("published_at" IS NOT NULL) AND ("published_at" <= "now"())));

REVOKE ALL ON TABLE "public"."articles" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."articles" TO "anon", "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";

INSERT INTO "public"."articles" ("slug", "locale", "category", "title", "dek", "reading_minutes", "is_featured", "published_at", "body") VALUES
(
  'what-every-plant-needs', 'pt', 'Primeiros passos',
  'O que toda planta precisa pra ficar bem',
  'Luz, água na medida certa, um vaso que drena e um pouco de paciência. O resto é detalhe.',
  3, true, now(),
  $body$[
    {"type": "paragraph", "text": "A maioria das plantas de casa não morre por falta de cuidado, e sim por cuidado demais ou no lugar errado. Antes de pensar em adubo, borrifador ou vaso bonito, vale acertar o básico."},
    {"type": "heading", "text": "Luz indireta forte"},
    {"type": "paragraph", "text": "Perto de uma janela clara, mas sem o sol batendo direto nas folhas o dia todo. Se o caule estica em direção ao vidro ou as folhas novas saem pequenas e pálidas, a planta está pedindo mais luz."},
    {"type": "heading", "text": "Água quando a terra secar"},
    {"type": "paragraph", "text": "Enfie o dedo uns dois centímetros na terra. Se estiver seca, regue até a água sair pelo fundo do vaso. Se ainda estiver úmida, espere. Essa regra simples funciona melhor do que qualquer calendário fixo."},
    {"type": "tip", "text": "O vaso precisa de furo de drenagem. Sem ele, a água se acumula no fundo e apodrece a raiz, mesmo que você regue pouco."},
    {"type": "heading", "text": "Tempo pra se adaptar"},
    {"type": "paragraph", "text": "Planta nova costuma perder uma ou duas folhas nas primeiras semanas. É a adaptação à luz e à umidade da sua casa. Evite trocar de lugar toda hora e não adube nesse período."},
    {"type": "paragraph", "text": "No broto, os lembretes de rega e a análise de crescimento ajudam a acompanhar esse começo sem precisar decorar nada."}
  ]$body$::jsonb
),
(
  'what-every-plant-needs', 'en', 'Getting started',
  'What every plant needs to thrive',
  'Light, the right amount of water, a pot that drains and a little patience. Everything else is detail.',
  3, true, now(),
  $body$[
    {"type": "paragraph", "text": "Most houseplants don't die from neglect. They die from too much care, or care in the wrong place. Before thinking about fertilizer, misters or a pretty pot, get the basics right."},
    {"type": "heading", "text": "Strong indirect light"},
    {"type": "paragraph", "text": "Near a bright window, but without the sun hitting the leaves directly all day. If the stem stretches toward the glass or new leaves come out small and pale, the plant is asking for more light."},
    {"type": "heading", "text": "Water when the soil dries out"},
    {"type": "paragraph", "text": "Push a finger about two centimeters into the soil. If it's dry, water until it drains from the bottom of the pot. If it's still damp, wait. This simple rule works better than any fixed schedule."},
    {"type": "tip", "text": "The pot needs a drainage hole. Without one, water pools at the bottom and rots the roots, even if you water sparingly."},
    {"type": "heading", "text": "Time to adapt"},
    {"type": "paragraph", "text": "A new plant often drops a leaf or two in the first weeks. It's adjusting to the light and humidity in your home. Avoid moving it around and don't fertilize during this period."},
    {"type": "paragraph", "text": "In broto, watering reminders and growth check-ins help you follow this early stage without memorizing anything."}
  ]$body$::jsonb
),
(
  'common-beginner-mistakes', 'pt', 'Primeiros passos',
  'Três erros comuns de quem está começando',
  'Regar demais, demorar pra agir contra pragas e adubar a planta errada. Veja como evitar cada um.',
  3, false, now() - interval '1 minute',
  $body$[
    {"type": "paragraph", "text": "Quase todo mundo que começa a cuidar de plantas passa por esses três tropeços. A boa notícia é que todos têm solução simples."},
    {"type": "heading", "text": "Regar todo dia só pra garantir"},
    {"type": "paragraph", "text": "Raiz também precisa de ar. Terra encharcada o tempo todo sufoca a raiz, que começa a apodrecer. Os sinais aparecem nas folhas: amarelas, moles e caindo, mesmo com a terra molhada."},
    {"type": "tip", "text": "Na dúvida, espere mais um dia. É muito mais fácil salvar uma planta com sede do que uma planta afogada."},
    {"type": "heading", "text": "Ignorar os primeiros sinais de praga"},
    {"type": "paragraph", "text": "Pontinhos brancos, teias finas ou folhas grudentas costumam ser o começo de uma infestação. Quanto antes você perceber, mais fácil resolver. Separe a planta das outras e limpe as folhas."},
    {"type": "paragraph", "text": "Se ficar em dúvida sobre o que está vendo, o diagnóstico por foto ajuda a identificar o problema."},
    {"type": "heading", "text": "Adubar uma planta doente"},
    {"type": "paragraph", "text": "Adubo não é remédio. Numa planta fraca ou com a raiz danificada, ele pode queimar a raiz e piorar a situação. Primeiro descubra a causa, deixe a planta se recuperar e só depois volte a adubar."}
  ]$body$::jsonb
),
(
  'common-beginner-mistakes', 'en', 'Getting started',
  'Three common beginner mistakes',
  'Overwatering, waiting too long on pests and fertilizing the wrong plant. Here is how to avoid each one.',
  3, false, now() - interval '1 minute',
  $body$[
    {"type": "paragraph", "text": "Almost everyone who starts caring for plants trips over these three. The good news is that each one has a simple fix."},
    {"type": "heading", "text": "Watering every day just to be safe"},
    {"type": "paragraph", "text": "Roots need air too. Soil that stays soaked suffocates the roots, and they start to rot. The signs show up on the leaves: yellow, limp and dropping, even with wet soil."},
    {"type": "tip", "text": "When in doubt, wait one more day. A thirsty plant is much easier to save than a drowned one."},
    {"type": "heading", "text": "Ignoring the first signs of pests"},
    {"type": "paragraph", "text": "Tiny white dots, fine webbing or sticky leaves are often the start of an infestation. The sooner you notice, the easier it is to fix. Keep the plant away from the others and wipe the leaves."},
    {"type": "paragraph", "text": "If you're not sure what you're looking at, photo diagnosis can help identify the problem."},
    {"type": "heading", "text": "Fertilizing a sick plant"},
    {"type": "paragraph", "text": "Fertilizer isn't medicine. On a weak plant or one with damaged roots, it can burn the roots and make things worse. Find the cause first, let the plant recover, and only then start fertilizing again."}
  ]$body$::jsonb
),
(
  'what-plants-do-unseen', 'pt', 'Curiosidades',
  'O que as plantas fazem quando ninguém está olhando',
  'Elas se viram pra luz, dormem à noite e trocam nutrientes por baixo da terra.',
  2, false, now() - interval '2 minutes',
  $body$[
    {"type": "paragraph", "text": "Parece que as plantas só ficam paradas no vaso, mas elas estão sempre reagindo ao ambiente. Algumas dessas reações são tão lentas que a gente só percebe olhando com atenção."},
    {"type": "heading", "text": "Respiram meio ao contrário da gente"},
    {"type": "paragraph", "text": "Durante o dia, com a fotossíntese, as plantas absorvem gás carbônico e liberam oxigênio. É o caminho inverso da nossa respiração."},
    {"type": "heading", "text": "Se viram em direção à luz"},
    {"type": "paragraph", "text": "O caule e as folhas crescem na direção de onde vem a luz. Esse fenômeno se chama fototropismo, e é por isso que vale girar o vaso de vez em quando pra planta crescer por igual."},
    {"type": "heading", "text": "Algumas dormem"},
    {"type": "paragraph", "text": "Certas espécies, como a maranta, levantam e fecham as folhas à noite e abrem de novo pela manhã, como se estivessem dormindo."},
    {"type": "heading", "text": "Trocam nutrientes por baixo da terra"},
    {"type": "paragraph", "text": "Raízes de plantas diferentes podem se ligar por redes de fungos e trocar nutrientes através delas. É uma espécie de conexão subterrânea entre as plantas de um mesmo lugar."}
  ]$body$::jsonb
),
(
  'what-plants-do-unseen', 'en', 'Trivia',
  'What plants do when no one is looking',
  'They turn toward the light, sleep at night and trade nutrients underground.',
  2, false, now() - interval '2 minutes',
  $body$[
    {"type": "paragraph", "text": "Plants seem to just sit in their pots, but they are always reacting to their surroundings. Some of these reactions are so slow you only notice them if you look closely."},
    {"type": "heading", "text": "They breathe almost the opposite of us"},
    {"type": "paragraph", "text": "During the day, through photosynthesis, plants absorb carbon dioxide and release oxygen. It's the reverse of how we breathe."},
    {"type": "heading", "text": "They turn toward the light"},
    {"type": "paragraph", "text": "Stems and leaves grow in the direction the light comes from. This is called phototropism, and it's why rotating the pot now and then helps the plant grow evenly."},
    {"type": "heading", "text": "Some of them sleep"},
    {"type": "paragraph", "text": "Certain species, like the prayer plant, raise and fold their leaves at night and open them again in the morning, as if they were sleeping."},
    {"type": "heading", "text": "They trade nutrients underground"},
    {"type": "paragraph", "text": "The roots of different plants can connect through fungal networks and exchange nutrients through them. It's a kind of underground link between plants growing in the same place."}
  ]$body$::jsonb
),
(
  'why-have-plants-at-home', 'pt', 'Bem-estar',
  'Por que vale a pena ter plantas em casa',
  'Menos pressa, uma rotina gostosa e a satisfação de ver algo crescer por causa de você.',
  2, false, now() - interval '3 minutes',
  $body$[
    {"type": "paragraph", "text": "Ter plantas em casa vai além da decoração. Cuidar delas muda um pouco o ritmo do dia."},
    {"type": "heading", "text": "Menos estresse"},
    {"type": "paragraph", "text": "Regar, limpar uma folha, reparar se saiu broto novo. São tarefas pequenas que pedem atenção ao presente e ajudam a desacelerar."},
    {"type": "heading", "text": "Uma rotina que faz bem"},
    {"type": "paragraph", "text": "Plantas pedem constância, não perfeição. O hábito de dar uma olhada nelas algumas vezes por semana traz uma rotina leve e previsível."},
    {"type": "heading", "text": "Um ambiente mais agradável"},
    {"type": "paragraph", "text": "As plantas liberam umidade pelas folhas e deixam o ambiente mais bonito e acolhedor. Não substituem a janela aberta, mas somam."},
    {"type": "heading", "text": "Ver o resultado do seu cuidado"},
    {"type": "paragraph", "text": "Cada folha nova é a planta respondendo ao que você fez por ela. Acompanhar esse crescimento com fotos ao longo do tempo é uma das partes mais gostosas de cuidar de plantas."}
  ]$body$::jsonb
),
(
  'why-have-plants-at-home', 'en', 'Wellbeing',
  'Why plants are worth having at home',
  'Less rush, a pleasant routine and the satisfaction of watching something grow because of you.',
  2, false, now() - interval '3 minutes',
  $body$[
    {"type": "paragraph", "text": "Having plants at home goes beyond decoration. Caring for them changes the pace of your day a little."},
    {"type": "heading", "text": "Less stress"},
    {"type": "paragraph", "text": "Watering, wiping a leaf, noticing a new shoot. These small tasks ask for attention to the present and help you slow down."},
    {"type": "heading", "text": "A routine that feels good"},
    {"type": "paragraph", "text": "Plants ask for consistency, not perfection. Checking on them a few times a week builds a light, predictable routine."},
    {"type": "heading", "text": "A nicer space"},
    {"type": "paragraph", "text": "Plants release moisture through their leaves and make a room feel more welcoming. They don't replace an open window, but they add to it."},
    {"type": "heading", "text": "Seeing the result of your care"},
    {"type": "paragraph", "text": "Every new leaf is the plant responding to what you did for it. Following that growth with photos over time is one of the best parts of caring for plants."}
  ]$body$::jsonb
);
