import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSubscription } from '../context/SubscriptionContext'
import { useTheme, useAuth } from '../context/AppContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, QrCode, CheckCircle, X, ShieldCheck, Crown, ArrowRight, Zap, Bell } from 'lucide-react'
import { insertLog } from '../utils/logger'

export default function BillingModule() {
  const { fechaVencimiento, daysRemaining, phase, addMonth } = useSubscription()
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark'

  const navigate = useNavigate()
  const location = useLocation()

  const [showModal, setShowModal] = useState(false)
  const [paymentStep, setPaymentStep] = useState('options') // 'options', 'qr', 'card', 'processing', 'success'
  const [loadingMP, setLoadingMP] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const [planPrice, setPlanPrice] = useState(() => {
    const saved = localStorage.getItem('ordenpos_subscription_price')
    return saved ? Number(saved) : 50000
  })

  // Format the date beautifully
  const formattedDate = fechaVencimiento
    ? format(parseISO(fechaVencimiento), "dd 'de' MMMM, yyyy", { locale: es })
    : 'Fecha no disponible'

  const handleRenewClick = () => {
    setErrorMessage(null)
    setPaymentStep('options')
    setShowModal(true)
  }

  const handleMercadoPagoCheckout = async () => {
    console.log("Iniciando handleMercadoPagoCheckout...")
    setPaymentStep('card')
    setLoadingMP(true)
    setErrorMessage(null)
    try {
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
      console.log("Llamando a create-preference en base:", apiBase)
      const res = await fetch(`${apiBase}/api/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          price: planPrice || 50000, 
          businessId: user?.businessId || 'desconocido' 
        })
      })
      const data = await res.json()
      console.log("Preferencia creada con éxito:", data)
      if (data.init_point) {
        // Abrir en ventana emergente en vez de redirigir
        const width = 800
        const height = 900
        const left = (window.screen.width - width) / 2
        const top = (window.screen.height - height) / 2
        window.open(
          data.init_point,
          'MercadoPagoCheckout',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        )
        setPaymentStep('options')
        setShowModal(false)
      } else if (data.id) {
        // Fallback: abrir con init_point generado manualmente
        throw new Error(data.error || 'No se pudo obtener el link de pago.')
      } else {
        throw new Error(data.error || 'No se pudo obtener el ID de la preferencia.')
      }
    } catch (err) {
      console.error("Error iniciando Mercado Pago", err)
      setErrorMessage(err.message || 'Error de conexión con la pasarela')
    } finally {
      setLoadingMP(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const status = params.get('status')
    const paymentId = params.get('payment_id') || params.get('payment.id')
    const extRef = params.get('external_reference')

    // Esperar a que el usuario esté cargado para evitar condiciones de carrera en el primer render
    if (status && user && user.businessId) {
      const processedKey = `mp_processed_${paymentId || 'default'}`
      const isAlreadyProcessed = sessionStorage.getItem(processedKey)
      
      if (status === 'success') {
        if (!isAlreadyProcessed) {
          sessionStorage.setItem(processedKey, 'true')
          
          // Sumar 30 días de suscripción en Supabase
          addMonth(30)

          const businessName = user?.businessName || user?.username || 'Local'
          
          // Registrar log
          insertLog({
            type: 'success',
            action: 'add_month',
            business_id: user?.businessId || extRef || 'desconocido',
            username: user?.username || 'Cliente',
            message: `Renovación exitosa con Mercado Pago (ID Transacción: ${paymentId})`
          })

          // Sonido de caja registradora
          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gainNode = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(987.77, ctx.currentTime) // B5
            osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.1) // E6
            gainNode.gain.setValueAtTime(0, ctx.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
            osc.connect(gainNode)
            gainNode.connect(ctx.destination)
            osc.start()
            osc.stop(ctx.currentTime + 0.5)
          } catch (e) { console.log('Audio no soportado', e) }

          // Alertas de Panel Master y Nodemailer
          const savedMaster = localStorage.getItem('ordenpos_settings_master')
          const settingsMaster = savedMaster ? JSON.parse(savedMaster) : { enablePanel: true, enableEmail: false, enableWhatsApp: false }

          if (settingsMaster.enablePanel) {
            const notificationMsg = `¡Ingreso recibido! ${businessName} renovó su suscripción por $${planPrice} (Mercado Pago)`
            const existingNotifications = JSON.parse(localStorage.getItem('ordenpos_master_notifications') || '[]')
            localStorage.setItem('ordenpos_master_notifications', JSON.stringify([{ id: Date.now(), text: notificationMsg, date: new Date().toISOString() }, ...existingNotifications]))
          }

          if (settingsMaster.enableEmail && settingsMaster.email_notificaciones) {
            fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: settingsMaster.email_notificaciones,
                businessName: businessName,
                amount: planPrice,
                days: 30
              })
            }).catch(err => console.error("Error enviando email", err))
          }
        }

        setPaymentStep('success')
        setShowModal(true)
      } else if (status === 'failure' || status === 'pending') {
        setPaymentStep(status)
        setShowModal(true)
      }

      // Limpiar los query params para que no se reprocesen al recargar
      navigate('/payments', { replace: true })
    }
  }, [location.search, navigate, user, planPrice, addMonth])

  const simulatePaymentSuccess = () => {
    // Retained for backward compatibility if needed elsewhere, or removed. Let's just remove it and use Mercado Pago.
  }

  return (
    <div className={`h-full overflow-y-auto p-4 lg:p-8 ${isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-gray-900'}`}>

      {/* Admin Notification Toast removed from tenant view */}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black tracking-tight flex items-center gap-3">
            <Crown className="text-gold-500" size={32} />
            Mi Suscripción
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Gestiona el acceso de tu negocio a ORDENPOS. Renueva tu licencia fácil y rápido.
          </p>
        </div>

        {/* Current Status Card */}
        <div className={`relative p-8 rounded-3xl overflow-hidden shadow-2xl mb-8
          ${isDark
            ? 'bg-dark-surface border border-dark-border'
            : 'bg-white border border-light-border'}`}>

          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={20} className={phase === 3 ? 'text-red-500' : phase > 0 ? 'text-yellow-500' : 'text-green-500'} />
                <span className={`text-sm font-bold uppercase tracking-wider
                  ${phase === 3 ? 'text-red-500' : phase > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {phase === 0 ? 'Estado: Activo y al día' : phase === 1 ? 'Estado: Por Vencer' : phase === 2 ? 'Estado: Atraso' : 'Estado: Suspendido'}
                </span>
              </div>

              <h2 className={`text-4xl font-display font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {`${daysRemaining} días`} <span className="text-lg font-medium opacity-60 font-sans tracking-normal">restantes</span>
              </h2>

              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Tu acceso está garantizado hasta el <strong className="text-gold-500 font-semibold">{formattedDate}</strong>.
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={handleRenewClick}
                className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest overflow-hidden transition-all duration-300 bg-gold-gradient text-black shadow-gold-md hover:scale-105">
                <Zap size={20} className="relative z-10 group-hover:scale-110 transition-transform" />
                <span className="relative z-10">Renovar Servicio</span>
                <div className="absolute inset-0 -translate-x-full bg-white/20 skew-x-[30deg] group-hover:animate-shine" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <CheckCircle size={18} className="text-gold-500" />
              Activación Inmediata
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Tu pago es detectado y validado en tiempo real. Obtienes 30 días adicionales de inmediato en cuanto se confirma la transacción, sin necesidad de contactar a soporte.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <CheckCircle size={18} className="text-gold-500" />
              100% Seguro
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Utilizamos pasarelas de pago certificadas para procesar tu transacción. Puedes pagar con tus billeteras digitales favoritas o tarjeta de crédito sin riesgo.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`relative w-full max-w-lg p-8 rounded-[2rem] shadow-2xl border overflow-hidden
            ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>

            {/* Modal Close Button */}
            {paymentStep !== 'processing' && (
              <button
                onClick={() => {
                  setShowModal(false)
                  setPaymentStep('options')
                }}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-500/20 transition-colors z-10">
                <X size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            )}

            {/* STEP: Options */}
            {paymentStep === 'options' && (
              <div className="animate-fade-in text-center">
                <div className="w-20 h-20 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-6">
                  <CreditCard size={40} className="text-gold-500" />
                </div>
                <h2 className="text-2xl font-display font-black mb-2">Renovar Suscripción</h2>
                <p className={`text-sm mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Renueva 30 días de ORDENPOS por solo <strong>${planPrice.toLocaleString('es-CO')} COP</strong> (IVA incluido).
                  <br />
                  <span className="text-xs mt-1 block opacity-70">Acepta Nequi, Daviplata, PSE, tarjetas de crédito y débito.</span>
                </p>

                <button
                  onClick={handleMercadoPagoCheckout}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gold-gradient text-black shadow-gold-md hover:scale-105 transition-transform">
                  Pagar Aquí
                </button>
              </div>
            )}



            {/* STEP: Card/PSE Payment */}
            {paymentStep === 'card' && (
              <div className="animate-fade-in text-center">
                <button
                  onClick={() => {
                    setPaymentStep('options')
                    setErrorMessage(null)
                    setLoadingMP(false)
                  }}
                  className="mb-6 text-sm text-gold-500 hover:underline flex items-center gap-1 mx-auto"
                >
                  <X size={14} /> Cancelar y volver
                </button>

                <div className="w-16 h-16 rounded-full bg-[#009EE3]/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <CreditCard size={32} className="text-[#009EE3]" />
                </div>

                <h2 className="text-xl font-display font-bold mb-2">Conectando con Mercado Pago</h2>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Estamos generando tu orden de pago segura. Por favor, mantén esta ventana abierta.
                </p>

                <div className={`p-6 rounded-2xl border mb-6 text-left space-y-3
                  ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-500/10">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Concepto</span>
                    <span className="font-bold text-sm">Mensualidad Sistema ORDENPOS</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-500/10">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Monto a pagar</span>
                    <span className="font-bold text-lg text-gold-500">${planPrice.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Estado</span>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#009EE3]/15 text-[#009EE3] animate-pulse">Iniciando pasarela...</span>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm font-semibold text-left">
                      ⚠️ {errorMessage}
                    </div>
                    <button
                      onClick={handleMercadoPagoCheckout}
                      className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gold-gradient text-black hover:scale-[1.02] transition-transform shadow-gold-md"
                    >
                      Reintentar Pago
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <div className="w-10 h-10 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                    <span className="text-xs uppercase tracking-wider font-bold text-gold-500 animate-pulse">Generando link seguro...</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP: Processing */}
            {paymentStep === 'processing' && (
              <div className="animate-fade-in text-center py-12">
                <div className="w-16 h-16 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto mb-6" />
                <h2 className="text-xl font-display font-bold mb-2">Validando transacción...</h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Por favor, no cierres esta ventana.
                </p>
              </div>
            )}

            {/* STEP: Success */}
            {paymentStep === 'success' && (
              <div className="animate-fade-in text-center py-4">
                <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                  <CheckCircle size={48} className="text-green-500 relative z-10" />
                </div>

                <h2 className="text-3xl font-display font-black text-green-500 mb-4">¡Pago confirmado!</h2>
                <p className={`text-lg mb-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tu acceso se ha extendido exitosamente.
                  <br />
                  <span className="text-sm mt-2 block opacity-70">Nueva fecha de vencimiento:</span>
                  <strong className="text-gold-500 block text-xl mt-1">{formattedDate}</strong>
                </p>

                <button
                  onClick={() => {
                    setShowModal(false)
                    setPaymentStep('options')
                  }}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-dark-bg text-white border border-dark-border hover:bg-gray-800 transition-colors">
                  Volver al Panel
                </button>
              </div>
            )}

            {/* STEP: Failure */}
            {paymentStep === 'failure' && (
              <div className="animate-fade-in text-center py-4">
                <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <X size={48} className="text-red-500 relative z-10" />
                </div>

                <h2 className="text-3xl font-display font-black text-red-500 mb-4">Pago Rechazado</h2>
                <p className={`text-lg mb-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Upps, la transacción no pudo completarse.
                  <br />
                  <span className="text-sm mt-2 block opacity-70">Por favor, verifica tus fondos o método de pago e inténtalo de nuevo.</span>
                </p>

                <button
                  onClick={() => {
                    setPaymentStep('options')
                  }}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg">
                  Reintentar Pago
                </button>
              </div>
            )}

            {/* STEP: Pending */}
            {paymentStep === 'pending' && (
              <div className="animate-fade-in text-center py-4">
                <div className="w-24 h-24 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping" />
                  <Bell size={48} className="text-yellow-500 relative z-10" />
                </div>

                <h2 className="text-3xl font-display font-black text-yellow-500 mb-4">Pago Pendiente</h2>
                <p className={`text-lg mb-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tu transacción está en verificación.
                  <br />
                  <span className="text-sm mt-2 block opacity-70">Mercado Pago está procesando tu pago. Tan pronto como sea aprobado, tu suscripción se renovará de forma automática.</span>
                </p>

                <button
                  onClick={() => {
                    setShowModal(false)
                    setPaymentStep('options')
                  }}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-dark-bg text-white border border-dark-border hover:bg-gray-800 transition-colors">
                  Volver al Panel
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
