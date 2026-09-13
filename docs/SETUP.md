# Configuração do projeto broto

Guia para configurar o broto do zero exatamente como ele está hoje: app Expo (SDK 57, só Android), Supabase como backend, RevenueCat para assinaturas/créditos e EAS para build e distribuição.

## 1. Requisitos

- Node.js e npm
- JDK 21
- Android SDK (`ANDROID_HOME` configurado) — necessário para build local
- Conta Supabase com acesso ao projeto `by_jhona/broto`
- Conta EAS/Expo com acesso ao projeto `@by_jhona/broto`
- Conta RevenueCat com acesso ao projeto do broto
- Conta Firebase com acesso ao projeto ligado ao app Android `com.byjhona.broto`

## 2. Instalar dependências

```bash
npm install
```

## 3. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | De onde vem |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API |
| `EXPO_PUBLIC_USE_RN_FETCH` | `1` (mantém o valor do exemplo) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Cloud Console > APIs & Services > Credentials (OAuth client "Web application" — seção 4.5) |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat > Project Settings > API Keys (app iOS) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | RevenueCat > Project Settings > API Keys (app Android) |
| `ANDROID_UPLOAD_KEYSTORE_PASSWORD` | senha da keystore de upload (seção 6) |

O app é mobile-only: as chaves iOS existem no código mas o app não é publicado nessa plataforma hoje.

## 4. Supabase

### 4.1 Linkar o projeto

```bash
npx supabase login
npx supabase link --project-ref qjooaimeitfrlficipgp
```

### 4.2 Aplicar as migrations

```bash
npx supabase db push
```

Isso cria todas as tabelas, policies, triggers e o `cron.schedule` de `send-care-reminders`. As extensões `pg_net` e `vault` são provisionadas automaticamente pela Supabase — não precisam ser criadas manualmente.

### 4.3 Deployar as edge functions

```bash
npx supabase functions deploy
```

Funções existentes: `revenuecat-webhook`, `plant-species-info`, `analyze-plant-growth`, `diagnose-plant`, `plant-chat`, `identify-plant`, `send-care-reminders`, `send-notification-push`.

### 4.4 Configurar os secrets das functions

```bash
npx supabase secrets set OPENAI_API_KEY=<chave da OpenAI>
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=<valor definido no passo 5.2>
```

`DB_WEBHOOK_SECRET` e `CRON_SECRET` não são escolhidos por você: cada migration (`notification_push` e `care_tasks_sync`) já gera o valor com `vault.create_secret` ao rodar `db push`. Depois de aplicar as migrations, copie esses valores do Vault para os secrets das functions:

```bash
# pegue o valor gerado
npx supabase db execute "select decrypted_secret from vault.decrypted_secrets where name = 'notification_push_secret'"
npx supabase secrets set DB_WEBHOOK_SECRET=<valor retornado>

npx supabase db execute "select decrypted_secret from vault.decrypted_secrets where name = 'care_reminders_cron_secret'"
npx supabase secrets set CRON_SECRET=<valor retornado>
```

Confira o que já está configurado com `npx supabase secrets list` e `npx supabase functions list`.

### 4.5 Login com Google

O app usa `@react-native-google-signin/google-signin` (sign-in nativo, sem WebBrowser) + `supabase.auth.signInWithIdToken`. Passos no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) do projeto ligado ao Firebase `broto-d23f6`:

1. Crie um OAuth client **Web application** (não precisa de redirect URI) — o Client ID dele vai em `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` e é o mesmo usado no passo 2.
2. Crie um OAuth client **Android**, com `com.byjhona.broto` como package name e o SHA-1 do certificado de assinatura (debug e/ou upload, conforme o build) — sem isso o Google recusa o sign-in nesse app.
3. Em Supabase > Authentication > Providers > Google, habilite o provider e cole o Client ID **Web** no campo "Client IDs". Marque "Skip nonce checks" — a lib não envia nonce, e sem isso o `signInWithIdToken` falha.

Perfis criados via Google não têm `username` escolhido pelo usuário: a trigger `handle_new_user` (migration `20260101006400_google_signin_username_fallback.sql`) gera um a partir do e-mail e o usuário pode trocar depois em Editar perfil.

