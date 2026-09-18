import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { usePermissao } from '../lib/AuthContext.jsx'

const NAV = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/obras', label: 'Obras', icon: '🏗️' },
  { to: '/despesas', label: 'Despesa', icon: '➕' },
  { to: '/relatorios', label: 'Relatórios', icon: '📊' },
  { to: '/fornecedores', label: 'Fornecedores', icon: '🧾' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const souAdmin = usePermissao('admin')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <header
        style={{
          height: 'var(--obrai-header-h)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          borderBottom: '1px solid #E4E6EA',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#fff',
          zIndex: 10,
        }}
      >
        <img src="/logo-horizontal.png" alt="ObrAI" style={{ height: 48, imageRendering: '-webkit-optimize-contrast' }} />
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
        {souAdmin && (
          <Link
            to="/usuarios"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              color: pathname === '/usuarios' ? '#F2701C' : '#0B1F3A',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            👤 Usuários
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Sair da conta?')) supabase.auth.signOut()
          }}
          style={{
            border: 'none',
            background: 'none',
            color: '#6B7280',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Sair
        </button>
      </header>

      <main
        style={{
          flex: 1,
          padding: 16,
          paddingTop: 'calc(var(--obrai-header-h) + 16px)',
          paddingBottom: 'calc(var(--obrai-nav-h) + env(safe-area-inset-bottom) + 24px)',
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          overflowX: 'hidden',
        }}
      >
        {children}
      </main>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          minHeight: 'var(--obrai-nav-h)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          background: '#0B1F3A',
          padding: '8px 4px calc(8px + env(safe-area-inset-bottom))',
          zIndex: 10,
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
                fontSize: 10.5,
                fontWeight: 600,
                flex: 1,
              }}
            >
              <span style={{ fontSize: 19 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
