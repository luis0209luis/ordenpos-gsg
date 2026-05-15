import { useState, useEffect } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import { useTheme } from '../context/AppContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Pause, X, Heart, Settings, CalendarX, CreditCard } from 'lucide-react'

export default function SubscriptionWrapper({ children }) {
  const { phase, daysRemaining } = useSubscription()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const location = useLocation()
  const navigate = useNavigate()

  const [dismissPhase1, setDismissPhase1] = useState(false)
  const [showPhase2Modal, setShowPhase2Modal] = useState(false)

  // Phase 2: Disparar modal cada 7 minutos
  useEffect(() => {
    let interval
    if (phase === 2) {
      // Show immediately on first entry to Phase 2
      setShowPhase2Modal(true)
      interval = setInterval(() => {
        setShowPhase2Modal(true)
      }, 7 * 60 * 1000) // 7 minutes
    } else {
      setShowPhase2Modal(false)
    }
    return () => clearInterval(interval)
  }, [phase])

  // -- Fase 3: Bloqueo Total --
  if (phase === 3 && location.pathname !== '/payments') {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden ${isDark ? 'bg-dark-bg' : 'bg-light-bg'}`}>
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-400 max-w-md text-center shadow-2xl animate-slide-in-up">
          <CalendarX size={56} className="text-red-400 mb-4" />
          <h1 className="font-display font-bold text-2xl text-white mb-1">
            Acceso Suspendido
          </h1>
          <p className="text-sm font-medium leading-relaxed text-gray-300">
            ¡Upps! Olvidaste pagar. Regulariza tu suscripción para continuar usando ORDENPOS.
          </p>
          <button 
            onClick={() => navigate('/payments')}
            className="mt-6 w-full py-4 rounded-xl font-bold uppercase tracking-wider bg-red-500 text-white shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CreditCard size={20} />
            Ir a Pagar Ahora
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      
      {/* Fase 1: Banner Sigiloso (Día -1 a +4) */}
      {phase === 1 && !dismissPhase1 && (
        <div className="bg-gold-gradient text-black px-4 py-2 flex items-center justify-between z-50 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Heart size={16} className="fill-black/20" />
            Parece que tu suscripción está por vencer o venció hace poco. 
            <span className="font-bold underline cursor-pointer hover:text-white transition-colors ml-1">
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

        {/* Fase 2: Modal Automático (Día +5 a +14) */}
        {phase === 2 && showPhase2Modal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`relative w-full max-w-md p-8 rounded-3xl shadow-2xl animate-slide-in-up border
              ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
              <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mb-6 mx-auto">
                <AlertTriangle size={32} className="text-gold-500" />
              </div>
              <h2 className={`font-display font-bold text-2xl text-center mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ¡Hola de nuevo!
              </h2>
              <p className={`text-center text-sm font-medium mb-8 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No queremos que pierdas el acceso a tus herramientas vitales. 
                Por favor, regulariza tu pago para continuar usando ORDENPOS sin interrupciones.
              </p>
              <div className="flex flex-col gap-3">
                <button className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-widest bg-gold-gradient text-black shadow-gold-md hover:scale-105 transition-transform">
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
