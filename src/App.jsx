import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import { supabase } from './lib/supabaseClient'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Obras from './pages/Obras.jsx'
import ObraDetalhe from './pages/ObraDetalhe.jsx'
import Fornecedores from './pages/Fornecedores.jsx'
import NovaDespesa from './pages/NovaDespesa.jsx'
import Despesas from './pages/Despesas.jsx'
import CapturarFoto from './pages/CapturarFoto.jsx'
import CapturarXML from './pages/CapturarXML.jsx'
import ConfirmarDespesa from './pages/ConfirmarDespesa.jsx'
import DespesaDetalhe from './pages/DespesaDetalhe.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Assistente from './pages/Assistente.jsx'
import UsuariosAdmin from './pages/UsuariosAdmin.jsx'

function AppInterno() {
  const { session, usuario, carregandoUsuario } = useAuth()

  if (session === undefined) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Carregando…</div>
  }

  if (!session) {
    return <Login />
  }

  if (carregandoUsuario) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Carregando…</div>
  }

  if (!usuario || !usuario.ativo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Acesso não liberado</div>
          <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
            Sua conta não tem acesso liberado no ObrAI. Fale com o administrador.
          </div>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/obras" element={<Obras />} />
        <Route path="/obras/:id" element={<ObraDetalhe />} />
        <Route path="/fornecedores" element={<Fornecedores />} />
        <Route path="/despesas" element={<Despesas />} />
        <Route path="/despesas/nova" element={<NovaDespesa />} />
        <Route path="/despesas/foto" element={<CapturarFoto />} />
        <Route path="/despesas/xml" element={<CapturarXML />} />
        <Route path="/despesas/confirmar" element={<ConfirmarDespesa />} />
        <Route path="/despesas/:id" element={<DespesaDetalhe />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/assistente" element={<Assistente />} />
        <Route path="/usuarios" element={<UsuariosAdmin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInterno />
    </AuthProvider>
  )
}
