// Converte texto digitado pelo usuário em número — aceita tanto o formato
// brasileiro (1.234,56 ou 1234,56) quanto o formato com ponto decimal
// (1234.56), pra evitar o bug de "coloquei vírgula e ponto e o valor ficou
// errado" em campos numéricos no celular.
export function parseValorBR(texto) {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : 0
  if (!texto) return 0

  let s = String(texto).trim().replace(/[^\d,.-]/g, '')
  if (!s) return 0

  const temVirgula = s.includes(',')
  const temPonto = s.includes('.')

  if (temVirgula && temPonto) {
    // 1.234,56 -> ponto é separador de milhar, vírgula é decimal
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    // só vírgula -> é o separador decimal
    s = s.replace(',', '.')
  }
  // só ponto (ou nada) -> já está no formato que o parseFloat entende

  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
