INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('articles', 'articles', true)
ON CONFLICT ("id") DO NOTHING;

CREATE FUNCTION pg_temp.article_image(path text, caption text) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'type', 'image',
    'url', 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/' || path,
    'caption', caption
  )
$$;

CREATE FUNCTION pg_temp.article_cover(path text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT 'https://qjooaimeitfrlficipgp.supabase.co/storage/v1/object/public/articles/' || path
$$;

UPDATE "public"."articles" SET
  "cover_url" = pg_temp.article_cover('what-every-plant-needs/cover.jpg'),
  "body" = jsonb_insert(jsonb_insert(jsonb_insert("body",
    '{5}', pg_temp.article_image('what-every-plant-needs/pot.jpg', 'Na hora de plantar, escolha um vaso com furo no fundo.'), true),
    '{4}', pg_temp.article_image('what-every-plant-needs/watering.jpg', 'Regue até a água escorrer pelo fundo e descarte o que sobrar no pratinho.'), true),
    '{2}', pg_temp.article_image('what-every-plant-needs/light.jpg', 'Perto da janela, mas sem sol batendo direto nas folhas o dia todo.'), true)
WHERE "slug" = 'what-every-plant-needs' AND "locale" = 'pt';

UPDATE "public"."articles" SET
  "cover_url" = pg_temp.article_cover('what-every-plant-needs/cover.jpg'),
  "body" = jsonb_insert(jsonb_insert(jsonb_insert("body",
    '{5}', pg_temp.article_image('what-every-plant-needs/pot.jpg', 'When potting, choose a pot with a drainage hole.'), true),
    '{4}', pg_temp.article_image('what-every-plant-needs/watering.jpg', 'Water until it drains from the bottom, then empty the saucer.'), true),
    '{2}', pg_temp.article_image('what-every-plant-needs/light.jpg', 'Near the window, but without direct sun on the leaves all day.'), true)
WHERE "slug" = 'what-every-plant-needs' AND "locale" = 'en';

UPDATE "public"."articles" SET
  "cover_url" = pg_temp.article_cover('common-beginner-mistakes/cover.jpg'),
  "body" = jsonb_insert(jsonb_insert(jsonb_insert("body",
    '{8}', pg_temp.article_image('common-beginner-mistakes/roots.jpg', 'Antes de adubar, olhe a raiz: saudável é firme e clara, podre fica escura e mole.'), true),
    '{5}', pg_temp.article_image('common-beginner-mistakes/mealybug.jpg', 'Cochonilha: parece um algodãozinho branco grudado nas folhas e no caule.'), true),
    '{2}', pg_temp.article_image('common-beginner-mistakes/yellow-leaf.jpg', 'Folhas amarelas e moles com a terra molhada costumam indicar excesso de água.'), true)
WHERE "slug" = 'common-beginner-mistakes' AND "locale" = 'pt';

UPDATE "public"."articles" SET
  "cover_url" = pg_temp.article_cover('common-beginner-mistakes/cover.jpg'),
  "body" = jsonb_insert(jsonb_insert(jsonb_insert("body",
    '{8}', pg_temp.article_image('common-beginner-mistakes/roots.jpg', 'Before fertilizing, check the roots: healthy ones are firm and light, rotten ones turn dark and mushy.'), true),
    '{5}', pg_temp.article_image('common-beginner-mistakes/mealybug.jpg', 'Mealybugs look like tiny bits of white cotton stuck to leaves and stems.'), true),
    '{2}', pg_temp.article_image('common-beginner-mistakes/yellow-leaf.jpg', 'Yellow, limp leaves on wet soil usually point to overwatering.'), true)
WHERE "slug" = 'common-beginner-mistakes' AND "locale" = 'en';

UPDATE "public"."articles" SET
  "cover_url" = pg_temp.article_cover('what-plants-do-unseen/cover.jpg'),
  "body" = jsonb_insert(jsonb_insert(jsonb_insert("body",
    '{8}', pg_temp.article_image('what-plants-do-unseen/roots.jpg', 'Debaixo da terra, as raízes se conectam por redes de fungos.'), true),
    '{6}', pg_temp.article_image('what-plants-do-unseen/calathea.jpg', 'As calateias, parentes da maranta, também fecham as folhas quando anoitece.'), true),
    '{4}', pg_temp.article_image('what-plants-do-unseen/window.jpg', 'Perto da janela, caules e folhas crescem na direção da luz.'), true)
WHERE "slug" = 'what-plants-do-unseen' AND "locale" = 'pt';

UPDATE "public"."articles" SET
  "cover_url" = pg_temp.article_cover('what-plants-do-unseen/cover.jpg'),
  "body" = jsonb_insert(jsonb_insert(jsonb_insert("body",
    '{8}', pg_temp.article_image('what-plants-do-unseen/roots.jpg', 'Underground, roots connect through fungal networks.'), true),
    '{6}', pg_temp.article_image('what-plants-do-unseen/calathea.jpg', 'Calatheas, relatives of the prayer plant, also fold their leaves at night.'), true),
    '{4}', pg_temp.article_image('what-plants-do-unseen/window.jpg', 'Near a window, stems and leaves grow toward the light.'), true)
WHERE "slug" = 'what-plants-do-unseen' AND "locale" = 'en';

UPDATE "public"."articles" SET
  "cover_url" = pg_temp.article_cover('why-have-plants-at-home/cover.jpg'),
  "body" = jsonb_insert(jsonb_insert("body",
    '{8}', pg_temp.article_image('why-have-plants-at-home/new-leaf.jpg', 'Uma folha nova se abrindo é a planta respondendo ao seu cuidado.'), true),
    '{2}', pg_temp.article_image('why-have-plants-at-home/watering.jpg', 'Regar e reparar nas folhas é uma pausa pequena no meio do dia.'), true)
WHERE "slug" = 'why-have-plants-at-home' AND "locale" = 'pt';

UPDATE "public"."articles" SET
  "cover_url" = pg_temp.article_cover('why-have-plants-at-home/cover.jpg'),
  "body" = jsonb_insert(jsonb_insert("body",
    '{8}', pg_temp.article_image('why-have-plants-at-home/new-leaf.jpg', 'A new leaf unfurling is the plant responding to your care.'), true),
    '{2}', pg_temp.article_image('why-have-plants-at-home/watering.jpg', 'Watering and checking the leaves is a small pause in the middle of the day.'), true)
WHERE "slug" = 'why-have-plants-at-home' AND "locale" = 'en';
