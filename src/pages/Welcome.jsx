import React, { useState, useEffect } from 'react'
import { useAuth, useTheme, useSettings } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from '../components/Sidebar'
import OrdenposLogo from '../components/OrdenposLogo'
import { Clock } from 'lucide-react'

export default function Welcome() {
  const { user } = useAuth() || {}
  const { theme } = useTheme() || {}
  const { staff = [], settings = {} } = useSettings() || {}
  const navigate = useNavigate()
  const isDark = theme === 'dark'
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isFirstTime, setIsFirstTime] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (user) {
      const userKey = user.id || user.username || 'default_user';
      const welcomedKey = `ordenpos_welcomed_${userKey}`;
      const hasBeenWelcomed = localStorage.getItem(welcomedKey);
      if (!hasBeenWelcomed) {
        setIsFirstTime(true);
        localStorage.setItem(welcomedKey, 'true');
      }
    }
  }, [user])

  const getDisplayName = () => {
    if (user?.role === 'admin' || user?.role === 'Superadmin') {
      if (settings?.ownerName) return settings.ownerName;
      const businesses = JSON.parse(localStorage.getItem('ordenpos_businesses') || '[]');
      const match = businesses.find(b => b.id === user?.businessId);
      if (match?.owner) return match.owner;
      return 'Administrador';
    }
    const fullName = user?.name || user?.username || 'Usuario';
    return fullName.split(' ')[0];
  }
  const displayName = getDisplayName();

  const getGender = () => {
    // Use gender field if available
    if (user?.gender) return user.gender; // 'M' or 'F'
    // Heuristic: check last letter of first name in Spanish
    const firstName = (user?.name || user?.username || '').trim().split(' ')[0].toLowerCase();
    const femaleEndings = ['a', 'e', 'ía', 'ia', 'ina', 'isa'];
    if (femaleEndings.some(end => firstName.endsWith(end))) return 'F';
    return 'M';
  }

  const isFemale = getGender() === 'F';

  const getMotivationalMessage = () => {
    const role = user?.role?.toUpperCase();
    if (role === 'DOMICILIARIO') return isFemale ? '¿Lista para realizar los envíos hoy?' : '¿Listo para realizar los envíos hoy?';
    if (role === 'CAJERO') return isFemale ? '¿Lista para una jornada de grandes ventas?' : '¿Listo para una jornada de grandes ventas?';
    if (role === 'PREPARADOR') return isFemale ? '¿Lista para despachar todas las órdenes?' : '¿Listo para despachar todas las órdenes?';
    return isFemale ? '¿Lista para poner en orden el negocio hoy?' : '¿Listo para poner en orden el negocio hoy?';
  }
  
  // Verify if a preparador exists to optionally hide kitchen
  const hasPreparador = staff?.some(s => s.role === 'PREPARADOR')

  // Filter allowed modules for quick actions
  const allowedModules = NAV_ITEMS.filter(item => {
    // Exclude settings, admin master and billing from quick actions usually, or let them be
    if (item.path === '/admin') return false; // Admin master hidden
    if (user?.role === 'Superadmin') return true;
    if (user?.role === 'admin') return true;
    if (!user?.permissions?.includes(item.path)) return false;
    if (item.path === '/kitchen' && !hasPreparador && user?.role !== 'PREPARADOR') return false;
    return true;
  })

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
  
  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-6 animate-fade-in
      ${isDark ? 'bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
      
      {/* Top Logo (Subtle) */}
      <div className="absolute top-8 left-8 opacity-40 hover:opacity-100 transition-opacity">
        <OrdenposLogo />
      </div>

      <div className="w-full max-w-4xl flex flex-col items-center text-center">
        
        {/* Live Clock */}
        <div className={`flex items-center gap-2 mb-8 px-4 py-2 rounded-2xl border backdrop-blur-sm shadow-sm
          ${isDark ? 'bg-dark-card/50 border-dark-border text-gray-300' : 'bg-white/50 border-gray-200 text-gray-600'}`}>
          <Clock size={16} className="text-gold-500" />
          <span className="font-display font-bold tracking-wide">{formatTime(currentTime)}</span>
          <span className="opacity-50 mx-1">|</span>
          <span className="text-xs uppercase tracking-wider font-semibold capitalize">{formatDate(currentTime)}</span>
        </div>
        
        {/* Dynamic Greeting */}
        <h1 className={`font-display font-black text-4xl md:text-5xl lg:text-6xl mb-4 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {isFirstTime ? (isFemale ? '¡Bienvenida,' : '¡Bienvenido,') : (isFemale ? '¡Hola de nuevo,' : '¡Hola de nuevo,')} <span className="text-transparent bg-clip-text bg-gold-gradient">{displayName}</span>!
        </h1>
        
        {/* Motivational Message */}
        <p className={`text-lg md:text-xl font-medium mb-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {getMotivationalMessage()}
        </p>

        {/* Quick Actions Grid */}
        <div className="w-full">
          <h3 className={`text-sm font-bold uppercase tracking-widest mb-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Accesos Rápidos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allowedModules.map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`group flex items-center p-6 rounded-2xl border text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-soft-xl
                  ${isDark 
                    ? 'bg-dark-card border-dark-border hover:border-gold-500/50 hover:bg-dark-surface' 
                    : 'bg-white border-light-border hover:border-gold-300 hover:bg-gold-50/30'}`}
              >
                <div className={`p-4 rounded-xl mr-4 transition-colors
                  ${isDark ? 'bg-dark-bg group-hover:bg-gold-500/10' : 'bg-gray-50 group-hover:bg-gold-500/10'}`}>
                  <Icon size={28} className={`transition-colors ${isDark ? 'text-gray-400 group-hover:text-gold-400' : 'text-gray-500 group-hover:text-gold-600'}`} />
                </div>
                <div>
                  <h4 className={`font-bold text-lg mb-1 transition-colors ${isDark ? 'text-gray-200 group-hover:text-gold-400' : 'text-gray-800 group-hover:text-gold-600'}`}>
                    {label}
                  </h4>
                  <p className={`text-xs font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Ir a {label.toLowerCase()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
