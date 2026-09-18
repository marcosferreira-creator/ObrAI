import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/obras', label: 'Obras', icon: '🏗️' },
  { to: '/despesas', label: 'Despesa', icon: '➕' },
  { to: '/relatorios', label: 'Relatórios', icon: '📊' },
  { to: '/fornecedores', label: 'Fornecedores', icon: '🧾' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          borderBottom: '1px solid #E4E6EA',
          position: 'sticky',
          top: 0,
          background: '#fff',
          zIndex: 10,
        }}
      >
        <img src="/logo-horizontal.png" alt="ObrAI" style={{ height: 28 }} />
        <Link
          to="/assistente"
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            color: pathname === '/assistente' ? '#F2701C' : '#0B1F3A',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          💬 Assistente
        </Link>
      </header>

      <main style={{ flex: 1, padding: 16, paddingBottom: 90, maxWidth: 720, width: '100%', margin: '0 auto' }}>
        {children}
      </main>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-around',
          background: '#0B1F3A',
          padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
        }}
      >
        {NAV.map((item) => {
          const active = pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                textDecoration: 'none',
                color: active ? '#F2701C' : '#C9D2E0',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
