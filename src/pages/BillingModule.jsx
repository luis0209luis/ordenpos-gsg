import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSubscription } from '../context/SubscriptionContext'
import { useTheme, useAuth } from '../context/AppContext'
import { CreditCard, QrCode, CheckCircle, X, ShieldCheck, Crown, ArrowRight, Zap, Bell } from 'lucide-react'
import { insertLog } from '../utils/logger'

export default function BillingModule() {
  const { fechaVencimiento, daysRemaining, phase, addMonth } = useSubscription()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isDark = theme === 'dark'

  const [showModal, setShowModal] = useState(false)
  const [paymentStep, setPaymentStep] = useState('options') // 'options', 'qr', 'card', 'processing', 'success'

  const [planPrice, setPlanPrice] = useState(() => {
    const saved = localStorage.getItem('ordenpos_subscription_price')
    return saved ? Number(saved) : 50000
  })

  // Format the date beautifully
  const formattedDate = fechaVencimiento
    ? format(parseISO(fechaVencimiento), "dd 'de' MMMM, yyyy", { locale: es })
    : 'Fecha no disponible'

  const handleRenewClick = () => {
    setPaymentStep('options')
    setShowModal(true)
  }

  const simulatePaymentSuccess = () => {
    setPaymentStep('processing')

    // Simulate API delay
    setTimeout(() => {
      // Execute the addMonth to automatically add 30 days
      addMonth()
      setPaymentStep('success')

      const savedMaster = localStorage.getItem('ordenpos_settings_master')
      const settingsMaster = savedMaster ? JSON.parse(savedMaster) : { enablePanel: true, enableEmail: false, enableWhatsApp: false }
      const businessName = user?.businessName || user?.username || 'Local'

      // Registrar pago real en la base de datos para que sume a ingresos del Superadmin
      insertLog({
        type: 'success',
        action: 'add_month',
        business_id: user?.businessId || 'desconocido',
        username: user?.username || 'Cliente',
        message: `Renovación automática pagada (${paymentStep === 'qr' ? 'QR/Nequi' : 'Tarjeta'})`
      })

      // 1. Alertas de Panel
      if (settingsMaster.enablePanel) {
        // Sonido sutil de moneda/caja registradora usando Web Audio API
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
        } catch (e) { console.log('Audio no soportado') }

        const notificationMsg = `¡Ingreso recibido! ${businessName} renovó su suscripción por $${planPrice}`
        const existingNotifications = JSON.parse(localStorage.getItem('ordenpos_master_notifications') || '[]')
        localStorage.setItem('ordenpos_master_notifications', JSON.stringify([{ id: Date.now(), text: notificationMsg, date: new Date().toISOString() }, ...existingNotifications]))
      }

      // 2. Integración con Gmail (Nodemailer)
      if (settingsMaster.enableEmail && settingsMaster.email_notificaciones) {
        fetch('http://localhost:3001/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: settingsMaster.email_notificaciones,
            businessName: businessName,
            amount: planPrice,
            days: 30
          })
        }).catch(err => console.error("Error enviando email al backend", err))
      }

      // 3. Estructura de WhatsApp (Placeholder)
      if (settingsMaster.enableWhatsApp && settingsMaster.whatsapp_notificaciones) {
        const sendWhatsAppNotification = async () => {
          console.log(`[WhatsApp Placeholder] Enviando mensaje a ${settingsMaster.whatsapp_notificaciones}: ${businessName} pagó $${planPrice}`)
          // TODO: Implementar API de Meta WhatsApp o Twilio
          // fetch('https://api.whatsapp.com/v1/messages', { ... })
        }
        sendWhatsAppNotification()
      }

    }, 2000)
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
                {daysRemaining > 0 ? `${daysRemaining} días` : '0 días'} <span className="text-lg font-medium opacity-60 font-sans tracking-normal">restantes</span>
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
            {paymentStep !== 'processing' && paymentStep !== 'success' && (
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-500/20 transition-colors">
                <X size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            )}

            {/* STEP: Options */}
            {paymentStep === 'options' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-display font-black mb-2">Elige tu método de pago</h2>
                <p className={`text-sm mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Renueva 30 días de ORDENPOS por solo <strong>${planPrice.toLocaleString('es-CO')} COP</strong> (IVA incluido).
                </p>

                <div className="space-y-4">
                  <button
                    onClick={() => setPaymentStep('qr')}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all hover:border-gold-500 hover:bg-gold-500/5 group
                      ${isDark ? 'border-dark-border bg-dark-card' : 'border-light-border bg-light-surface'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                        <QrCode className="text-[#DA0081]" size={24} /> {/* Nequi pinkish color idea */}
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold">Transferencia con QR</h4>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nequi, Daviplata o Bancolombia</p>
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-gray-400 group-hover:text-gold-500 transition-colors" />
                  </button>

                  <button
                    onClick={() => setPaymentStep('card')}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all hover:border-gold-500 hover:bg-gold-500/5 group
                      ${isDark ? 'border-dark-border bg-dark-card' : 'border-light-border bg-light-surface'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#009EE3]/10 flex items-center justify-center">
                        <CreditCard className="text-[#009EE3]" size={24} /> {/* MercadoPago blueish color idea */}
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold">PSE / Tarjeta</h4>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Débito o crédito vía pasarela segura</p>
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-gray-400 group-hover:text-gold-500 transition-colors" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP: QR Payment */}
            {paymentStep === 'qr' && (
              <div className="animate-fade-in text-center">
                <button
                  onClick={() => setPaymentStep('options')}
                  className="mb-6 text-sm text-gold-500 hover:underline flex items-center gap-1 mx-auto">
                  <X size={14} /> Cancelar y volver
                </button>

                <h2 className="text-xl font-display font-bold mb-2">Escanea para Pagar</h2>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Abre tu app de Nequi o Daviplata y escanea el código. Valor: <strong>${planPrice.toLocaleString('es-CO')} COP</strong>
                </p>

                <div className="bg-white p-4 rounded-2xl inline-block mb-6 border-4 border-gold-500">
                  {/* Placeholder for real QR code */}
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ORDENPOS_RENEW_50000" alt="QR de Pago" className="w-48 h-48" />
                </div>

                <button
                  onClick={simulatePaymentSuccess}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gold-gradient text-black shadow-gold-md hover:scale-105 transition-transform">
                  Simular Pago Exitoso
                </button>
              </div>
            )}

            {/* STEP: Card/PSE Payment */}
            {paymentStep === 'card' && (
              <div className="animate-fade-in text-center">
                <button
                  onClick={() => setPaymentStep('options')}
                  className="mb-6 text-sm text-gold-500 hover:underline flex items-center gap-1 mx-auto">
                  <X size={14} /> Cancelar y volver
                </button>

                <div className="w-20 h-20 rounded-full bg-[#009EE3]/10 flex items-center justify-center mx-auto mb-6">
                  <CreditCard size={40} className="text-[#009EE3]" />
                </div>

                <h2 className="text-xl font-display font-bold mb-2">Pago Seguro</h2>
                <p className={`text-sm mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Serás redirigido a nuestra pasarela de pago para procesar la transacción con tu tarjeta de crédito o cuenta PSE de forma encriptada.
                </p>

                <button
                  onClick={simulatePaymentSuccess}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-[#009EE3] text-white hover:bg-[#007EB5] transition-colors shadow-lg">
                  Ir a la Pasarela (Simular)
                </button>
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

          </div>
        </div>
      )}

    </div>
  )
}
