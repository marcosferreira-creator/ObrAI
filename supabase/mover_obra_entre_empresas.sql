-- ObrAI — script avulso: mover uma obra (e tudo ligado a ela) de uma
-- empresa pra outra. Use isso pra corrigir dados que foram lançados na
-- empresa errada (ex: uma obra do Gustavo que ficou lançada na sua).
--
-- COMO USAR — 3 passos, sempre no SQL Editor do Supabase:

-- ============================================================
-- PASSO 1: descobrir o ID da obra certa (tem duas "Reforma casa 469")
-- ============================================================
select o.id as obra_id, o.nome, o.empresa_id, e.nome as empresa_atual,
       coalesce(sum(d.valor_total), 0) as total_lancado
from obras o
join empresas e on e.id = o.empresa_id
left join despesas d on d.obra_id = o.id
where o.nome ilike '%469%'
group by o.id, o.nome, o.empresa_id, e.nome;

-- Roda esse select e confere: a que tem total_lancado = 22.794,00 é a
-- que tem os dados de verdade. Copia o "obra_id" dela.

-- ============================================================
-- PASSO 2: descobrir o ID da empresa do Gustavo
-- ============================================================
select id as empresa_id, nome from empresas;

-- Copia o id da linha "Empresa do Gustavo Fusari" (ou o nome que você deu).

-- ============================================================
-- PASSO 3: mover — cole os dois IDs copiados acima nas duas linhas
-- "declare" abaixo e roda o bloco inteiro de uma vez.
-- ============================================================
do $$
declare
  v_obra_id uuid := 'COLE_AQUI_O_OBRA_ID';        -- <- troque
  v_empresa_destino uuid := 'COLE_AQUI_O_EMPRESA_ID'; -- <- troque
begin
  -- obra
  update obras set empresa_id = v_empresa_destino where id = v_obra_id;

  -- etapas da obra
  update etapas set empresa_id = v_empresa_destino where obra_id = v_obra_id;

  -- despesas da obra
  update despesas set empresa_id = v_empresa_destino where obra_id = v_obra_id;

  -- itens e contas a pagar e anexos, via despesa
  update itens_compra set empresa_id = v_empresa_destino
    where despesa_id in (select id from despesas where obra_id = v_obra_id);

  update contas_pagar set empresa_id = v_empresa_destino
    where despesa_id in (select id from despesas where obra_id = v_obra_id);

  update anexos set empresa_id = v_empresa_destino
    where despesa_id in (select id from despesas where obra_id = v_obra_id);

  raise notice 'Obra % movida pra empresa %.', v_obra_id, v_empresa_destino;
end $$;

-- ============================================================
-- PASSO 4 (opcional, mas recomendado): fornecedores usados só nessa obra
-- ============================================================
-- Se o fornecedor lançado nessa obra é específico dela (não usado em
-- nenhuma outra obra sua), mova ele também — senão o Gustavo vê a
-- despesa mas o nome do fornecedor aparece em branco pra ele (RLS).
-- Primeiro veja quais fornecedores estão em jogo e se são usados em
-- outro lugar:
select f.id, f.nome,
       count(*) filter (where d.obra_id = 'COLE_AQUI_O_OBRA_ID') as usos_nessa_obra,
       count(*) filter (where d.obra_id <> 'COLE_AQUI_O_OBRA_ID') as usos_em_outras_obras
from fornecedores f
join despesas d on d.fornecedor_id = f.id
where f.id in (select fornecedor_id from despesas where obra_id = 'COLE_AQUI_O_OBRA_ID' and fornecedor_id is not null)
group by f.id, f.nome;

-- Pros fornecedores com "usos_em_outras_obras" = 0, pode mover com
-- segurança (troque o id do fornecedor abaixo e repita pra cada um):
-- update fornecedores set empresa_id = 'COLE_AQUI_O_EMPRESA_ID' where id = 'ID_DO_FORNECEDOR';
