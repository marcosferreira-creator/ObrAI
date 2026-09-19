-- ObrAI — Fase 6: multi-empresa (multi-tenant)
-- Transforma o sistema de "um workspace compartilhado" pra "cada empresa
-- só vê e mexe nos próprios dados" — necessário pra vender o ObrAI pra
-- outros gestores de obra sem eles verem os dados uns dos outros.
--
-- Rode isso DEPOIS da migration_fase5.sql (usa a tabela `usuarios` e a
-- função `meu_papel()` criadas por ela).

-- 1) Tabela de empresas
create table if not exists empresas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  criado_em timestamptz not null default now()
);

-- 2) Marca o Marcos como "super admin" — só ele pode criar empresas novas
-- (ou seja, cadastrar um cliente novo que comprou o ObrAI).
alter table usuarios add column if not exists super_admin boolean not null default false;

-- 3) Coluna empresa_id em toda tabela de dados (nullable por enquanto —
-- vamos preencher antes de travar como obrigatória).
alter table usuarios add column if not exists empresa_id uuid references empresas(id);
alter table obras add column if not exists empresa_id uuid references empresas(id);
alter table etapas add column if not exists empresa_id uuid references empresas(id);
alter table fornecedores add column if not exists empresa_id uuid references empresas(id);
alter table despesas add column if not exists empresa_id uuid references empresas(id);
alter table itens_compra add column if not exists empresa_id uuid references empresas(id);
alter table contas_pagar add column if not exists empresa_id uuid references empresas(id);
alter table anexos add column if not exists empresa_id uuid references empresas(id);
alter table historico_precos add column if not exists empresa_id uuid references empresas(id);
-- subcategorias: empresa_id NULL = subcategoria padrão, visível pra todo
-- mundo (as que vieram semeadas). Uma empresa pode criar as próprias.
alter table subcategorias add column if not exists empresa_id uuid references empresas(id);
alter table permissoes_obra add column if not exists empresa_id uuid references empresas(id);

-- categorias fica igual (global, compartilhada por todas as empresas —
-- é só uma lista de nomes genéricos da construção civil).

-- 4) Função auxiliar: empresa do usuário autenticado agora.
create or replace function minha_empresa()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id from usuarios where auth_user_id = auth.uid() and ativo = true limit 1
$$;

-- 5) Cria a empresa do Marcos com TUDO que já existe, e a empresa do
-- Gustavo (como admin dela, separada). Ajuste os e-mails abaixo se algum
-- dos dois estiver diferente do que você usa pra logar.
do $$
declare
  empresa_marcos uuid;
  empresa_gustavo uuid;
begin
  insert into empresas (nome) values ('ObrAI — conta principal') returning id into empresa_marcos;

  update usuarios set empresa_id = empresa_marcos, super_admin = true
  where email = 'marcos.ferreira.026@icloud.com';

  if not found then
    raise exception 'Nenhum usuário com email marcos.ferreira.026@icloud.com encontrado — confira o email exato usado no login (Authentication > Users no Supabase) e ajuste este script antes de rodar de novo.';
  end if;

  update obras set empresa_id = empresa_marcos where empresa_id is null;
  update etapas set empresa_id = empresa_marcos where empresa_id is null;
  update fornecedores set empresa_id = empresa_marcos where empresa_id is null;
  update despesas set empresa_id = empresa_marcos where empresa_id is null;
  update itens_compra set empresa_id = empresa_marcos where empresa_id is null;
  update contas_pagar set empresa_id = empresa_marcos where empresa_id is null;
  update anexos set empresa_id = empresa_marcos where empresa_id is null;
  update historico_precos set empresa_id = empresa_marcos where empresa_id is null;

  -- qualquer outra conta que já existia (que não seja o Gustavo) cai na
  -- empresa do Marcos também, sem mudar o papel que ela já tinha.
  update usuarios set empresa_id = empresa_marcos
  where empresa_id is null and email <> 'gustavofuzari@icloud.com';

  insert into empresas (nome) values ('Empresa do Gustavo Fusari') returning id into empresa_gustavo;
  update usuarios set empresa_id = empresa_gustavo, papel = 'admin', ativo = true
  where email = 'gustavofuzari@icloud.com';

  if not found then
    raise notice 'Nenhum usuário com email gustavofuzari@icloud.com encontrado — a empresa "Empresa do Gustavo Fusari" foi criada vazia. Confira o email exato da conta dele.';
  end if;
end $$;

