-- ObrAI — corrige subcategorias vazias
-- O schema.sql original semeava as categorias, mas não as subcategorias —
-- por isso o campo "Subcategoria" sempre aparecia vazio. Rode este arquivo
-- uma vez no SQL Editor do Supabase.
--
-- Isso só cria as subcategorias que ainda não existem (on conflict do
-- nothing) — se você já criou algumas manualmente pelo app, elas continuam.

insert into subcategorias (categoria_id, nome)
select c.id, s.nome
from categorias c
join (values
  ('Fundação','Sapata'), ('Fundação','Radier'), ('Fundação','Estaca'), ('Fundação','Impermeabilização'),
  ('Estrutura','Concreto'), ('Estrutura','Aço'), ('Estrutura','Forma'), ('Estrutura','Laje'),
  ('Alvenaria','Bloco'), ('Alvenaria','Tijolo'), ('Alvenaria','Argamassa'), ('Alvenaria','Reboco'),
  ('Cobertura','Telha'), ('Cobertura','Madeiramento'), ('Cobertura','Calha'), ('Cobertura','Impermeabilização'),
  ('Hidráulica','Tubulação'), ('Hidráulica','Louças'), ('Hidráulica','Metais'), ('Hidráulica','Caixa d''água'),
  ('Elétrica','Fiação'), ('Elétrica','Quadro'), ('Elétrica','Tomadas'), ('Elétrica','Iluminação'),
  ('Acabamento','Piso'), ('Acabamento','Revestimento'), ('Acabamento','Gesso'), ('Acabamento','Rejunte'),
  ('Pintura','Tinta'), ('Pintura','Massa corrida'), ('Pintura','Verniz'),
  ('Esquadrias','Porta'), ('Esquadrias','Janela'), ('Esquadrias','Vidro'), ('Esquadrias','Ferragem'),
  ('Marcenaria','Móvel planejado'), ('Marcenaria','Bancada'), ('Marcenaria','Armário'),
  ('Serralheria','Portão'), ('Serralheria','Grade'), ('Serralheria','Estrutura metálica'),
  ('Climatização','Ar-condicionado'), ('Climatização','Ventilação'),
  ('Mão de obra','Pedreiro'), ('Mão de obra','Servente'), ('Mão de obra','Empreiteiro'), ('Mão de obra','Diarista'),
  ('Equipamentos','Aluguel'), ('Equipamentos','Manutenção'), ('Equipamentos','Combustível'),
  ('Transporte','Frete'), ('Transporte','Combustível'), ('Transporte','Pedágio'),
  ('Projetos','Arquitetônico'), ('Projetos','Estrutural'), ('Projetos','Elétrico'), ('Projetos','Hidráulico'),
  ('Taxas','Prefeitura'), ('Taxas','Cartório'), ('Taxas','ART/RRT'),
  ('Administração','Escritório'), ('Administração','Software'), ('Administração','Diversos')
) as s(categoria_nome, nome) on s.categoria_nome = c.nome
on conflict (categoria_id, nome) do nothing;
