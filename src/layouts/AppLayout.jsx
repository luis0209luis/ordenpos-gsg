import { useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar  from '../components/Topbar'
import { useTheme, useSettings, useAuth } from '../context/AppContext'

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
  const { user } = useAuth() || {}
  const { isConfigured, loading } = useSettings() || {}
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

  // Force local admin to configure business settings first
  if (user && user.role === 'admin' && !isConfigured && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />
  }

  // If another staff role logs in but the business isn't configured, show a blocked screen
  if (user && user.role !== 'admin' && user.role !== 'Superadmin' && !isConfigured) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center p-6 text-center ${isDark ? 'bg-dark-bg text-white' : 'bg-light-surface text-gray-900'}`}>
        <h2 className="text-2xl font-bold mb-2">Configuración Requerida</h2>
        <p className="text-gray-500 max-w-md">
          El administrador de este negocio aún no ha completado la configuración inicial del sistema. 
          Por favor, solicita al dueño del negocio que configure la información básica para activar la aplicación.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-6 py-2.5 bg-gold-gradient text-black font-bold rounded-xl transition-all hover:scale-105"
        >
          Reintentar
        </button>
      </div>
    )
  }

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
    </div>
  )
}
