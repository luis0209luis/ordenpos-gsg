import { useState, useEffect } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import { useTheme, useAuth } from '../context/AppContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Pause, X, Heart, Settings, CalendarX, CreditCard, ShieldCheck } from 'lucide-react'

export default function SubscriptionWrapper({ children }) {
  const { phase = 0, daysRemaining = 0, loading = false } = useSubscription() || {}
  const { theme } = useTheme() || {}
  const { user } = useAuth() || {}
  const isDark = theme === 'dark'

  const location = useLocation()
  const navigate = useNavigate()

  const [dismissPhase1, setDismissPhase1] = useState(false)
  const [showPhase2Modal, setShowPhase2Modal] = useState(false)

  // Determinar si el usuario es admin del negocio
  const isBusinessAdmin = user?.role === 'admin'

  // Phase 2: Disparar modal cada 7 minutos (solo para admin)
  useEffect(() => {
    let interval
    if (phase === 2 && isBusinessAdmin) {
      // Show immediately on first entry to Phase 2
      setShowPhase2Modal(true)
      interval = setInterval(() => {
        setShowPhase2Modal(true)
      }, 7 * 60 * 1000) // 7 minutes
    } else {
      setShowPhase2Modal(false)
    }
    return () => clearInterval(interval)
  }, [phase, isBusinessAdmin])

  // Obtener nombre para mostrar
  const getDisplayName = () => {
    if (user?.name) return user.name.split(' ')[0]
    if (user?.username) return user.username.split(' ')[0]
    return 'Administrador'
  }

  // -- Fase 3: Bloqueo Total (aplica a TODOS los usuarios) --
  if (phase === 3 && location.pathname !== '/payments') {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden ${isDark ? 'bg-dark-bg' : 'bg-light-bg'}`}>
        <div className={`flex flex-col items-center w-full max-w-md text-center shadow-2xl animate-slide-in-up border rounded-3xl overflow-hidden ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`}>
          
          {/* Header Image Section */}
          <div className={`w-full relative h-64 ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'}`}>
            <img 
              src={isDark ? '/monster-dark.png' : '/monster-light.png'} 
              alt="Suscripción Vencida" 
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 opacity-0"
              onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
              loading="eager"
            />
            {/* Subtle gradient to blend the image into the background card color */}
            <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-dark-surface' : 'from-white'} via-transparent to-transparent opacity-80`}></div>
          </div>

          {/* Content Section */}
          <div className="flex flex-col items-center gap-4 p-8 pt-4 w-full">
            <h1 className="font-display font-bold text-3xl">
              ¡Ups, Pago Vencido!
            </h1>
            <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Tu suscripción llegó a su fin y el acceso se ha pausado. Regulariza tu cuenta para seguir usando ORDENPOS sin interrupciones.
            </p>
            {isBusinessAdmin && (
              <button 
                onClick={() => navigate('/payments')}
                className="mt-4 w-full py-4 rounded-2xl font-bold uppercase tracking-widest bg-gold-gradient text-black shadow-gold-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                Ir a Pagar Ahora
              </button>
            )}
            {!isBusinessAdmin && (
              <p className={`mt-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Contacta al administrador de tu negocio para renovar la suscripción.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      
      {/* Fase 1: Banner Sigiloso (Día 3 a -2) — Solo visible para admin */}
      {phase === 1 && !dismissPhase1 && isBusinessAdmin && (
        <div className="bg-gold-gradient text-black px-4 py-2 flex items-center justify-between z-50 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Heart size={16} className="fill-black/20" />
            Parece que tu suscripción está por vencer o venció hace poco. 
            <span 
              onClick={() => navigate('/payments')}
              className="font-bold underline cursor-pointer hover:text-white transition-colors ml-1"
            >
              Mantén tu negocio al día aquí.
            </span>
          </div>
          <button onClick={() => setDismissPhase1(true)} className="p-1 hover:bg-black/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main App */}
      <div className="flex-1 overflow-hidden relative">
        {children}

        {/* Fase 2: Modal Automático (Día -3 a -5) — Solo visible para admin */}
        {phase === 2 && showPhase2Modal && isBusinessAdmin && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="relative w-full max-w-md rounded-3xl shadow-2xl animate-slide-in-up border border-white/10 bg-[#0f0f0f] overflow-hidden">

              {/* Gold top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold-gradient" />

              {/* Glow decoration */}
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-gold-500/8 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 p-8">

                {/* Icon with pulse ring */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-gold-gradient opacity-10 animate-pulse" />
                  <div className="w-20 h-20 rounded-full border border-gold-500/30 bg-[#1a1a1a] flex items-center justify-center">
                    <CreditCard size={34} className="text-gold-500" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="font-display font-bold text-2xl text-white text-center mb-1">
                  ¡Hola, <span className="text-transparent bg-clip-text bg-gold-gradient">{getDisplayName()}</span>!
                </h2>
                <p className="text-center text-sm text-gray-500 mb-6 leading-relaxed">
                  Tu suscripción está vencida. Renueva ahora para no perder el acceso a tus herramientas.
                </p>

                {/* Security badge */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/8 mb-6">
                  <ShieldCheck size={16} className="text-green-400 shrink-0" />
                  <span className="text-xs text-gray-400">
                    Pago seguro · <span className="text-white font-semibold">Nequi, Daviplata, PSE</span> y tarjetas de crédito/débito
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/payments')}
                    className="group relative w-full py-3.5 rounded-2xl font-bold uppercase tracking-widest bg-gold-gradient text-black shadow-gold-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 overflow-hidden flex items-center justify-center gap-2">
                    <CreditCard size={16} className="relative z-10" />
                    <span className="relative z-10">Renovar Ahora</span>
                    <div className="absolute inset-0 -translate-x-full bg-white/20 skew-x-[30deg] group-hover:translate-x-full transition-transform duration-700" />
                  </button>
                  <button
                    onClick={() => setShowPhase2Modal(false)}
                    className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-widest border border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                    Recordarme luego
                  </button>
                </div>

                <p className="text-center text-xs text-gray-700 mt-4">
                  Procesado de forma segura por Mercado Pago
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
