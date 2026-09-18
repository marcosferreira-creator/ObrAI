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

## Fase 3 — contas a pagar e relatórios

1. No SQL Editor do Supabase, rode `supabase/migration_fase3.sql` (só cria
   índices, não mexe em dados).
2. Pronto — o menu "Relatórios" já tem duas abas: **Resumo** (fechamento por
   período — hoje/7 dias/mês/personalizado — com quebra por categoria, obra
   e fornecedor) e **Contas a pagar** (despesas marcadas como "ainda vou
   pagar" no lançamento, com botão de marcar como pago).
3. Ao lançar uma despesa (manual, foto ou XML), marque "Ainda vou pagar essa
   despesa" e informe o vencimento se ela ainda não foi paga — senão ela já
   entra como paga.

## Fase 4 — IA de consulta em linguagem natural

1. No painel do Supabase, **Edge Functions → Create a new function**, nome
   `consultar-ia`, cole o conteúdo de
   `supabase/functions/consultar-ia/index.ts`. Deploy.
2. Não precisa configurar secret nova — usa a mesma `ANTHROPIC_API_KEY` já
   criada na Fase 2.
3. No app, clica em **"💬 Assistente"** no topo da tela e pergunta coisas
   como "quanto gastei este mês", "teve algum aumento de custo incomum" ou
   "existe alguma despesa duplicada". A IA responde só com base nos dados
   reais cadastrados — nunca inventa números.

## Ajustes de usabilidade (setembro/2026)

1. No SQL Editor do Supabase, rode `supabase/migration_fase3b.sql` — corrige
   as subcategorias, que estavam vazias (o schema original só semeava as
   categorias, não as subcategorias).
2. Depois disso:
   - Nos itens de uma despesa (manual, foto ou XML), dá pra criar uma
     subcategoria nova na hora, pelo próprio formulário.
   - Cada item agora tem só um campo de valor (preço unitário) — frete e
     desconto foram removidos do formulário.
   - Lançamentos aparecem clicáveis na tela da obra — abre pra editar
     qualquer campo (inclusive fornecedor, se você lançou sem ele) ou
     excluir.
   - Fornecedores têm botão "Editar" pra completar CNPJ/telefone depois.
   - Relatórios ganharam os botões "Exportar PDF" e "Exportar Excel".
   - Layout mais compacto e fiel a tela de celular; o zoom por pinça fica
     desativado só quando o app está aberto pela tela de início (instalado
     como PWA) — no navegador normal continua funcionando.

## Fase 5 — multiusuário com permissões

1. No SQL Editor do Supabase, rode `supabase/migration_fase5.sql`. Isso:
   - cria uma linha em `usuarios` pra cada login que já existe hoje no
     Supabase Auth — a conta mais antiga vira **admin** automaticamente
     (deve ser a sua), as demais (inclusive contas de teste) entram como
     **visualização**;
   - reescreve as regras de segurança do banco pra checar o papel de quem
     está logado, em vez de liberar geral pra qualquer autenticado.
2. No painel do Supabase, **Edge Functions → Create a new function**, nome
   `gerenciar-usuarios`, cole o conteúdo de
   `supabase/functions/gerenciar-usuarios/index.ts`. Deploy. (Não precisa
   secret nova.)
3. No app, entra em **"👤 Usuários"** no topo (só aparece pra quem é
   admin) → confirma que sua conta está como Admin → cria o acesso dos
   seus funcionários (nome, e-mail, senha provisória, permissão) e passa
   as credenciais pra cada um.

Permissões disponíveis: **Admin** (tudo), **Financeiro** (lança/edita
despesas e fornecedores, vê tudo), **Mestre de obra / Comprador** (só
lança despesa — foto, XML ou manual — não edita depois), **Visualização**
(só consulta). Todo mundo vê todas as obras — a permissão controla o que
cada um pode *fazer*, não o que vê. Se no futuro você precisar restringir
por obra específica, o banco já tem a tabela `permissoes_obra` pronta pra
isso — é só avisar.

## O que ainda falta (próximas fases, já combinadas)

- Fase 2: leitura de QR Code via provedor pago (cotação pendente —
  foto e XML já estão prontos).
- Fase 3: relatórios exportáveis em PDF/Excel (hoje só tem visualização
  dentro do app).
- Fase 5: permissões multiusuário (o schema já tem `usuarios` e
  `permissoes_obra` prontos para isso).
