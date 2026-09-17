# ObrAI — Gestão Inteligente de Obras

Fase 1 (base): cadastro de obras, etapas, fornecedores e lançamento manual de
despesas com categoria por item. Sem OCR/IA e sem multiusuário ainda — isso
entra nas próximas fases, já previstas no schema.

## Rodando localmente

Esta sessão não teve acesso à internet para rodar `npm install` — os arquivos
estão todos prontos, mas as dependências ainda não foram baixadas. No seu
computador, com internet normal:

```bash
npm install
cp .env.example .env
```

Edite o `.env` com a URL e a chave anônima (`anon key`) do seu projeto
Supabase (Project Settings → API, no painel do Supabase).

## Banco de dados

1. Crie um projeto em https://supabase.com (grátis para começar).
2. No SQL Editor do projeto, rode o conteúdo de `supabase/schema.sql`.
   Isso cria todas as tabelas, os índices, a política de acesso e já
   semeia as categorias de construção civil.
3. Crie seu usuário de login em Authentication → Users (ou pela própria
   tela de login do app, se você habilitar signup — por padrão o app só
   faz login, não cadastro, já que é uso único).

## Rodando o app

```bash
npm run dev
```

Abre em `http://localhost:5173`. Para instalar no celular como PWA
("adicionar à tela de início"), acesse pelo Chrome/Safari do celular
depois de publicar (ex: Vercel) — em `localhost` o navegador não oferece
a instalação.

## Publicando (Vercel, mesmo fluxo do AquaCulture)

```bash
git init
git add .
git commit -m "ObrAI — fase 1: base (obras, fornecedores, despesas)"
git branch -M main
git remote add origin <url-do-seu-repo-no-github>
git push -u origin main
```

Depois é só importar o repositório na Vercel e configurar as duas
variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) no
painel do projeto.

## Fase 2 — captura por foto (IA) e XML

1. No SQL Editor do Supabase, rode `supabase/migration_fase2.sql` (cria o
   bucket de storage `notas` e libera o tipo `xml` nos anexos).
2. No painel do Supabase, vá em **Edge Functions → Create a new function**,
   nomeie `processar-nota` e cole o conteúdo de
   `supabase/functions/processar-nota/index.ts`. Deploy.
3. Em **Edge Functions → Manage secrets**, adicione `ANTHROPIC_API_KEY` com
   uma chave gerada em console.anthropic.com.
4. Pronto — as opções "Tirar foto da nota" e "Enviar XML da nota" no menu
   "Despesa" já funcionam.

## O que ainda falta (próximas fases, já combinadas)

- Fase 2: leitura de QR Code via provedor pago (cotação pendente —
  foto e XML já estão prontos).
- Fase 3: contas a pagar, fluxo de caixa, relatórios exportáveis.
- Fase 4: IA de consulta em linguagem natural.
- Fase 5: permissões multiusuário (o schema já tem `usuarios` e
  `permissoes_obra` prontos para isso).
