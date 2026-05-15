import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Building2, User, Phone, CheckCircle2, MessageCircle, X, ChevronRight, ShoppingCart, Package, Bike, ChefHat, BarChart3, Users, ClipboardList, Headphones, Zap, Sun, Moon, Mail, Croissant, GlassWater, UtensilsCrossed, TrendingUp, Clock, ShieldCheck, Wallet } from 'lucide-react'
import OrdenposLogo from '../components/OrdenposLogo'
import { useTheme } from '../context/AppContext'

function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return
    let startTime = null
    const startValue = 0
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [hasStarted, target, duration])

  return (
    <span
      ref={ref}
      style={{
        textShadow: hasStarted
          ? '0 0 40px rgba(255,215,0,0.6)'
          : '0 0 0px rgba(255,215,0,0)',
        transition: 'text-shadow 0.3s ease'
      }}
    >
      {count}{suffix}
    </span>
  )
}

function LegalModal({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="px-8 py-6 flex items-center justify-between border-b border-white/10 bg-black/20">
              <div>
                <h2 className="font-display font-bold text-2xl text-white">{title}</h2>
                <div className="h-1 w-12 bg-[#FFD700] rounded-full mt-2"></div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar text-gray-300 text-sm leading-relaxed">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Landing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const heroHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const scrollProgress = Math.min(scrollY / (heroHeight * 0.7), 1)
  const blurValue = scrollProgress * 20
  const overlayOpacity = 0.75 + scrollProgress * 0.2
  const heroScale = 1 + scrollProgress * 0.05

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [showRegister, setShowRegister] = useState(false)
  const [registerStep, setRegisterStep] = useState(1) // 1: timeline/form, 2: success
  const [formData, setFormData] = useState({ businessName: '', ownerName: '', phone: '' })
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showContact, setShowContact] = useState(false)

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!formData.businessName || !formData.ownerName || !formData.phone) return

    // 1. Enviar correo silenciosamente a través del backend
    try {
      await fetch('http://localhost:3001/api/send-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
    } catch (error) {
      console.log('Backend de correos no disponible o no configurado:', error)
    }

    // 2. Abrir WhatsApp para el cliente (se abre en nueva pestaña)
    const textWA = `Hola equipo ORDENPOS, deseo registrar mi negocio.%0A- Negocio: ${formData.businessName}%0A- Titular: ${formData.ownerName}%0A- Teléfono: ${formData.phone}`
    window.open(`https://wa.me/573136622089?text=${textWA}`, '_blank')

    setRegisterStep(2)
  }

  const handleWhatsApp = () => {
    const text = `Hola equipo ORDENPOS, deseo registrar mi negocio. Mis datos son: %0A- Negocio: ${formData.businessName} %0A- Titular: ${formData.ownerName} %0A- Teléfono: ${formData.phone}`
    window.open(`https://wa.me/573136622089?text=${text}`, '_blank')
  }

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  }

  // Allied companies mock
  const alliedLogos = [
    "Panadería El Trigal", "Burger King", "Café del Parque", "Sushi Bar"
  ]

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-[#0f1115] text-white' : 'bg-gray-50 text-gray-900'}`}>

      {/* ── Navbar ── */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}
        style={{ backgroundColor: isDark ? 'rgba(10, 10, 15, 0.92)' : 'rgba(255, 255, 255, 0.97)', backdropFilter: 'blur(0px)' }}
      >
        <div className="flex items-center gap-3">
          <OrdenposLogo size={36} className={isDark ? "text-white" : "text-gray-900"} />
          <span className={`font-display font-black text-2xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>ORDENPOS</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`p-3 md:p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>
            {isDark ? <Sun size={24} className="md:w-5 md:h-5" /> : <Moon size={24} className="md:w-5 md:h-5" />}
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative flex-1 flex flex-col items-center justify-center overflow-hidden min-h-screen">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2000&auto=format&fit=crop')",
            filter: `blur(${blurValue}px)`,
            transform: `scale(${heroScale})`,
            transition: 'none',
            willChange: 'filter, transform'
          }}
        ></div>

        {/* Dark Overlay with Blur */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
            transition: 'none'
          }}
        ></div>

        <motion.div
          className="relative z-10 text-center max-w-4xl px-6 flex flex-col items-center mt-16"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          style={{
            opacity: 1 - scrollProgress * 1.5,
            transform: `translateY(${scrollY * 0.3}px)`,
            transition: 'none'
          }}
        >

          <motion.h1
            variants={fadeInUp}
            className="font-display font-black text-4xl md:text-5xl lg:text-6xl leading-[1.1] tracking-tight mb-6 drop-shadow-xl text-white"
          >
            Pon en orden tu negocio.<br />Pon{' '}
            <span
              className="text-[#FFD700]"
              style={{ textShadow: '0 0 30px rgba(255,215,0,0.4)' }}
            >
              ORDENPOS.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-2xl mb-12 max-w-2xl font-light text-gray-300"
          >
            Ventas, inventario y domicilios. Todo en un solo lugar, todo bajo control.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <button
              onClick={() => setShowRegister(true)}
              className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-extrabold text-lg transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-[#FFD700] text-black drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] hover:drop-shadow-[0_0_25px_rgba(255,215,0,0.8)]' : 'bg-[#FFD700] text-gray-900'}`}
              style={!isDark ? { boxShadow: '0 4px 20px rgba(255,215,0,0.4)' } : {}}
            >
              Registrar mi Negocio
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-[#FFD700] text-[#FFD700] bg-transparent hover:bg-[#FFD700] hover:text-black"
            >
              Iniciar sesión
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Search Modal (Empresas) ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              <button
                onClick={() => setShowSearch(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-3xl font-display font-bold text-white mb-6 text-center">Encuentra tu empresa</h2>

              <div className="relative mb-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Escribe el nombre de tu establecimiento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 text-white rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-[#FFD700] transition-colors text-lg"
                />
              </div>

              {searchQuery && (
                <div className="mb-6 flex flex-col gap-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-[#FFD700]/20 hover:border-[#FFD700]/50 transition-all text-white group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold">
                        {searchQuery.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-lg">{searchQuery}</span>
                    </div>
                    <ChevronRight className="text-gray-400 group-hover:text-[#FFD700] transition-colors" />
                  </button>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400 mb-4 text-center">Empresas aliadas confiando en ORDENPOS</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {alliedLogos.map((logo, idx) => (
                    <div key={idx} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm">
                      {logo}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Register Modal (Onboarding Timeline) ── */}
      <AnimatePresence>
        {showRegister && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/20">
                <h3 className="font-display font-bold text-xl text-white">Únete a ORDENPOS</h3>
                <button
                  onClick={() => { setShowRegister(false); setRegisterStep(1); }}
                  className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {registerStep === 1 ? (
                  <div className="flex flex-col gap-6">
                    {/* Ultra-minimalist vertical timeline */}
                    <div className="flex flex-col gap-4 mb-6 relative">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-white/10"></div>

                      <div className="flex gap-4 items-start relative">
                        <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center z-10 shadow-[0_0_10px_rgba(255,215,0,0.5)]">
                          <div className="w-2 h-2 rounded-full bg-black"></div>
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-sm">Postúlate</h4>
                          <p className="text-gray-400 text-xs">Cuéntanos de tu negocio.</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start relative opacity-50">
                        <div className="w-6 h-6 rounded-full bg-gray-600 border-2 border-[#FFD700] flex items-center justify-center z-10"></div>
                        <div>
                          <h4 className="text-white font-bold text-sm">Conectamos</h4>
                          <p className="text-gray-400 text-xs">Un experto configurará tu instancia.</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start relative opacity-50">
                        <div className="w-6 h-6 rounded-full bg-gray-600 border-2 border-[#FFD700] flex items-center justify-center z-10"></div>
                        <div>
                          <h4 className="text-white font-bold text-sm">Vende</h4>
                          <p className="text-gray-400 text-xs">Acceso total a ORDENPOS.</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          required
                          type="text"
                          placeholder="Nombre del Negocio"
                          value={formData.businessName}
                          onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                          className="w-full bg-black/40 border border-white/20 text-white rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-[#FFD700] transition-colors text-sm"
                        />
                      </div>

                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          required
                          type="text"
                          placeholder="Nombre del Titular"
                          value={formData.ownerName}
                          onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                          className="w-full bg-black/40 border border-white/20 text-white rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-[#FFD700] transition-colors text-sm"
                        />
                      </div>

                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          required
                          type="tel"
                          placeholder="WhatsApp de Contacto"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-black/40 border border-white/20 text-white rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-[#FFD700] transition-colors text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 rounded-2xl bg-[#FFD700] text-black font-bold text-sm tracking-wider uppercase drop-shadow-[0_0_10px_rgba(255,215,0,0.3)] hover:drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] transition-all hover:scale-105 active:scale-95 mt-2"
                      >
                        Enviar Postulación
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-6">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                      <CheckCircle2 size={40} className="text-green-400" />
                    </div>
                    <h3 className="font-display font-bold text-2xl text-white mb-3">¡Solicitud Recibida!</h3>
                    <p className="text-sm text-gray-300 leading-relaxed mb-8">
                      Tu información está segura. Habla directamente con un asesor para priorizar tu configuración.
                    </p>

                    <button
                      onClick={handleWhatsApp}
                      className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#1EBE5D] transition-colors shadow-[0_0_15px_rgba(37,211,102,0.4)] hover:scale-105 active:scale-95"
                    >
                      <MessageCircle size={20} />
                      Hablar con un asesor ahora
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SECCIÓN A: Stats ── */}
      <div className={`h-16 ${isDark ? 'bg-gradient-to-b from-black to-[#0A0A0F]' : 'bg-gradient-to-b from-gray-100 to-white'}`} />
      <section className={`py-20 px-6 ${isDark ? 'bg-[#0A0A0F]' : 'bg-white'} relative`}>
        <div className="max-w-6xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">

            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0 * 0.2 }}
              className={`rounded-2xl p-8 text-center transition-shadow border-t-2 ${isDark ? 'bg-[#111118] border-[#1E1E2E] border-t-[#FFD700]' : 'bg-gray-50 border-gray-200 border-t-[#D4A800] shadow-sm hover:shadow-md'}`}
            >
              <TrendingUp size={20} className={`mx-auto mb-4 opacity-70 ${isDark ? 'text-[#FFD700]' : 'text-[#B8860B]'}`} />
              <div
                className={`font-black text-6xl md:text-8xl ${isDark ? 'text-[#FFD700]' : 'text-[#B8860B]'}`}
                style={{ textShadow: isDark ? '0 0 40px rgba(255,215,0,0.4)' : 'none' }}
              >
                <AnimatedCounter target={500} suffix="+" duration={2000} />
              </div>
              <p className={`text-base mt-3 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pedidos gestionados diariamente</p>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 1 * 0.2 }}
              className={`rounded-2xl p-8 text-center transition-shadow border-t-2 ${isDark ? 'bg-[#111118] border-[#1E1E2E] border-t-[#FFD700]' : 'bg-gray-50 border-gray-200 border-t-[#D4A800] shadow-sm hover:shadow-md'}`}
            >
              <Zap size={20} className={`mx-auto mb-4 opacity-70 ${isDark ? 'text-[#FFD700]' : 'text-[#B8860B]'}`} />
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
                viewport={{ once: true }}
                className={`font-black text-6xl md:text-8xl ${isDark ? 'text-[#FFD700]' : 'text-[#B8860B]'}`}
                style={{ textShadow: isDark ? '0 0 40px rgba(255,215,0,0.4)' : 'none' }}
              >
                2x
              </motion.div>
              <p className={`text-base mt-3 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Velocidad de despacho de órdenes vs. métodos tradicionales</p>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 2 * 0.2 }}
              className={`rounded-2xl p-8 text-center transition-shadow border-t-2 ${isDark ? 'bg-[#111118] border-[#1E1E2E] border-t-[#FFD700]' : 'bg-gray-50 border-gray-200 border-t-[#D4A800] shadow-sm hover:shadow-md'}`}
            >
              <ShieldCheck size={20} className={`mx-auto mb-4 opacity-70 ${isDark ? 'text-[#FFD700]' : 'text-[#B8860B]'}`} />
              <div
                className={`font-black text-6xl md:text-8xl ${isDark ? 'text-[#FFD700]' : 'text-[#B8860B]'}`}
                style={{ textShadow: isDark ? '0 0 40px rgba(255,215,0,0.4)' : 'none' }}
              >
                <AnimatedCounter target={100} suffix="%" duration={2200} />
              </div>
              <p className={`text-base mt-3 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Control de inventario en tiempo real</p>
            </motion.div>

          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {[
              { text: "Panaderías", icon: Croissant },
              { text: "Bebidas", icon: GlassWater },
              { text: "Restaurantes", icon: UtensilsCrossed },
              { text: "Domicilios", icon: Bike }
            ].map((pill, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 rounded-full px-6 py-3 md:px-5 md:py-2.5 min-h-[44px] text-sm font-medium transition-all duration-200 cursor-default ${isDark
                    ? 'bg-[#111118] border border-[#1E1E2E] text-gray-300 hover:border-[#FFD700]/40 hover:text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-400 hover:text-gray-900'
                  }`}
              >
                <pill.icon size={16} className={isDark ? "text-[#FFD700]" : "text-[#D4A800]"} />
                {pill.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN B: Features ── */}
      <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-[#1E1E2E]' : 'via-gray-200'} to-transparent`} />
      <section className={`py-24 px-6 ${isDark ? 'bg-[#080810]' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto">
          <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-[#FFD700]/20' : 'via-gray-300'} to-transparent mb-16`} />
          <div className="text-center mb-16">
            <h2 className={`font-display font-bold text-3xl md:text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Todo lo que necesitas. En un solo sistema.
            </h2>
            <p className={`text-base mt-3 max-w-xl mx-auto text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Cada módulo diseñado para el ritmo real de tu negocio.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: ShoppingCart, title: "Punto de Venta Rápido", desc: "Procesa ventas en segundos. Interfaz táctil optimizada para hora pico.", tag: "POS" },
              { icon: Package, title: "Control de Inventario", desc: "Registra por unidad, peso o porción. Alertas automáticas de stock bajo.", tag: "Inventario" },
              { icon: Bike, title: "Domicilios Inteligentes", desc: "Zonas de entrega configurables, cálculo automático de tarifa y asignación de repartidores.", tag: "Domicilios" },
              { icon: Wallet, title: "Gestión de Nómina", desc: "Calcula y gestiona pagos de empleados, deducciones, y mantén el historial financiero al día.", tag: "Finanzas" },
              { icon: BarChart3, title: "Reportes y Caja", desc: "Cierre de caja automático, ventas por hora, por producto y por vendedor.", tag: "Reportes" },
              { icon: Users, title: "Multi-usuario y Roles", desc: "Cajero, Administrador, Domiciliario. Cada rol ve solo lo que necesita.", tag: "Equipo" }
            ].map((feat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group relative p-6 rounded-2xl transition-all duration-300 ${isDark
                    ? 'bg-[#0D0D14] border border-[#1E1E2E] hover:border-[#FFD700]/20'
                    : 'bg-white border border-gray-200 shadow-sm hover:border-yellow-300 hover:shadow-md'
                  }`}
                style={isDark ? { boxShadow: '0 0 20px rgba(255,215,0,0)' } : {}}
                whileHover={isDark ? { boxShadow: '0 0 20px rgba(255,215,0,0.05)' } : {}}
              >
                <div className="flex items-start gap-6">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-[#FFD700]/10' : 'bg-yellow-50 border border-yellow-100'
                    }`}>
                    <feat.icon size={28} className={isDark ? "text-[#FFD700]" : "text-[#B8860B]"} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{feat.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-[#FFD700]/10 text-[#FFD700]' : 'bg-yellow-50 text-[#B8860B] border border-yellow-200'
                        }`}>{feat.tag}</span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} leading-relaxed`}>{feat.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN C: How It Works ── */}
      <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-[#1E1E2E]' : 'via-gray-200'} to-transparent`} />
      <section className={`py-24 px-6 ${isDark ? 'bg-[#0A0A0F]' : 'bg-white'}`}>
        <div className="max-w-6xl mx-auto text-center">
          <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-[#FFD700]/20' : 'via-gray-300'} to-transparent mb-16`} />
          <h2 className={`font-display font-bold text-3xl md:text-4xl mb-20 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ¿Cómo empiezo?
          </h2>

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
            {/* Dashed connector line */}
            <div className={`absolute top-1/2 left-0 w-full h-px -translate-y-1/2 hidden lg:block z-0 ${isDark
                ? 'bg-gradient-to-r from-[#FFD700]/20 via-[#FFD700]/60 to-[#FFD700]/20'
                : 'bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200'
              }`}></div>

            {[
              { icon: ClipboardList, num: "1", title: "Regístrate", desc: "Llena el formulario con los datos de tu negocio. Tarda menos de 2 minutos." },
              { icon: Headphones, num: "2", title: "Te contactamos", desc: "Nuestro equipo activa y configura tu instancia en menos de 24 horas." },
              { icon: Zap, num: "3", title: "Empieza a vender", desc: "Acceso completo a ORDENPOS. Sin contratos. Sin letra pequeña." }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                className={`relative z-10 flex flex-col items-center text-center w-full lg:w-1/3 p-8 rounded-2xl ${isDark ? 'bg-[#0D0D14] border border-[#1E1E2E]' : 'bg-gray-50 border border-gray-200 shadow-sm'
                  }`}
              >
                <div className={`absolute -top-4 -left-4 w-8 h-8 rounded-full font-black text-sm flex items-center justify-center ${isDark ? 'bg-[#FFD700] text-black' : 'bg-[#FFD700] text-gray-900'
                  }`}>
                  {step.num}
                </div>
                <div className="w-20 h-20 rounded-full bg-transparent flex items-center justify-center mb-0 mt-0">
                  <step.icon size={28} className={isDark ? "text-[#FFD700]" : "text-[#B8860B]"} />
                </div>
                <h3 className={`font-bold text-lg mt-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{step.title}</h3>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{step.desc}</p>
                <div className={`mt-6 h-0.5 w-8 rounded-full ${isDark ? 'bg-[#FFD700]' : 'bg-[#D4A800]'}`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN D: Final CTA ── */}
      <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-[#1E1E2E]' : 'via-gray-200'} to-transparent`} />
      <section
        className="py-24 px-6 relative overflow-hidden"
        style={{
          backgroundImage: isDark ? 'radial-gradient(circle, rgba(255,215,0,0.06) 1px, transparent 1px)' : 'radial-gradient(circle, rgba(180,140,0,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundColor: isDark ? '#0A0A0F' : '#FFFDF0'
        }}
      >
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`font-display font-bold text-3xl md:text-4xl mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            ¿Listo para transformar tu negocio?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            Únete a los negocios que ya confían en ORDENPOS
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className={`text-xs mt-3 mb-12 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}
          >
            Sin contratos. Sin letra pequeña. Sin complicaciones.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-6"
          >
            <button
              onClick={() => setShowRegister(true)}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[#FFD700] text-gray-900 font-bold text-lg hover:scale-105 active:scale-95 transition-all"
              style={{ boxShadow: '0 8px 30px rgba(255,215,0,0.35)' }}
            >
              Registrar mi Negocio
            </button>
            <button
              onClick={() => window.open("https://wa.me/573136622089?text=Hola,%20quiero%20registrar%20mi%20negocio%20en%20ORDENPOS%20y%20necesito%20informaci%C3%B3n.", "_blank")}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[#25D366] text-white font-bold text-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              style={{ boxShadow: '0 8px 30px rgba(37,211,102,0.3)' }}
            >
              <MessageCircle size={24} />
              Hablar con un asesor
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── SECCIÓN E: Footer ── */}
      <div className={`h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-gray-200'} to-transparent`} />
      <footer className={`${isDark ? 'bg-[#080808]' : 'bg-white border-t border-gray-100'} py-12 px-6`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
          <div className="flex items-center gap-3">
            <OrdenposLogo size={32} className={isDark ? "text-white" : "text-black"} />
            <div>
              <span className={`font-display font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>ORDENPOS</span>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>El orden que tu negocio necesitaba.</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center text-sm font-medium">
            <button onClick={() => setShowPrivacy(true)} className={`${isDark ? 'text-gray-400 hover:text-[#FFD700]' : 'text-gray-500 hover:text-gray-900'} transition-colors text-sm`}>Política de privacidad</button>
            <span className={`mx-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>
            <button onClick={() => setShowTerms(true)} className={`${isDark ? 'text-gray-400 hover:text-[#FFD700]' : 'text-gray-500 hover:text-gray-900'} transition-colors text-sm`}>Términos de uso</button>
            <span className={`mx-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>
            <button onClick={() => setShowContact(true)} className={`${isDark ? 'text-gray-400 hover:text-[#FFD700]' : 'text-gray-500 hover:text-gray-900'} transition-colors text-sm`}>Contacto</button>
          </div>

          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${isDark ? 'border-white/10 text-gray-400 hover:text-white hover:border-white/30' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400'}`}>
              {/* Instagram icon mockup */}
              <svg width="24" height="24" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </div>
            <div className={`w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${isDark ? 'border-white/10 text-gray-400 hover:text-white hover:border-white/30' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400'}`}>
              {/* Facebook icon mockup */}
              <svg width="24" height="24" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </div>
          </div>
        </div>

        <div className={`pt-8 border-t text-center text-sm ${isDark ? 'border-[#1E1E2E] text-gray-600' : 'border-gray-200 text-gray-400'}`}>
          © {new Date().getFullYear()} ORDENPOS. Todos los derechos reservados.
        </div>
      </footer>

      <LegalModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Política de Privacidad">
        <p className="text-gray-400 text-xs mb-6">Última actualización: Mayo 2025</p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">1. Responsable del tratamiento</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          ORDENPOS, operado por Gema System Group, es responsable del tratamiento de los datos personales recolectados a través de esta plataforma, en cumplimiento de la Ley 1581 de 2012 (Colombia) y sus decretos reglamentarios.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">2. Datos que recopilamos</h3>
        <ul className="list-disc pl-5 text-gray-300 text-sm leading-relaxed mb-4 space-y-1">
          <li>Nombre del negocio y del titular</li>
          <li>Número de teléfono / WhatsApp de contacto</li>
          <li>Información de ventas, inventario y operaciones del negocio</li>
          <li>Datos de uso de la plataforma (sesiones, módulos utilizados)</li>
        </ul>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">3. Finalidad del tratamiento</h3>
        <ul className="list-disc pl-5 text-gray-300 text-sm leading-relaxed mb-4 space-y-1">
          <li>Activación y gestión de la cuenta del negocio</li>
          <li>Prestación del servicio POS y módulos asociados</li>
          <li>Comunicaciones operativas y de soporte</li>
          <li>Mejora continua de la plataforma</li>
          <li>Facturación y cobro del servicio</li>
        </ul>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">4. Compartición de datos</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          ORDENPOS no vende ni cede datos personales a terceros. Solo se comparten con proveedores de infraestructura tecnológica bajo estrictos acuerdos de confidencialidad.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">5. Seguridad</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Los datos se almacenan con cifrado en tránsito (HTTPS/TLS) y en reposo. Implementamos controles de acceso por roles para proteger la información de cada negocio.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">6. Derechos del titular</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Puedes ejercer tus derechos de acceso, rectificación, supresión, portabilidad y oposición escribiendo a: gemasystemgroup@gmail.com
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">7. Retención de datos</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Los datos se conservan mientras la cuenta esté activa. Tras la cancelación, se eliminan en un plazo máximo de 90 días, salvo obligación legal de conservarlos.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">8. Cambios a esta política</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Notificaremos cambios relevantes vía correo electrónico o mediante aviso destacado en la plataforma.
        </p>
      </LegalModal>

      <LegalModal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Términos de Uso">
        <p className="text-gray-400 text-xs mb-6">Última actualización: Mayo 2025</p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">1. Aceptación</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Al registrar tu negocio y usar ORDENPOS, aceptas estos Términos. Si no estás de acuerdo, no uses el servicio.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">2. Descripción del servicio</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          ORDENPOS es una plataforma de punto de venta (POS) en la nube que incluye gestión de inventario, domicilios, reportes, módulo de panadería/producción y administración de usuarios. El acceso se otorga tras validación manual del equipo ORDENPOS.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">3. Cuenta y acceso</h3>
        <ul className="list-disc pl-5 text-gray-300 text-sm leading-relaxed mb-4 space-y-1">
          <li>Cada negocio recibe credenciales únicas e intransferibles</li>
          <li>El titular es responsable de mantener la confidencialidad de sus credenciales</li>
          <li>ORDENPOS puede suspender cuentas ante uso fraudulento, incumplimiento de pago o violación de estos términos</li>
        </ul>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">4. Uso permitido</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-2">El servicio es exclusivo para la gestión interna del negocio registrado. Queda prohibido:</p>
        <ul className="list-disc pl-5 text-gray-300 text-sm leading-relaxed mb-4 space-y-1">
          <li>Revender o sublicenciar el acceso</li>
          <li>Realizar ingeniería inversa del software</li>
          <li>Usar la plataforma para actividades ilegales</li>
          <li>Intentar acceder a datos de otros negocios</li>
        </ul>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">5. Pagos y suscripción</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          El acceso a ORDENPOS puede estar sujeto a un pago mensual acordado al momento del registro. La falta de pago puede resultar en la suspensión temporal del servicio. No se realizan reembolsos por períodos ya facturados.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">6. Disponibilidad</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Nos esforzamos por mantener el servicio disponible 24/7. Sin embargo, no garantizamos disponibilidad ininterrumpida debido a mantenimientos programados o causas de fuerza mayor.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">7. Propiedad intelectual</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          ORDENPOS, su diseño, código y marca son propiedad exclusiva de Gema System Group. El usuario no adquiere ningún derecho sobre el software, solo una licencia de uso limitada y revocable.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">8. Limitación de responsabilidad</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          ORDENPOS no será responsable por pérdidas de datos derivadas del uso incorrecto de la plataforma, ni por daños indirectos o lucro cesante.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">9. Ley aplicable</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa se resolverá ante los tribunales competentes de la ciudad de Bogotá D.C.
        </p>

        <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-2">10. Contacto</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Para consultas sobre estos términos: gemasystemgroup@gmail.com
        </p>
      </LegalModal>

      <LegalModal isOpen={showContact} onClose={() => setShowContact(false)} title="Contáctanos">
        <p className="text-gray-400 text-xs mb-4">Estamos aquí para ayudarte</p>

        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="w-16 h-16 rounded-full bg-[#FFD700]/10 flex items-center justify-center mb-4"
          >
            <Mail size={32} className="text-[#FFD700]" />
          </motion.div>

          <h3 className="text-lg font-bold text-white mb-6">
            ¿Tienes preguntas o quieres registrar tu negocio?
          </h3>

          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=gemasystemgroup@gmail.com&su=Consulta%20sobre%20ORDENPOS&body=Hola%20equipo%20de%20ORDENPOS,%0A%0AMe%20gustar%C3%ADa%20obtener%20m%C3%A1s%20informaci%C3%B3n%20sobre%20su%20sistema%20para%20mi%20negocio.%0A%0A-%20Nombre%20del%20negocio:%20%0A-%20Ciudad:%20%0A%0A%C2%A1Gracias!"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-[#FFD700] text-black font-bold text-lg hover:scale-105 active:scale-95 transition-transform mb-6 shadow-[0_0_15px_rgba(255,215,0,0.4)] w-full sm:w-auto"
          >
            <Mail size={20} />
            gemasystemgroup@gmail.com
          </a>

          <div className="flex items-center gap-4 w-full mb-6">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-gray-500 text-xs uppercase tracking-wider">o escríbenos por WhatsApp</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <button
            onClick={() => window.open('https://wa.me/573136622089?text=Hola,%20tengo%20una%20consulta%20sobre%20ORDENPOS', '_blank')}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#25D366] text-white font-bold text-lg hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(37,211,102,0.4)] mb-8 w-full sm:w-auto"
          >
            <MessageCircle size={20} />
            Abrir WhatsApp
          </button>

          <div className="text-gray-500 text-xs">
            <p className="mb-0.5">Tiempo de respuesta habitual: menos de 24 horas hábiles.</p>
            <p>Horario: Lunes a Viernes, 8:00 AM – 6:00 PM (hora Colombia)</p>
          </div>
        </div>
      </LegalModal>

    </div>
  )
}
