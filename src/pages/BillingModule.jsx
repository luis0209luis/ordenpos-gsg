import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSubscription } from '../context/SubscriptionContext'
import { useTheme, useAuth } from '../context/AppContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, QrCode, CheckCircle, X, ShieldCheck, Crown, ArrowRight, Zap, Bell } from 'lucide-react'
import { insertLog } from '../utils/logger'
import { supabase } from '../lib/supabase'

export default function BillingModule() {
  const { fechaVencimiento, daysRemaining, phase, addMonth } = useSubscription()
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark'

  const navigate = useNavigate()
  const location = useLocation()

  const [showModal, setShowModal] = useState(false)
  const [paymentStep, setPaymentStep] = useState('options') // 'options', 'qr', 'card', 'processing', 'success', 'verifying'
  const [loadingMP, setLoadingMP] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  // Payment Verification States
  const [activePaymentId, setActivePaymentId] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [lastPaymentId, setLastPaymentId] = useState(() => localStorage.getItem('ordenpos_last_payment_id') || null)

  const [planPrice, setPlanPrice] = useState(50000)

  // Cargar precio global desde Supabase
  useEffect(() => {
    async function loadGlobalPrice() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'subscription_price')
          .single()
        if (error) throw error
        if (data?.value) setPlanPrice(Number(data.value))
      } catch (err) {
        console.error("Error cargando precio de Supabase:", err)
        // Fallback a localStorage si Supabase falla
        const saved = localStorage.getItem('ordenpos_subscription_price')
        if (saved) setPlanPrice(Number(saved))
      }
    }
    loadGlobalPrice()
  }, [])

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
        const width = 1024
        const height = 768
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

  const handleVerifyPayment = useCallback(async (idToVerify) => {
    if (!idToVerify || !user || !user.businessId) return

    setPaymentStep('verifying')
    setVerifying(true)
    setErrorMessage(null)

    try {
      // 1. Check in database if it was already processed
      const { data: existingLogs, error: logError } = await supabase
        .from('system_logs')
        .select('id')
        .eq('action', 'add_month')
        .ilike('message', `%${idToVerify}%`)

      if (logError) console.error("Error checking system_logs:", logError)

      const processedKey = `mp_processed_${idToVerify}`
      const isAlreadyProcessedLocal = sessionStorage.getItem(processedKey) === 'true'
      const isAlreadyProcessedDB = existingLogs && existingLogs.length > 0

      if (isAlreadyProcessedDB || isAlreadyProcessedLocal) {
        // Already credited. Show success.
        sessionStorage.setItem(processedKey, 'true')
        setPaymentStep('success')
        setShowModal(true)
        return
      }

      // 2. Fetch status from Mercado Pago securely via serverless function
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''
      const res = await fetch(`${apiBase}/api/verify-payment?id=${idToVerify}`)
      if (!res.ok) throw new Error('Error al verificar el estado del pago')
      
      const data = await res.json()

      // 3. Process status
      if (data.status === 'approved') {
        sessionStorage.setItem(processedKey, 'true')
        
        await addMonth(30)

        const businessName = user?.businessName || user?.username || 'Local'
        insertLog({
          type: 'success',
          action: 'add_month',
          business_id: user?.businessId,
          username: user?.username || 'Cliente',
          message: `Renovación exitosa con Mercado Pago (ID Transacción: ${idToVerify})`
        })

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

        const savedMaster = localStorage.getItem('ordenpos_settings_master')
        const settingsMaster = savedMaster ? JSON.parse(savedMaster) : { enablePanel: true, enableEmail: false, enableWhatsApp: false }

        if (settingsMaster.enablePanel) {
          const notificationMsg = `¡Ingreso recibido! ${businessName} renovó su suscripción por $${planPrice} (Mercado Pago)`
          const existingNotifications = JSON.parse(localStorage.getItem('ordenpos_master_notifications') || '[]')
          localStorage.setItem('ordenpos_master_notifications', JSON.stringify([{ id: Date.now(), text: notificationMsg, date: new Date().toISOString() }, ...existingNotifications]))
        }

        if (settingsMaster.enableEmail && settingsMaster.email_notificaciones) {
          const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
          fetch(`${apiBase}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: settingsMaster.email_notificaciones, businessName, amount: planPrice, days: 30 })
          }).catch(err => console.error("Error enviando email", err))
        }

        setPaymentStep('success')
        setShowModal(true)
        
        // Limpiar el localStorage ya que el pago fue procesado con éxito
        if (localStorage.getItem('ordenpos_last_payment_id') === idToVerify) {
          localStorage.removeItem('ordenpos_last_payment_id')
          setLastPaymentId(null)
        }

      } else if (data.status === 'pending' || data.status === 'in_process') {
        setPaymentStep('pending')
        setShowModal(true)
      } else if (data.status === 'rejected' || data.status === 'cancelled') {
        setPaymentStep('failure')
        setShowModal(true)
      } else {
        setPaymentStep('pending')
        setShowModal(true)
      }

    } catch (err) {
      console.error("Error verificando pago:", err)
      setErrorMessage(err.message || 'Error de conexión al verificar')
      setPaymentStep('pending')
      setShowModal(true)
    } finally {
      setVerifying(false)
    }
  }, [addMonth, user, planPrice])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const status = params.get('status')
    const paymentId = params.get('payment_id') || params.get('payment.id')
    const extRef = params.get('external_reference')

    if (status && user && user.businessId) {
      if (paymentId) {
        localStorage.setItem('ordenpos_last_payment_id', paymentId)
        setLastPaymentId(paymentId)
        setActivePaymentId(paymentId)
      }

      if (status === 'success') {
        if (paymentId) {
          // Verify on success as well to ensure robust validation & no double credits
          handleVerifyPayment(paymentId)
        }
      } else if (status === 'pending' || status === 'in_process') {
        if (paymentId) {
          handleVerifyPayment(paymentId)
        } else {
          setPaymentStep('pending')
          setShowModal(true)
        }
      } else if (status === 'failure') {
        setPaymentStep('failure')
        setShowModal(true)
      }

      navigate('/payments', { replace: true })
    }
  }, [location.search, navigate, user, handleVerifyPayment])

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

        {lastPaymentId && (
          <div className={`mb-8 p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in
            ${isDark ? 'bg-gold-500/10 border-gold-500/30' : 'bg-gold-50/80 border-gold-500/30'}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center shrink-0">
                <Bell className="text-gold-500 animate-bounce" size={24} />
              </div>
              <div>
                <h4 className={`font-bold font-display text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ¿Tienes un pago reciente en verificación?
                </h4>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Si pagaste por Nequi o PSE y tu suscripción aún no se activa, revisa su estado. (ID: {lastPaymentId})
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActivePaymentId(lastPaymentId)
                handleVerifyPayment(lastPaymentId)
              }}
              disabled={verifying}
              className="w-full md:w-auto px-6 py-3 rounded-xl font-bold uppercase tracking-wider bg-gold-gradient text-black hover:scale-105 active:scale-95 transition-all shadow-gold-md shrink-0">
              {verifying && activePaymentId === lastPaymentId ? 'Verificando...' : 'Verificar Pago'}
            </button>
          </div>
        )}

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="relative w-full max-w-md rounded-[2rem] shadow-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden">

              {/* Gold top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold-gradient" />

              {/* Glow background decoration */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold-500/8 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Close Button */}
            {paymentStep !== 'processing' && (
              <button
                onClick={() => {
                  setShowModal(false)
                  setPaymentStep('options')
                }}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10 border border-white/10">
                <X size={16} className="text-gray-400" />
              </button>
            )}

            {/* STEP: Options */}
            {paymentStep === 'options' && (
              <div className="animate-fade-in p-8">

                {/* Icon */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-gold-gradient opacity-15 animate-pulse" />
                  <div className="w-20 h-20 rounded-full border border-gold-500/30 bg-[#1a1a1a] flex items-center justify-center">
                    <CreditCard size={36} className="text-gold-500" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-display font-black text-white text-center mb-1">
                  Renovar Suscripción
                </h2>
                <p className="text-gray-500 text-sm text-center mb-6">
                  Extiende tu acceso a ORDENPOS por 30 días más
                </p>

                {/* Price pill */}
                <div className="flex items-center justify-center mb-6">
                  <div className="inline-flex items-baseline gap-1.5 px-6 py-3 rounded-2xl bg-gold-500/10 border border-gold-500/20">
                    <span className="text-3xl font-display font-black text-transparent bg-clip-text bg-gold-gradient">
                      ${planPrice.toLocaleString('es-CO')}
                    </span>
                    <span className="text-gold-500/70 font-bold text-sm">COP</span>
                    <span className="text-gray-500 text-xs ml-1">/ mes · IVA incl.</span>
                  </div>
                </div>

                {/* Payment methods */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/8 mb-6">
                  <ShieldCheck size={16} className="text-green-400 shrink-0" />
                  <span className="text-xs text-gray-400">
                    Pago seguro · Acepta <span className="text-white font-semibold">Nequi, Daviplata, PSE</span> y tarjetas de crédito/débito
                  </span>
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleMercadoPagoCheckout}
                  className="group relative w-full py-4 rounded-2xl font-bold uppercase tracking-widest bg-gold-gradient text-black shadow-gold-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 overflow-hidden flex items-center justify-center gap-2">
                  <CreditCard size={18} className="relative z-10" />
                  <span className="relative z-10">Pagar Ahora</span>
                  <div className="absolute inset-0 -translate-x-full bg-white/20 skew-x-[30deg] group-hover:translate-x-full transition-transform duration-700" />
                </button>

                <p className="text-center text-xs text-gray-600 mt-4">
                  Procesado de forma segura por Mercado Pago
                </p>
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

            {/* STEP: Verifying */}
            {paymentStep === 'verifying' && (
              <div className="animate-fade-in text-center py-10 px-4">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck size={28} className="text-gold-500 animate-pulse" />
                  </div>
                </div>
                <h2 className="text-2xl font-display font-black text-white mb-2">Verificando Pago</h2>
                <p className="text-gray-400 text-sm">
                  Consultando el estado de tu transacción de forma segura con Mercado Pago. Por favor, espera...
                </p>
              </div>
            )}

            {/* STEP: Pending */}
            {paymentStep === 'pending' && (
              <div className="animate-fade-in text-center py-4">
                {errorMessage && (
                  <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm font-semibold text-left">
                    ⚠️ {errorMessage}
                  </div>
                )}

                <div className="w-24 h-24 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping" />
                  <Bell size={48} className="text-yellow-500 relative z-10" />
                </div>

                <h2 className="text-3xl font-display font-black text-yellow-500 mb-4">Pago Pendiente</h2>
                <p className={`text-lg mb-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tu transacción aún está en proceso de verificación.
                  <br />
                  <span className="text-sm mt-2 block opacity-70">
                    Los pagos con Nequi o PSE pueden tardar unos minutos en acreditarse en Mercado Pago.
                  </span>
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => handleVerifyPayment(activePaymentId || lastPaymentId)}
                    disabled={verifying}
                    className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gold-gradient text-black hover:scale-105 active:scale-95 transition-all shadow-gold-md flex items-center justify-center gap-2">
                    {verifying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Verificando...
                      </>
                    ) : 'Verificar Estado Nuevamente'}
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setPaymentStep('options')
                    }}
                    className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-dark-bg text-white border border-dark-border hover:bg-gray-800 transition-colors">
                    Cerrar y Volver al Panel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