-- 6) Trava empresa_id como obrigatório (exceto subcategorias, onde NULL =
-- padrão global) e faz ela se auto-preencher no insert com a empresa de
-- quem está logado — assim o código do app não precisa mudar pra enviar
-- esse campo.
alter table obras alter column empresa_id set not null;
alter table obras alter column empresa_id set default minha_empresa();

alter table etapas alter column empresa_id set not null;
alter table etapas alter column empresa_id set default minha_empresa();

alter table fornecedores alter column empresa_id set not null;
alter table fornecedores alter column empresa_id set default minha_empresa();

alter table despesas alter column empresa_id set not null;
alter table despesas alter column empresa_id set default minha_empresa();

alter table itens_compra alter column empresa_id set not null;
alter table itens_compra alter column empresa_id set default minha_empresa();

alter table contas_pagar alter column empresa_id set not null;
alter table contas_pagar alter column empresa_id set default minha_empresa();

alter table anexos alter column empresa_id set not null;
alter table anexos alter column empresa_id set default minha_empresa();

alter table historico_precos alter column empresa_id set not null;
alter table historico_precos alter column empresa_id set default minha_empresa();

alter table subcategorias alter column empresa_id set default minha_empresa();

alter table usuarios alter column empresa_id set not null;
-- (usuarios NÃO tem default — quem define é a Edge Function na hora de criar)

-- 7) Subcategoria: duas empresas podem ter subcategorias com o mesmo nome
-- na mesma categoria sem conflitar.
alter table subcategorias drop constraint if exists subcategorias_categoria_id_nome_key;
alter table subcategorias add constraint subcategorias_categoria_empresa_nome_key
  unique (categoria_id, empresa_id, nome);

-- 8) Substitui as políticas da Fase 5 por versões que também isolam por
-- empresa.
drop policy if exists "leitura_geral" on obras;
drop policy if exists "leitura_geral" on etapas;
drop policy if exists "leitura_geral" on categorias;
drop policy if exists "leitura_geral" on subcategorias;
drop policy if exists "leitura_geral" on fornecedores;
drop policy if exists "leitura_geral" on despesas;
drop policy if exists "leitura_geral" on itens_compra;
drop policy if exists "leitura_geral" on contas_pagar;
drop policy if exists "leitura_geral" on anexos;
drop policy if exists "leitura_geral" on historico_precos;

drop policy if exists "escrita_admin_financeiro" on obras;
drop policy if exists "edicao_admin_financeiro" on obras;
drop policy if exists "exclusao_admin_financeiro" on obras;
drop policy if exists "escrita_admin_financeiro" on etapas;
drop policy if exists "edicao_admin_financeiro" on etapas;
drop policy if exists "exclusao_admin_financeiro" on etapas;
drop policy if exists "escrita_admin_financeiro" on fornecedores;
drop policy if exists "edicao_admin_financeiro" on fornecedores;
drop policy if exists "exclusao_admin_financeiro" on fornecedores;
drop policy if exists "escrita_admin" on categorias;
drop policy if exists "edicao_admin" on categorias;
drop policy if exists "exclusao_admin" on categorias;
drop policy if exists "escrita_lancadores" on subcategorias;
drop policy if exists "edicao_admin_financeiro" on subcategorias;
drop policy if exists "exclusao_admin_financeiro" on subcategorias;
drop policy if exists "lancamento" on despesas;
drop policy if exists "edicao_admin_financeiro" on despesas;
drop policy if exists "exclusao_admin_financeiro" on despesas;
drop policy if exists "lancamento" on itens_compra;
drop policy if exists "edicao_admin_financeiro" on itens_compra;
drop policy if exists "exclusao_admin_financeiro" on itens_compra;
drop policy if exists "lancamento" on anexos;
drop policy if exists "exclusao_admin_financeiro" on anexos;
drop policy if exists "lancamento" on historico_precos;
drop policy if exists "lancamento" on contas_pagar;
drop policy if exists "edicao_admin_financeiro" on contas_pagar;
drop policy if exists "exclusao_admin_financeiro" on contas_pagar;
drop policy if exists "ve_propria_linha_ou_admin" on usuarios;
drop policy if exists "admin_edita" on usuarios;
drop policy if exists "admin_gerencia" on permissoes_obra;

