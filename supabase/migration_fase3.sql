-- ObrAI — Fase 3: contas a pagar e relatórios
-- Rode no SQL Editor do Supabase. Não cria tabelas novas (despesas e
-- contas_pagar já existem desde a Fase 1) — só acelera as consultas por período.

create index if not exists idx_despesas_data_compra on despesas (data_compra);
create index if not exists idx_contas_pagar_status on contas_pagar (status);
