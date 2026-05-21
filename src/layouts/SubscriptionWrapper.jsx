import { useState, useEffect } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import { useTheme, useAuth } from '../context/AppContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Pause, X, Heart, Settings, CalendarX, CreditCard, ShieldCheck } from 'lucide-react'

export default function SubscriptionWrapper({ children }) {
  const { phase = 0, daysRemaining = 0 } = useSubscription() || {}
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
          <div className="w-full relative h-64 bg-black/5">
            <img 
              src={isDark ? '/monster-dark.png' : '/monster-light.png'} 
              alt="Suscripción Vencida" 
              className="absolute inset-0 w-full h-full object-cover" 
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
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`relative w-full max-w-md p-8 rounded-3xl shadow-2xl animate-slide-in-up border
              ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
              
              {/* Imagen de confianza */}
              <div className="flex justify-center mb-6">
                <img src="/trust_payment.png" alt="Pago seguro" className="w-28 h-28 object-contain rounded-2xl" />
              </div>

              <h2 className={`font-display font-bold text-2xl text-center mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ¡Hola de nuevo, <span className="text-transparent bg-clip-text bg-gold-gradient">{getDisplayName()}</span>!
              </h2>
              <p className={`text-center text-sm font-medium mb-6 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Parece que olvidaste pagar tu suscripción. 
                No queremos que pierdas el acceso a tus herramientas vitales.
              </p>

              {/* Info de seguridad */}
              <div className={`flex items-center gap-3 p-3 rounded-xl mb-6 ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-gray-50 border border-gray-200'}`}>
                <ShieldCheck size={20} className="text-green-500 shrink-0" />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Tu pago es procesado de forma segura por Mercado Pago. Aceptamos Nequi, Daviplata, PSE y tarjetas.
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/payments')} className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-widest bg-gold-gradient text-black shadow-gold-md hover:scale-105 transition-transform">
                  Proceder al Pago
                </button>
                <button onClick={() => setShowPhase2Modal(false)} className={`w-full py-3.5 rounded-2xl font-bold uppercase tracking-widest border transition-colors
                  ${isDark ? 'border-dark-border text-gray-400 hover:text-white' : 'border-light-border text-gray-500 hover:text-gray-900'}`}>
                  Recordarme luego
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
