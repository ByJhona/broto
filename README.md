# Broto 🌱

Broto é um app mobile para quem cuida de plantas: identifica espécies e problemas por foto, organiza lembretes de cuidado, e conecta a comunidade em volta de plantas — de trocar mudas a compartilhar dicas.

## Funcionalidades

**Cuidado das plantas**
- Identificação de espécies por foto (IA)
- Diagnóstico de problemas (pragas, doenças, deficiências) por foto
- Acompanhamento de crescimento com fotos ao longo do tempo
- Ficha de espécie (rega, luz, toxicidade) via Perenual
- Tarefas e lembretes de cuidado, com notificação push e alarme exato no Android
- Chat com IA sobre uma planta específica

**Comunidade**
- Feed de posts com curtidas, comentários e seguidores
- Compartilhamento de anúncios de troca e de eventos direto no feed

**Marketplace de plantas**
- Anúncios de troca/doação de mudas, com fotos e localização no mapa
- Interesse e propostas em um anúncio, com chat direto entre as partes

**Eventos**
- Criação de eventos da comunidade (feiras, trocas, encontros), com lista de presença

**Conta e assinatura**
- Login por e-mail/senha ou Google (Supabase Auth)
- Planos e créditos avulsos via RevenueCat, para as funcionalidades de IA

## Stack técnica

| Camada | Tecnologia |
| --- | --- |
| App | [Expo](https://expo.dev) SDK 57 · React Native · TypeScript · [expo-router](https://docs.expo.dev/router/introduction/) |
| Estado/dados | [TanStack Query](https://tanstack.com/query) |
| Backend | [Supabase](https://supabase.com) (Postgres, Auth, Storage, Edge Functions, Realtime) |
| IA | OpenAI (identificação, diagnóstico, crescimento, chat), Perenual (ficha de espécie) |
| Pagamentos | [RevenueCat](https://www.revenuecat.com) |
| Build/distribuição | [EAS](https://docs.expo.dev/eas/) |

O app é mobile-only e hoje só é publicado para Android.

## Estrutura do projeto

```
src/
  app/          rotas (expo-router): tabs, auth, listing, event, chat, profile...
  components/   componentes de UI reutilizáveis
  hooks/        hooks de dados (React Query) e de plataforma
  services/     chamadas ao Supabase e às edge functions
  store/        contexto de autenticação
  theme/        cores, espaçamento e tipografia (tema claro/escuro)
  types/        tipos compartilhados
  utils/        formatação, validação e helpers puros
supabase/
  migrations/   schema do Postgres, policies e triggers
  functions/    edge functions (Deno)
plugins/        config plugins do Expo (assinatura de release)
assets/         ícones, splash e imagens
```

## Como rodar

Guia completo (Supabase, Firebase, RevenueCat, keystore, EAS) em [docs/SETUP.md](docs/SETUP.md). Resumo para desenvolvimento local:

```bash
npm install
cp .env.example .env   # preencha as variáveis, veja a seção abaixo

npx expo prebuild --platform android
npx expo run:android
```

Notificações push e alarmes exatos não funcionam no Expo Go — use sempre um dev client (`expo run:android`).

## Scripts disponíveis

| Comando | O que faz |
| --- | --- |
| `npm start` | Sobe o Metro bundler |
| `npm run android` | Builda e instala o dev client no Android |
| `npm run lint` | Roda o ESLint (`expo lint`) |
| `npm run reset-project` | Reseta para o template em branco do Expo |

## Variáveis de ambiente

Definidas em `.env` (veja `.env.example` para a lista completa e [docs/SETUP.md](docs/SETUP.md) para onde pegar cada valor):

- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — projeto Supabase
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — OAuth client Web do Google, para o login com Google
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` / `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` — RevenueCat
- `ANDROID_UPLOAD_KEYSTORE_PASSWORD` — senha da keystore de release (só necessária pra build assinado)

## Backend

O schema, as policies de RLS e as edge functions vivem em `supabase/`. Para linkar o projeto, aplicar as migrations e deployar as functions, siga a seção 4 de [docs/SETUP.md](docs/SETUP.md).