-- Leitura: qualquer usuário ativo, só dentro da própria empresa.
create policy "leitura_empresa" on obras for select using (meu_papel() is not null and empresa_id = minha_empresa());
create policy "leitura_empresa" on etapas for select using (meu_papel() is not null and empresa_id = minha_empresa());
create policy "leitura_geral" on categorias for select using (meu_papel() is not null); -- categorias continuam globais
create policy "leitura_empresa" on subcategorias for select using (meu_papel() is not null and (empresa_id is null or empresa_id = minha_empresa()));
create policy "leitura_empresa" on fornecedores for select using (meu_papel() is not null and empresa_id = minha_empresa());
create policy "leitura_empresa" on despesas for select using (meu_papel() is not null and empresa_id = minha_empresa());
create policy "leitura_empresa" on itens_compra for select using (meu_papel() is not null and empresa_id = minha_empresa());
create policy "leitura_empresa" on contas_pagar for select using (meu_papel() is not null and empresa_id = minha_empresa());
create policy "leitura_empresa" on anexos for select using (meu_papel() is not null and empresa_id = minha_empresa());
create policy "leitura_empresa" on historico_precos for select using (meu_papel() is not null and empresa_id = minha_empresa());

-- Escrita: mesma regra de papel de antes (admin/financeiro cadastram
-- obra/etapa/fornecedor; mestre_obra só lança despesa), mais a checagem
-- de que o registro pertence à própria empresa.
create policy "escrita_empresa" on obras for insert with check (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "edicao_empresa" on obras for update using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "exclusao_empresa" on obras for delete using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());

create policy "escrita_empresa" on etapas for insert with check (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "edicao_empresa" on etapas for update using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "exclusao_empresa" on etapas for delete using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());

create policy "escrita_empresa" on fornecedores for insert with check (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "edicao_empresa" on fornecedores for update using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "exclusao_empresa" on fornecedores for delete using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());

create policy "escrita_admin" on categorias for insert with check (meu_papel() = 'admin');
create policy "edicao_admin" on categorias for update using (meu_papel() = 'admin');
create policy "exclusao_admin" on categorias for delete using (meu_papel() = 'admin');

create policy "escrita_empresa" on subcategorias for insert with check (meu_papel() in ('admin','financeiro','mestre_obra') and empresa_id = minha_empresa());
create policy "edicao_empresa" on subcategorias for update using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "exclusao_empresa" on subcategorias for delete using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());

create policy "lancamento_empresa" on despesas for insert with check (meu_papel() in ('admin','financeiro','mestre_obra') and empresa_id = minha_empresa());
create policy "edicao_empresa" on despesas for update using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "exclusao_empresa" on despesas for delete using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());

create policy "lancamento_empresa" on itens_compra for insert with check (meu_papel() in ('admin','financeiro','mestre_obra') and empresa_id = minha_empresa());
create policy "edicao_empresa" on itens_compra for update using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "exclusao_empresa" on itens_compra for delete using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());

create policy "lancamento_empresa" on anexos for insert with check (meu_papel() in ('admin','financeiro','mestre_obra') and empresa_id = minha_empresa());
create policy "exclusao_empresa" on anexos for delete using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());

create policy "lancamento_empresa" on historico_precos for insert with check (meu_papel() in ('admin','financeiro','mestre_obra') and empresa_id = minha_empresa());

create policy "lancamento_empresa" on contas_pagar for insert with check (meu_papel() in ('admin','financeiro','mestre_obra') and empresa_id = minha_empresa());
create policy "edicao_empresa" on contas_pagar for update using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());
create policy "exclusao_empresa" on contas_pagar for delete using (meu_papel() in ('admin','financeiro') and empresa_id = minha_empresa());

-- Usuários: cada um vê a própria linha; admin vê e edita só quem é da
-- MESMA empresa (crítico — sem isso um admin veria funcionário de outra
-- empresa).
create policy "ve_propria_linha_ou_admin_empresa" on usuarios
  for select using (auth_user_id = auth.uid() or (meu_papel() = 'admin' and empresa_id = minha_empresa()));
create policy "admin_edita_empresa" on usuarios
  for update using (meu_papel() = 'admin' and empresa_id = minha_empresa());

-- Empresas: cada usuário só vê o nome da própria empresa (pra mostrar na
-- tela, por exemplo). Criar empresa nova só pela Edge Function
-- "gerenciar-usuarios" (ação "criar-empresa"), que usa a service role.
alter table empresas enable row level security;
create policy "ve_propria_empresa" on empresas for select using (id = minha_empresa());

alter table permissoes_obra enable row level security;
create policy "admin_gerencia" on permissoes_obra for all using (meu_papel() = 'admin' and empresa_id = minha_empresa());
