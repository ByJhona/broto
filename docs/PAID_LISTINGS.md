# Ofertas pagas (Venda)

Como funciona o tipo de oferta "Venda", que permite vender uma planta por um preço fixo dentro do broto.

## Visão geral

`ListingType` ganhou um quarto valor, `sale` ("Venda"), ao lado de `donation`, `exchange` e `discard`. Uma oferta de venda tem tudo que as outras têm (fotos, título, descrição, localização) mais um preço obrigatório em `price_cents`.

O broto **não processa pagamento nenhum**: a "venda" aqui é só o anúncio. A negociação (combinar forma de pagamento, entrega, etc.) acontece pelo mesmo fluxo de chat que já existe pra doação e resgate — quem se interessa toca em "Quero comprar", isso envia uma mensagem de interesse (`sendInterestMessage`, `message_type = 'interest'` em `chat_messages`) exatamente como uma doação, e o dono da oferta vê o card da proposta na própria conversa e aceita ou recusa por ali. Nenhuma lógica nova de negociação foi criada; só o rótulo do botão muda.

## Modelo de dados

Migration: [`20260101006700_listing_sale_price.sql`](../supabase/migrations/20260101006700_listing_sale_price.sql).

- `plant_listings.listing_type` passou a aceitar `'sale'`.
- `plant_listings.price_cents` (`integer`, nullable) guarda o preço em centavos — mesma convenção já usada em `plans.price_cents` e `credit_packs.price_cents`.
- Um `check` garante a consistência dos dois campos direto no banco:
  ```sql
  check (
    (listing_type = 'sale' and price_cents is not null and price_cents > 0)
    or (listing_type <> 'sale' and price_cents is null)
  )
  ```
  Ou seja: toda oferta de venda **tem** que ter preço positivo, e nenhuma oferta de outro tipo pode ter preço. Não dá pra criar um estado inconsistente mesmo contornando a validação do app.

## Preço em centavos

Preço é sempre um `number` em centavos na camada de dados e serviços (`priceCents` no app, `price_cents` no banco) — nunca reais fracionários. Isso evita os erros clássicos de arredondamento de ponto flutuante com dinheiro.

A formatação para exibição é centralizada em [`src/utils/currency.ts`](../src/utils/currency.ts):

```ts
formatPrice(4500) // "R$ 45,00"
```

Usa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`, que já cuida de separador de milhar e vírgula decimal corretamente (`formatPrice(150000)` → `"R$ 1.500,00"`). Essa função também é usada em `profile/plans.tsx` (planos e pacotes de créditos) — antes cada tela tinha sua própria formatação manual; agora é uma única fonte.

## Captura do preço na criação

[`src/components/PriceField.tsx`](../src/components/PriceField.tsx) é um campo de texto mascarado: o usuário digita só números e o componente formata em tempo real como moeda (modelo "preenche da direita pra esquerda", igual a apps de banco/checkout brasileiros). Ele guarda o valor como `cents: number` — quem usa não lida com string nenhuma.

Em [`src/app/listing/new.tsx`](../src/app/listing/new.tsx), o campo só aparece quando `listingType === LISTING_TYPE.SALE`, dentro do mesmo card do seletor de tipo. Tentar continuar sem preço (ou com preço zero) mostra o erro "Informa o preço da planta." — a mesma validação que já existia pra título.

O preço segue o mesmo caminho que fotos e demais campos: vai como parâmetro de rota pro passo de posicionar no mapa ([`src/app/(tabs)/index.tsx`](<../src/app/(tabs)/index.tsx>)) e só então é enviado pra `createListing`.

## Onde o preço aparece

Todos os lugares que já mostravam o tipo da oferta (ícone + cor + rótulo) agora mostram o **preço no lugar do rótulo** quando é venda, através de `listingBadgeLabel(listingType, priceCents)` em [`src/utils/listingTypes.ts`](../src/utils/listingTypes.ts) — uma doação continua mostrando "Doação", mas uma venda mostra "R$ 45,00" em vez de "Venda" (o ícone de etiqueta já deixa claro que é uma venda; o preço é a informação que importa):

- [`ListingCard.tsx`](../src/components/ListingCard.tsx) — cards de oferta (mapa, comunidade, perfil)
- [`ListingCallout.tsx`](../src/components/ListingCallout.tsx) — balão ao tocar no pino do mapa
- `PostListingPreview` em [`CommunityPostCard.tsx`](../src/components/CommunityPostCard.tsx) — preview de oferta compartilhada num post

Na tela de detalhe ([`src/app/listing/[id].tsx`](<../src/app/listing/[id].tsx>)), o preço aparece grande, na própria foto de capa: [`ListingPhotoGallery.tsx`](../src/components/ListingPhotoGallery.tsx) ganhou uma prop opcional `priceLabel` que renderiza um selo colorido (cor do tipo "Venda") logo abaixo do título, sobre a foto.

## Identidade visual do tipo "Venda"

Ícone `Tag` (lucide-react-native) e cor `#10B981`, seguindo o mesmo padrão das outras cores de tipo (`LISTING_TYPES` em `src/utils/listingTypes.ts`, todas hex do Tailwind: azul pra doação, roxo pra troca, âmbar pra resgate). Como pino no mapa, badge de card ou selo de detalhe, tudo deriva desse único registro — não existe cor ou ícone hardcoded em nenhuma tela.

## Texto do botão de ação

Em [`ListingActionFooter.tsx`](../src/components/ListingActionFooter.tsx), o botão principal muda de rótulo conforme o tipo, mas chama sempre a mesma função (`onInterest`, que é `sendInterestMessage`):

| Tipo | Rótulo antes de agir | Depois de agir |
| --- | --- | --- |
| Doação / Resgate | "Tenho interesse" | "Interesse enviado" |
| Troca | "Propor troca" | "Abrir conversa" |
| **Venda** | **"Quero comprar"** | "Interesse enviado" |

Troca continua sendo o único tipo com fluxo próprio (escolher uma planta sua pra oferecer); venda usa o mesmo caminho de doação/resgate, só com copy mais apropriada pra quem está comprando.
