import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar  from '../components/Topbar'
import { useTheme } from '../context/AppContext'
import FeedbackWidget from '../components/FeedbackWidget'

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

export default function AppLayout() {
  const { theme } = useTheme()
  const location  = useLocation()
  const isDark    = theme === 'dark'
  const title     = PAGE_TITLES[location.pathname] ?? 'ORDENPOS'
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-dark-bg' : 'bg-light-surface'}`}>
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className={`flex-1 overflow-auto p-4 md:p-6 animate-fade-in
          ${isDark ? 'bg-dark-bg' : 'bg-light-surface'}`}>
          <Outlet />
        </main>
        <FeedbackWidget />
      </div>
    </div>
  )
}
