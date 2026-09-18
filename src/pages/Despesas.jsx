import { Link } from 'react-router-dom'
import { usePermissao } from '../lib/AuthContext.jsx'

const OPCOES = [
  { to: '/despesas/foto', titulo: 'Tirar foto da nota', desc: 'A IA lê a nota pra você — só confirma os dados.', icone: '📷' },
  { to: '/despesas/xml', titulo: 'Enviar XML da nota', desc: 'Para NF-e/NFC-e — mais preciso, sem digitar nada.', icone: '📄' },
  { to: '/despesas/nova', titulo: 'Lançar manualmente', desc: 'Digite os dados da nota você mesmo.', icone: '✍️' },
]

export default function Despesas() {
  const podeLancar = usePermissao('admin', 'financeiro', 'mestre_obra')

  if (!podeLancar) {
    return <div className="card" style={{ color: '#6B7280' }}>Seu acesso é somente visualização — você não pode lançar despesas.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>Nova despesa</div>
      {OPCOES.map((o) => (
        <Link
          key={o.to}
          to={o.to}
          className="card"
          style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
        >
          <span style={{ fontSize: 26 }}>{o.icone}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{o.titulo}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{o.desc}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}
