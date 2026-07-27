# Spotify Organizer

App pessoal para organizar a biblioteca/playlists do Spotify de forma mais dinâmica do que o Spotify permite nativamente, com um dashboard "HUD" minimalista para acompanhar o que estás a ouvir.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Auth.js v5 (OAuth PKCE) + Prisma + SQLite.

## Setup

### 1. Criar a app no Spotify Developer Dashboard

1. Vai a [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) e inicia sessão (conta **Premium** obrigatória para Development Mode).
2. **Create app**.
3. **Redirect URI**: `http://127.0.0.1:3000/api/auth/callback/spotify`
   > A Spotify já não aceita `localhost` como redirect URI (só HTTPS ou o IP de loopback literal `127.0.0.1`). Usa sempre `127.0.0.1`, não `localhost`.
4. Guarda o **Client ID** e o **Client Secret** (Settings da app).

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preenche `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET` com os valores do passo anterior. `AUTH_SECRET` e `TOKEN_ENCRYPTION_KEY` já vêm preenchidos com valores gerados aleatoriamente — substitui-os se preferires gerar os teus:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # TOKEN_ENCRYPTION_KEY
```

### 3. Instalar dependências e preparar a base de dados

```bash
npm install
npx prisma migrate dev
```

### 4. Correr em desenvolvimento

```bash
npm run dev
```

Abre **http://127.0.0.1:3000** (não `localhost`, para bater certo com o Redirect URI configurado na Spotify).

## Notas

- Este projeto está desenhado para uso pessoal (single-user). A app Spotify fica em **Development Mode**, limitada a 5 utilizadores autorizados.
- Alguns endpoints da Spotify Web API (`/recommendations`, `/audio-features`, `/related-artists`) estão bloqueados para apps novas desde nov/2024 — o motor de sugestões (Fase 4) usa sobreposição de género/artista em vez de audio-features. Ver `prisma/schema.prisma` e `lib/spotify/` para detalhes.
- Base de dados local usa SQLite (`prisma/dev.db`, não versionado). Para deploy em produção (Vercel), troca `DATABASE_URL` para uma instância Postgres (ex: Neon) — o filesystem da Vercel não é persistente.

## Deploy

[Vercel](https://vercel.com/new) — lembra-te de configurar as env vars (com um `DATABASE_URL` Postgres) e atualizar o Redirect URI no Spotify Dashboard para o domínio de produção.
