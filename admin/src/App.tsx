import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AdminProvider } from './context/AdminContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { useAdminAuth } from './context/useAdminAuth'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Login } from './pages/Login/Login'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Dishes } from './pages/Dishes/Dishes'
import { Orders } from './pages/Orders/Orders'
import { Extras } from './pages/Extras/Extras'
import { Empresas } from './pages/Empresas/Empresas'
import { Settings } from './pages/Settings/Settings'
import { PratoDoDia } from './pages/PratoDoDia/PratoDoDia'
import { MenuDia } from './pages/MenuDia/MenuDia'
import { SorteioAdmin } from './pages/SorteioAdmin/SorteioAdmin'
import { Streak } from './pages/Streak/Streak'
import { Planos } from './pages/Planos/Planos'
import './App.css'

/** Painel autenticado: só monta o AdminProvider (que carrega dados) após login. */
function Panel() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <div className="app">
          <Sidebar />
          <main className="main">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dishes" element={<Dishes />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/extras" element={<Extras />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/menu-dia" element={<MenuDia />} />
              <Route path="/prato-do-dia" element={<PratoDoDia />} />
              <Route path="/sorteio" element={<SorteioAdmin />} />
              <Route path="/streak" element={<Streak />} />
              <Route path="/planos" element={<Planos />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AdminProvider>
  )
}

/** Decide entre ecrã de login e painel consoante a sessão de admin. */
function AuthGate() {
  const { admin, loading } = useAdminAuth()

  if (loading) {
    return <div className="app-loading">A carregar…</div>
  }

  return admin ? <Panel /> : <Login />
}

function App() {
  return (
    <AdminAuthProvider>
      <AuthGate />
    </AdminAuthProvider>
  )
}

export default App
