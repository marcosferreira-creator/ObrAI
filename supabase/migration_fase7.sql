-- ObrAI — Fase 7: ajustes de usabilidade
-- 1) Excluir uma etapa não pode mais travar por causa de despesas já
--    lançadas nela — em vez de dar erro, a despesa só fica sem etapa.
-- 2) status_pagamento das despesas ganha o valor "parcial", pra suportar
--    pagamento parcelado (ex: empreiteiro pago conforme entrega).

-- 1) Troca a foreign key despesas.etapa_id -> etapas(id) pra "on delete set null"
do $$
declare
  fkname text;
begin
  select conname into fkname
  from pg_constraint
  where conrelid = 'despesas'::regclass
    and confrelid = 'etapas'::regclass
    and contype = 'f';
  if fkname is not null then
    execute format('alter table despesas drop constraint %I', fkname);
  end if;
end $$;

alter table despesas
  add constraint despesas_etapa_id_fkey
  foreign key (etapa_id) references etapas(id) on delete set null;

-- 2) Adiciona "parcial" ao check constraint de status_pagamento
do $$
declare
  ckname text;
begin
  select conname into ckname
  from pg_constraint
  where conrelid = 'despesas'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status_pagamento%';
  if ckname is not null then
    execute format('alter table despesas drop constraint %I', ckname);
  end if;
end $$;

alter table despesas
  add constraint despesas_status_pagamento_check
  check (status_pagamento in ('pendente','parcial','pago','vencido'));
