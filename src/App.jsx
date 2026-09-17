import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
import Relatorios from './pages/Relatorios.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = carregando, null = deslogado

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Carregando…</div>
  }

  if (!session) {
    return <Login />
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
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
