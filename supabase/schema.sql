-- ObrAI — schema inicial (Fase 1: base)
-- Rode este arquivo no SQL Editor do seu projeto Supabase.
-- Decisões já fechadas com o usuário:
--   * Categoria/subcategoria fica em itens_compra (por item), não em despesas.
--   * despesas.data_compra é editável; criado_em é o timestamp automático de lançamento.
--   * Login único por enquanto — RLS já preparado para permissoes_obra, mas sem uso multiusuário ainda.

create extension if not exists "uuid-ossp";

create table if not exists usuarios (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel text not null default 'admin' check (papel in ('admin','financeiro','engenheiro','mestre_obra','comprador','visualizacao')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists obras (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  endereco text,
  orcamento_previsto numeric(14,2) not null default 0,
  status text not null default 'planejamento' check (status in ('planejamento','em_andamento','concluida','pausada')),
  data_inicio date,
  criado_em timestamptz not null default now()
);

create table if not exists etapas (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references obras (id) on delete cascade,
  nome text not null,
  ordem int not null default 0
);

create table if not exists categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique
);

create table if not exists subcategorias (
  id uuid primary key default uuid_generate_v4(),
  categoria_id uuid not null references categorias (id) on delete cascade,
  nome text not null,
  unique (categoria_id, nome)
);

create table if not exists fornecedores (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cnpj text,
  telefone text,
  endereco text,
  criado_em timestamptz not null default now()
);

create table if not exists despesas (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references obras (id),
  etapa_id uuid references etapas (id),
  fornecedor_id uuid references fornecedores (id),
  valor_total numeric(14,2) not null default 0,
  data_compra date not null default current_date,
  criado_em timestamptz not null default now(),
  forma_pagamento text,
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente','pago','vencido')),
  anexo_url text,
  origem text not null default 'manual' check (origem in ('manual','foto','xml','qrcode'))
);

create table if not exists itens_compra (
  id uuid primary key default uuid_generate_v4(),
  despesa_id uuid not null references despesas (id) on delete cascade,
  produto text not null,
  categoria_id uuid references categorias (id),
  subcategoria_id uuid references subcategorias (id),
  categoria_confirmada boolean not null default false,
  quantidade numeric(12,3) not null default 1,
  unidade text,
  preco_unitario numeric(14,2) not null default 0,
  frete numeric(14,2) not null default 0,
  desconto numeric(14,2) not null default 0,
  valor_total numeric(14,2) not null default 0
);

create table if not exists contas_pagar (
  id uuid primary key default uuid_generate_v4(),
  despesa_id uuid not null references despesas (id) on delete cascade,
  fornecedor_id uuid references fornecedores (id),
  valor numeric(14,2) not null default 0,
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente','pago','vencido')),
  data_pagamento date
);

create table if not exists anexos (
  id uuid primary key default uuid_generate_v4(),
  despesa_id uuid not null references despesas (id) on delete cascade,
  tipo text not null check (tipo in ('nota','recibo','pix','boleto','orcamento','foto','pdf')),
  url text not null,
  dados_extraidos jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists historico_precos (
  id uuid primary key default uuid_generate_v4(),
  produto text not null,
  fornecedor_id uuid references fornecedores (id),
  preco_unitario numeric(14,2) not null,
  data date not null default current_date
);

create table if not exists permissoes_obra (
  usuario_id uuid not null references usuarios (id) on delete cascade,
  obra_id uuid not null references obras (id) on delete cascade,
  papel text not null,
  primary key (usuario_id, obra_id)
);

-- Índices de apoio
create index if not exists idx_despesas_obra on despesas (obra_id);
create index if not exists idx_itens_compra_despesa on itens_compra (despesa_id);
create index if not exists idx_itens_compra_categoria on itens_compra (categoria_id);
create index if not exists idx_contas_pagar_venc on contas_pagar (vencimento);

-- Seed de categorias (rode uma vez; ver src/lib/categoriasSeed.js para a lista completa)
insert into categorias (nome) values
  ('Fundação'), ('Estrutura'), ('Alvenaria'), ('Cobertura'), ('Hidráulica'),
  ('Elétrica'), ('Acabamento'), ('Pintura'), ('Esquadrias'), ('Marcenaria'),
  ('Serralheria'), ('Climatização'), ('Mão de obra'), ('Equipamentos'),
  ('Transporte'), ('Projetos'), ('Taxas'), ('Administração')
on conflict (nome) do nothing;

-- RLS: preparado, mas liberado para o usuário autenticado único por enquanto.
-- Quando entrar multiusuário, trocar estas policies por checagem via permissoes_obra.
alter table obras enable row level security;
alter table etapas enable row level security;
alter table despesas enable row level security;
alter table itens_compra enable row level security;
alter table fornecedores enable row level security;
alter table contas_pagar enable row level security;
alter table anexos enable row level security;
alter table historico_precos enable row level security;
alter table categorias enable row level security;
alter table subcategorias enable row level security;

create policy "authenticated_full_access" on obras for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on etapas for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on despesas for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on itens_compra for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on fornecedores for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on contas_pagar for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on anexos for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on historico_precos for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on categorias for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on subcategorias for all using (auth.role() = 'authenticated');
