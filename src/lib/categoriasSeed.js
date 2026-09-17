// Seed inicial de categorias e subcategorias de construção civil.
// Usado para popular a tabela `categorias`/`subcategorias` no primeiro setup
// (ver supabase/schema.sql) e como fallback local caso o banco ainda não tenha sido semeado.

export const CATEGORIAS_SEED = [
  { nome: 'Fundação', subcategorias: ['Sapata', 'Radier', 'Estaca', 'Impermeabilização'] },
  { nome: 'Estrutura', subcategorias: ['Concreto', 'Aço', 'Forma', 'Laje'] },
  { nome: 'Alvenaria', subcategorias: ['Bloco', 'Tijolo', 'Argamassa', 'Reboco'] },
  { nome: 'Cobertura', subcategorias: ['Telha', 'Madeiramento', 'Calha', 'Impermeabilização'] },
  { nome: 'Hidráulica', subcategorias: ['Tubulação', 'Louças', 'Metais', 'Caixa d\'água'] },
  { nome: 'Elétrica', subcategorias: ['Fiação', 'Quadro', 'Tomadas', 'Iluminação'] },
  { nome: 'Acabamento', subcategorias: ['Piso', 'Revestimento', 'Gesso', 'Rejunte'] },
  { nome: 'Pintura', subcategorias: ['Tinta', 'Massa corrida', 'Verniz'] },
  { nome: 'Esquadrias', subcategorias: ['Porta', 'Janela', 'Vidro', 'Ferragem'] },
  { nome: 'Marcenaria', subcategorias: ['Móvel planejado', 'Bancada', 'Armário'] },
  { nome: 'Serralheria', subcategorias: ['Portão', 'Grade', 'Estrutura metálica'] },
  { nome: 'Climatização', subcategorias: ['Ar-condicionado', 'Ventilação'] },
  { nome: 'Mão de obra', subcategorias: ['Pedreiro', 'Servente', 'Empreiteiro', 'Diarista'] },
  { nome: 'Equipamentos', subcategorias: ['Aluguel', 'Manutenção', 'Combustível'] },
  { nome: 'Transporte', subcategorias: ['Frete', 'Combustível', 'Pedágio'] },
  { nome: 'Projetos', subcategorias: ['Arquitetônico', 'Estrutural', 'Elétrico', 'Hidráulico'] },
  { nome: 'Taxas', subcategorias: ['Prefeitura', 'Cartório', 'ART/RRT'] },
  { nome: 'Administração', subcategorias: ['Escritório', 'Software', 'Diversos'] },
]
