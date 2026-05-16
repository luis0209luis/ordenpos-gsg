import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth, useTheme, useSettings } from '../context/AppContext'
import OrdenposLogo from './OrdenposLogo'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Utensils,
  ClipboardList,
  Warehouse,
  CreditCard,
  ShieldAlert,

  Truck,
  DollarSign,
  LifeBuoy
} from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'Dashboard',    path: '/dashboard',  icon: LayoutDashboard, roles: ['admin', 'Superadmin', 'CAJERO'] },
  { label: 'Punto de Venta', path: '/pos',      icon: ShoppingCart,    roles: ['admin', 'Superadmin', 'CAJERO'] },
  { label: 'Monitor de Órdenes', path: '/kitchen', icon: Utensils,     roles: ['admin', 'Superadmin', 'PREPARADOR'] },
  { label: 'Domicilios',   path: '/deliveries', icon: Truck,           roles: ['admin', 'Superadmin', 'CAJERO', 'DOMICILIARIO'] },
  { label: 'Inventario',   path: '/inventory',  icon: Warehouse,       roles: ['admin', 'Superadmin', 'CAJERO'] },
  { label: 'Finanzas y Nómina', path: '/finance', icon: DollarSign,    roles: ['admin', 'Superadmin'] },
  { label: 'Reportes',     path: '/reports',    icon: BarChart3,       roles: ['admin', 'Superadmin'] },
  { label: 'Soporte',      path: '/support',    icon: LifeBuoy,        roles: ['admin', 'Superadmin', 'CAJERO'] },
  { label: 'Mi Suscripción', path: '/payments',   icon: CreditCard,      roles: ['admin', 'Superadmin'] },
  { label: 'Configuración',path: '/settings',   icon: Settings,        roles: ['admin', 'Superadmin'] },
  { label: 'Admin Master', path: '/admin',      icon: ShieldAlert,     roles: ['Superadmin'] },
]


export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth()
  const { theme }        = useTheme()
  const { staff }        = useSettings()
  const location         = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const isDark = theme === 'dark'
  
  const hasPreparador = staff.some(s => s.role === 'PREPARADOR')

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`
        fixed md:relative top-0 left-0 flex flex-col h-[100dvh] shrink-0 z-50 md:z-20
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${collapsed ? 'md:w-[72px] w-[240px]' : 'w-[240px]'}
        ${isDark
          ? 'bg-sidebar-dark border-r border-dark-border'
          : 'bg-white border-r border-light-border shadow-soft'}
      `}>

      {/* Gold top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold-gradient" />

      {/* Logo + Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 mt-1 overflow-hidden
        ${collapsed ? 'justify-center' : ''}`}>
        <div className="shrink-0">
          <OrdenposLogo size={36} />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="font-display font-black text-lg leading-none gold-text tracking-tight">
              ORDENPOS
            </h1>
            <p className={`text-[10px] font-semibold tracking-widest uppercase mt-0.5
              ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              POS System
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={`mx-3 mb-3 h-px ${isDark ? 'bg-dark-border' : 'bg-light-border'}`} />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5">
        {NAV_ITEMS.filter(item => {
          if (user?.role === 'Superadmin') return true;
          if (user?.role === 'admin') return item.path !== '/admin'; // Local admin can't see Admin Master
          
          if (!user?.permissions?.includes(item.path)) return false;

          if (item.path === '/kitchen' && !hasPreparador && user?.role !== 'PREPARADOR') return false;
          return true;
        }).map(({ label, path, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <NavLink
              key={path}
              to={path}
              id={`nav-${path.replace('/', '')}`}
              onClick={() => setMobileOpen && setMobileOpen(false)}
              className={({ isActive: active }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 group relative overflow-hidden
                ${collapsed ? 'justify-center' : ''}
                ${active || isActive
                  ? isDark
                    ? 'bg-gold-500/10 text-gold-400'
                    : 'bg-gold-100 text-gold-700'
                  : isDark
                    ? 'text-gray-400 hover:bg-dark-card hover:text-white'
                    : 'text-gray-600 hover:bg-light-surface hover:text-gray-900'}
              `}
            >
              {({ isActive: active }) => (
                <>
                  {/* Active left indicator */}
                  {(active || isActive) && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gold-gradient shadow-gold-sm" />
                  )}
                  <Icon size={18} className={`shrink-0 transition-transform duration-200
                    ${(active || isActive) ? 'text-gold-400' : ''}
                    group-hover:scale-110`}
                  />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{label}</span>
                  )}
                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <span className={`
                      absolute left-full ml-3 px-2.5 py-1.5 text-xs font-semibold rounded-lg
                      opacity-0 group-hover:opacity-100 pointer-events-none
                      whitespace-nowrap transition-all duration-200 translate-x-[-4px] group-hover:translate-x-0
                      ${isDark
                        ? 'bg-dark-card border border-dark-border text-white shadow-dark-sm'
                        : 'bg-white border border-light-border text-gray-900 shadow-soft'}
                    `}>
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Divider */}
      <div className={`mx-3 mt-2 mb-3 h-px ${isDark ? 'bg-dark-border' : 'bg-light-border'}`} />

      {/* User + Logout */}
      <div className={`px-2 pb-4 space-y-1`}>
        {/* User info */}
        {!collapsed && (
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl animate-fade-in
            ${isDark ? 'bg-dark-card' : 'bg-light-surface'}`}>
            <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-dark-bg">
                {user?.username?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate
                ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {user?.username ?? 'Usuario'}
              </p>
              <p className={`text-[10px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {user?.role ?? 'Rol'}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          id="sidebar-logout"
          onClick={logout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-sm font-medium transition-all duration-200 group
            ${collapsed ? 'justify-center' : ''}
            ${isDark
              ? 'text-gray-500 hover:bg-red-500/10 hover:text-red-400'
              : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}
          `}
        >
          <LogOut size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>Cerrar Sesión</span>}
          {collapsed && (
            <span className={`
              absolute left-full ml-3 px-2.5 py-1.5 text-xs font-semibold rounded-lg
              opacity-0 group-hover:opacity-100 pointer-events-none
              whitespace-nowrap transition-all duration-200
              ${isDark ? 'bg-dark-card border border-dark-border text-red-400' : 'bg-white border border-light-border text-red-500'}
            `}>
              Cerrar Sesión
            </span>
          )}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        id="sidebar-collapse-toggle"
        onClick={() => setCollapsed(c => !c)}
        className={`
          absolute -right-3.5 top-[68px]
          w-7 h-7 rounded-full flex items-center justify-center
          border shadow-gold-sm transition-all duration-200
          hover:scale-110 hover:shadow-gold-md z-30
          ${isDark
            ? 'bg-dark-surface border-dark-border text-gold-400'
            : 'bg-white border-light-border text-gold-600'}
        `}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
    </>
  )
}
