-- ObrAI — Fase 5: multiusuário com permissões
-- Rode no SQL Editor do Supabase. Isso substitui as políticas de RLS
-- antigas (que só checavam "está logado?") por regras baseadas no papel
-- de cada usuário.
--
-- Papéis usados (o app usa só 4, o schema antigo tinha mais 2 que ficam
-- disponíveis mas sem uso: 'engenheiro' e 'comprador'):
--   admin       -> acesso total, inclusive gerenciar usuários
--   financeiro  -> lança/edita despesas e fornecedores, vê tudo
--   mestre_obra -> só lança despesas (foto/xml/manual) — não edita depois,
--                  não gerencia fornecedores/obras. Cobre "mestre de obra
--                  ou comprador".
--   visualizacao -> só consulta, não lança nem edita nada

-- 1) Função auxiliar: papel do usuário autenticado agora.
-- security definer pra não cair em recursão de RLS ao consultar `usuarios`.
create or replace function meu_papel()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select papel from usuarios where auth_user_id = auth.uid() and ativo = true limit 1
$$;

-- 2) Garante que toda conta que já existe no Supabase Auth tenha uma linha
-- em `usuarios`. A conta mais antiga vira admin; as demais (inclusive
-- contas de teste que você criou) entram como "visualizacao" — depois você
-- promove quem precisar pela tela de Usuários.
insert into usuarios (auth_user_id, nome, email, papel, ativo)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
  u.email,
  case when u.id = (select id from auth.users order by created_at asc limit 1) then 'admin' else 'visualizacao' end,
  true
from auth.users u
where not exists (select 1 from usuarios ex where ex.auth_user_id = u.id);

-- 3) Remove as políticas antigas (liberadas pra qualquer autenticado).
drop policy if exists "authenticated_full_access" on obras;
drop policy if exists "authenticated_full_access" on etapas;
drop policy if exists "authenticated_full_access" on despesas;
drop policy if exists "authenticated_full_access" on itens_compra;
drop policy if exists "authenticated_full_access" on fornecedores;
drop policy if exists "authenticated_full_access" on contas_pagar;
drop policy if exists "authenticated_full_access" on anexos;
drop policy if exists "authenticated_full_access" on historico_precos;
drop policy if exists "authenticated_full_access" on categorias;
drop policy if exists "authenticated_full_access" on subcategorias;

alter table usuarios enable row level security;
alter table permissoes_obra enable row level security;

-- 4) Leitura: todo usuário ativo (qualquer papel) vê tudo — a permissão
-- controla o que cada um pode FAZER, não o que vê.
create policy "leitura_geral" on obras for select using (meu_papel() is not null);
create policy "leitura_geral" on etapas for select using (meu_papel() is not null);
create policy "leitura_geral" on categorias for select using (meu_papel() is not null);
create policy "leitura_geral" on subcategorias for select using (meu_papel() is not null);
create policy "leitura_geral" on fornecedores for select using (meu_papel() is not null);
create policy "leitura_geral" on despesas for select using (meu_papel() is not null);
create policy "leitura_geral" on itens_compra for select using (meu_papel() is not null);
create policy "leitura_geral" on contas_pagar for select using (meu_papel() is not null);
create policy "leitura_geral" on anexos for select using (meu_papel() is not null);
create policy "leitura_geral" on historico_precos for select using (meu_papel() is not null);

-- 5) Escrita: obras/etapas/fornecedores — só admin e financeiro cadastram/editam.
create policy "escrita_admin_financeiro" on obras for insert with check (meu_papel() in ('admin','financeiro'));
create policy "edicao_admin_financeiro" on obras for update using (meu_papel() in ('admin','financeiro'));
create policy "exclusao_admin_financeiro" on obras for delete using (meu_papel() in ('admin','financeiro'));

create policy "escrita_admin_financeiro" on etapas for insert with check (meu_papel() in ('admin','financeiro'));
create policy "edicao_admin_financeiro" on etapas for update using (meu_papel() in ('admin','financeiro'));
create policy "exclusao_admin_financeiro" on etapas for delete using (meu_papel() in ('admin','financeiro'));

create policy "escrita_admin_financeiro" on fornecedores for insert with check (meu_papel() in ('admin','financeiro'));
create policy "edicao_admin_financeiro" on fornecedores for update using (meu_papel() in ('admin','financeiro'));
create policy "exclusao_admin_financeiro" on fornecedores for delete using (meu_papel() in ('admin','financeiro'));

-- 6) Categorias: raramente mudam — só admin. Subcategorias: qualquer um
-- que lança despesa pode criar uma nova na hora (admin/financeiro/mestre_obra).
create policy "escrita_admin" on categorias for insert with check (meu_papel() = 'admin');
create policy "edicao_admin" on categorias for update using (meu_papel() = 'admin');
create policy "exclusao_admin" on categorias for delete using (meu_papel() = 'admin');

create policy "escrita_lancadores" on subcategorias for insert with check (meu_papel() in ('admin','financeiro','mestre_obra'));
create policy "edicao_admin_financeiro" on subcategorias for update using (meu_papel() in ('admin','financeiro'));
create policy "exclusao_admin_financeiro" on subcategorias for delete using (meu_papel() in ('admin','financeiro'));

-- 7) Despesas/itens/anexos: admin, financeiro e mestre_obra lançam;
-- só admin e financeiro editam/excluem depois de lançado.
create policy "lancamento" on despesas for insert with check (meu_papel() in ('admin','financeiro','mestre_obra'));
create policy "edicao_admin_financeiro" on despesas for update using (meu_papel() in ('admin','financeiro'));
create policy "exclusao_admin_financeiro" on despesas for delete using (meu_papel() in ('admin','financeiro'));

create policy "lancamento" on itens_compra for insert with check (meu_papel() in ('admin','financeiro','mestre_obra'));
create policy "edicao_admin_financeiro" on itens_compra for update using (meu_papel() in ('admin','financeiro'));
create policy "exclusao_admin_financeiro" on itens_compra for delete using (meu_papel() in ('admin','financeiro'));

create policy "lancamento" on anexos for insert with check (meu_papel() in ('admin','financeiro','mestre_obra'));
create policy "exclusao_admin_financeiro" on anexos for delete using (meu_papel() in ('admin','financeiro'));

create policy "lancamento" on historico_precos for insert with check (meu_papel() in ('admin','financeiro','mestre_obra'));

-- 8) Contas a pagar: admin/financeiro/mestre_obra criam (junto do
-- lançamento); só admin/financeiro marcam como pago (update) ou excluem.
create policy "lancamento" on contas_pagar for insert with check (meu_papel() in ('admin','financeiro','mestre_obra'));
create policy "edicao_admin_financeiro" on contas_pagar for update using (meu_papel() in ('admin','financeiro'));
create policy "exclusao_admin_financeiro" on contas_pagar for delete using (meu_papel() in ('admin','financeiro'));

-- 9) Tabela de usuários: cada um vê sua própria linha; admin vê e edita
-- todas. Criar conta nova (auth + linha usuarios) só pela Edge Function
-- "gerenciar-usuarios" (usa a service role, não passa por aqui).
create policy "ve_propria_linha_ou_admin" on usuarios for select using (auth_user_id = auth.uid() or meu_papel() = 'admin');
create policy "admin_edita" on usuarios for update using (meu_papel() = 'admin');

-- 10) permissoes_obra: preparado pra quando "só obras atribuídas" for
-- necessário — hoje sem uso funcional, mas já protegido.
create policy "admin_gerencia" on permissoes_obra for all using (meu_papel() = 'admin');