## 5. RevenueCat

### 5.1 Produtos e entitlements

Cada plano pago precisa ter `revenuecat_entitlement_id` preenchido na tabela `plans` (mesmo identifier do entitlement no RevenueCat). Pacotes de créditos avulsos usam o `product_id` da compra, que precisa bater com o `id` em `credit_packs`.

### 5.2 Webhook

Em RevenueCat > Project Settings > Integrations > Webhooks, aponte para a URL da function `revenuecat-webhook` e defina um "Authorization header value" — esse valor é o `REVENUECAT_WEBHOOK_SECRET` do passo 4.4.

### 5.3 App User ID

O app já chama `Purchases.logIn(supabaseUserId)` ([src/services/purchases.ts](../src/services/purchases.ts)) para o App User ID do RevenueCat casar com o id do usuário no Supabase Auth — é assim que o webhook sabe de qual usuário se trata. Não precisa configurar nada extra para isso.

## 6. Firebase / push notifications (Android)

### 6.1 google-services.json

Baixe o `google-services.json` do projeto Firebase ligado ao app Android `com.byjhona.broto` e coloque na raiz do repo (ele é gitignorado, precisa ser copiado manualmente em cada máquina/CI).

### 6.2 Credencial FCM V1 no EAS

Push para Android via Expo exige subir a Service Account do Firebase (FCM V1) nas credenciais do EAS — isso é separado do `google-services.json`. Rode:

```bash
npx eas-cli credentials -p android
```

e em "Push Notifications" faça upload do JSON da Service Account (Firebase Console > Project Settings > Service Accounts > Generate new private key). Sem isso, o app registra o token normalmente mas os pushes não chegam.

## 7. Keystore de assinatura Android

O repo já contém `upload-keystore.jks` (gitignorado) na raiz. Se for gerar uma nova:

```bash
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

A senha da keystore vai em `ANDROID_UPLOAD_KEYSTORE_PASSWORD` (seção 3). O plugin [plugins/withReleaseSigning.js](../plugins/withReleaseSigning.js) só aplica a assinatura de release durante o `expo prebuild` se essa variável estiver definida — sem ela, o build de release volta a usar a assinatura de debug.

## 8. EAS

O projeto já está linkado (`app.json` > `extra.eas.projectId`). Para confirmar o login:

```bash
npx eas-cli whoami
```

Perfis em [eas.json](../eas.json):

- `development` — dev client, distribuição interna
- `preview` — gera APK, distribuição interna
- `production` — AAB, `autoIncrement` do version code

## 9. Gerando o app

### 9.1 Desenvolvimento

Notificações não funcionam no Expo Go (SDK 53+ removeu suporte lá — ver [src/services/notificationsModule.ts](../src/services/notificationsModule.ts)). Para testar o fluxo completo, use um dev client:

```bash
npx expo prebuild --platform android
npx expo run:android
```

### 9.2 Build de release local (AAB)

```bash
npx expo prebuild --platform android
cd android
./gradlew bundleRelease
```

O AAB assinado sai em `android/app/build/outputs/bundle/release/app-release.aab`.

### 9.3 Build via EAS

```bash
npx eas-cli build --platform android --profile production
```

## 10. Checklist de configuração completa

- [ ] `.env` preenchido
- [ ] Projeto Supabase linkado, migrations aplicadas, functions deployadas
- [ ] Secrets das functions configurados (`OPENAI_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `DB_WEBHOOK_SECRET`, `CRON_SECRET`)
- [ ] OAuth clients Web e Android do Google criados e provider Google habilitado no Supabase
- [ ] Entitlements/produtos do RevenueCat mapeados em `plans` e `credit_packs`
- [ ] Webhook do RevenueCat apontando para a function certa
- [ ] `google-services.json` na raiz do repo
- [ ] Service Account do Firebase (FCM V1) cadastrada nas credenciais do EAS
- [ ] `upload-keystore.jks` presente e `ANDROID_UPLOAD_KEYSTORE_PASSWORD` definida
