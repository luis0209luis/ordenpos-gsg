import { useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar  from '../components/Topbar'
import { useTheme, useSettings, useAuth } from '../context/AppContext'
import { useCashRegister } from '../context/CashRegisterContext'
import CashRegisterModal from '../components/CashRegisterModal'

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/orders':     'Órdenes',
  '/pos':        'Punto de Venta',
  '/menu':       'Menú / Carta',
  '/inventory':  'Inventario',
  '/customers':  'Clientes',
  '/reports':    'Reportes',
  '/payments':   'Pagos',
  '/settings':   'Configuración',
}

const CASH_ROLES = ['CAJERO']

export default function AppLayout() {
  const { theme } = useTheme()
  const { user } = useAuth() || {}
  const { isConfigured, loading } = useSettings() || {}
  const { currentRegister, loadingRegister } = useCashRegister() || {}
  const location  = useLocation()
  const isDark    = theme === 'dark'
  const title     = PAGE_TITLES[location.pathname] ?? 'ORDENPOS'
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg text-white' : 'bg-light-surface text-gray-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  // Determinar si el rol actual requiere caja (evaluación insensible a mayúsculas/minúsculas)
  const userRoleUpper = (user?.role || '').toUpperCase()
  const requiresCash = user && CASH_ROLES.includes(userRoleUpper)
  const needsOpenModal = requiresCash && !loadingRegister && !currentRegister

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-dark-bg' : 'bg-light-surface'}`}>
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className={`flex-1 overflow-auto p-4 md:p-6 animate-fade-in
          ${isDark ? 'bg-dark-bg' : 'bg-light-surface'}`}>
          <Outlet />
        </main>
      </div>

      {/* Modal de apertura de caja — obligatorio para cajeros y admins */}
      {needsOpenModal && <CashRegisterModal mode="open" />}
    </div>
  )
}
