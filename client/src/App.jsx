import { BrowserRouter, Routes, Route } from 'react-router-dom'
import OrderProvider from './context/OrderProvider'
import AuthProvider from './context/AuthProvider'
import { ToastProvider } from './context/ToastContext'
import Home from './pages/Home/Home'
import Empresa from './pages/Empresa/Empresa'
import Auth from './pages/Auth/Auth'
import Menu from './pages/Menu/Menu'
import Customize from './pages/Customize/Customize'
import OrderSummary from './pages/OrderSummary/OrderSummary'
import Delivery from './pages/Delivery/Delivery'
import Checkout from './pages/Checkout/Checkout'
import Confirmation from './pages/Confirmation/Confirmation'
import Sorteio from './pages/Sorteio/Sorteio'
import Streak from './pages/Streak/Streak'
import Planos from './pages/Planos/Planos'
import Perfil from './pages/Perfil/Perfil'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrderProvider>
          <ToastProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            {/* empresa em standby — rota mantida mas fora do fluxo principal (sem links no Navbar) */}
            <Route path="/empresa" element={<Empresa />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/customize" element={<Customize />} />
            <Route path="/order-summary" element={<OrderSummary />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/sorteio" element={<Sorteio />} />
            <Route path="/streak" element={<Streak />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/perfil" element={<Perfil />} />
          </Routes>
          </ToastProvider>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}