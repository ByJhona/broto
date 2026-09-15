# Emblemas (badges) — status e primeiro lote

## Onde isso está hoje

Estrutura já implementada e no ar (migration `20260101009100_badges_structure.sql`):

- `badge_batches` — lotes/coleções de emblemas.
- `badges` — catálogo (`pixel_art` em `jsonb`, formato paleta indexada: `{ size, palette: (string|null)[], pixels: number[] }`, pronto pra um futuro editor "desenhe seu emblema").
- `user_badges` — quem tem o quê, leitura pública (perfil de qualquer usuário mostra os selos dele pros outros).
- `grant_badge(user_id, badge_id, source)` — função `security definer`, único portão de entrada pra conceder emblema, idempotente. Nenhuma regra de negócio automática (código de resgate, recarga de crédito, assinatura) foi implementada ainda — fica pra depois, só a função-gate está pronta.
- `PixelBadge` (`src/components/PixelBadge.tsx`) — desenha qualquer emblema via `react-native-svg`.
- Já conectado na tela de perfil (`src/app/profile/[id].tsx`) — seção "Emblemas" abaixo do cabeçalho, some sozinha se o usuário não tiver nenhum.

Resolução: **32×32**. Primeiro lote já inserido no banco (migration `20260101009300_insert_first_badge_batch.sql`): lote `plantas-populares` ("Plantas Populares") com os 20 emblemas abaixo, pixel art gerada proceduralmente (copa/flor/cacto por espécie, vaso com cor variando entre os emblemas) e conferida visualmente antes de gravar.

O script que gerou essa pixel art está em `scripts/generate-badges.mjs` (roda com `node scripts/generate-badges.mjs`, sem dependências além do Node) — reaproveitável pra montar o próximo lote: edita a lista de espécies/receitas de desenho, roda, confere o `scripts/badges-preview.png` gerado, e gera o INSERT pra migration a partir do `badges-data.json` resultante.

## Decisão de organização: por espécie, não por família

Cheguei a recomendar organizar por família botânica (~10 famílias cobririam 84% do que já foi identificado no app), mas a decisão final foi por **espécie individual** — são 52 espécies específicas hoje no cache (`plant_species_info`), número considerado gerenciável.

Limpeza feita: 4 entradas malformadas removidas do cache (`Aglaonema spp.`, `Dieffenbachia spp.`, `Spathiphyllum spp.`, `Mammillaria cactacean` — essa última nem é espécie válida). Migration `20260101009200_remove_malformed_species_cache.sql`.

## Primeiro lote proposto: 20 espécies

Selecionadas por serem as mais comuns em jardim casual/dentro de casa no Brasil — todas já estão no cache do app (info de cuidado + fotos de referência do Wikimedia já buscadas, sem trabalho extra pra preparar):

| # | Nome científico | Nome popular |
|---|---|---|
| 1 | Monstera deliciosa | Costela-de-adão |
| 2 | Epipremnum aureum | Jiboia |
| 3 | Dracaena trifasciata | Espada-de-são-jorge |
| 4 | Syngonium podophyllum | Singônio |
| 5 | Dieffenbachia seguine | Comigo-ninguém-pode |
| 6 | Chrysalidocarpus lutescens | Areca-bambu |
| 7 | Chamaedorea elegans | Palmeira-ráfia |
| 8 | Rhaphidophora tetrasperma | Costela-de-adão mini |
| 9 | Scindapsus aureus | Jiboia-prateada |
| 10 | Oxalis triangularis | Trevo-roxo |
| 11 | Haworthia attenuata | Haworthia-zebra |
| 12 | Beaucarnea recurvata | Pata-de-elefante |
| 13 | Agave americana | Agave |
| 14 | Portulacaria afra | Onze-horas |
| 15 | Adenium obesum | Rosa-do-deserto |
| 16 | Hibiscus rosa-sinensis | Hibisco |
| 17 | Guzmania lingulata | Bromélia |
| 18 | Gymnocalycium mihanovichii | Cacto-bola |
| 19 | Mammillaria elongata | Cacto-coluna |
| 20 | Dionaea muscipula | Dionéia (papa-moscas) |

**Nota:** espécies bem conhecidas mas que ninguém identificou ainda no app (Zamioculcas/Zamioculca, Ficus lyrata/elastica, Anthurium) ficaram de fora por não estarem no cache — dá pra incluir depois, só exige buscar a info da espécie pela primeira vez (custo normal de cache miss).

## Regra de concessão: cadastro no jardim

Implementada (migration `20260101009700_species_badge_on_garden_add.sql`): `badges` ganhou a coluna `scientific_name`, preenchida para os 20 emblemas do primeiro lote com o nome científico exato (igual ao valor salvo em `plants.species` quando o usuário identifica e adiciona a planta). Um trigger `grant_species_badge_on_plant_insert` (`after insert on plants`) roda a cada planta cadastrada: se o `species` da planta bate com o `scientific_name` de algum emblema, chama `grant_badge(user_id, badge_id, 'garden_add')`.

Como `grant_badge` já é idempotente (`on conflict do nothing`), o emblema é concedido só na primeira vez que aquela espécie entra no jardim do usuário — plantar uma segunda Monstera não dá um segundo emblema. Isso implementa exatamente a mecânica pedida: quanto mais espécies diferentes no jardim, mais emblemas. Testado diretamente (insert de planta de teste → emblema concedido → limpo depois).

Futuras regras de concessão (código de resgate, recarga de crédito, assinatura) continuam livres pra usar a mesma função `grant_badge` com um `source` diferente, sem conflito com essa.

## Reset de dados (dev/teste)

Em 2026-09-15, a pedido do usuário, os dados de teste acumulados foram zerados antes de ativar essa regra, pra ninguém começar com emblemas "roubados" de plantas de teste: `plants`, `plant_diagnoses`, `plant_listings` (+ `plant_listing_proposals`), `events` (+ `event_attendees`) foram limpos via migration `20260101009600_reset_garden_activity_data.sql`, e todos os arquivos do bucket `plant-photos` (fotos de plantas, diagnósticos, checkins de crescimento, listagens, eventos e identificações) foram removidos. O comando de limpeza do bucket (`supabase storage rm -r`) apagou o bucket inteiro por engano, não só os arquivos — foi recriado na hora (migration `20260101009500_recreate_plant_photos_bucket.sql`) com a mesma config pública, e as 4 políticas de RLS de `storage.objects` continuavam intactas.
