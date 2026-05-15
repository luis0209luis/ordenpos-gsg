import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/AppContext'
import OrdenposLogo from '../components/OrdenposLogo'
import { Eye, EyeOff, Sun, Moon, Lock, User, ArrowRight, ArrowLeft, AlertCircle, ShieldCheck, Building2 } from 'lucide-react'

export default function Login() {
  const { login, changePassword, verifyBusiness } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [businessInput, setBusinessInput] = useState('')
  const [businessContext, setBusinessContext] = useState(null)


  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  // Password Change State
  const [tempUser, setTempUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleVerifyBusiness = async (e) => {
    e.preventDefault()
    if (!businessInput) {
      setError('Por favor ingrese el nombre o ID de su empresa.')
      triggerShake()
      return
    }
    setLoading(true)
    setError('')

    await new Promise(r => setTimeout(r, 600))
    const result = await verifyBusiness(businessInput)
    setLoading(false)

    if (result.success) {
      setBusinessContext(result.business)
      setStep(2)
    } else {
      setError(result.error)
      triggerShake()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Por favor complete todos los campos.')
      triggerShake()
      return
    }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 600))
    const result = await login(username, password, businessContext.id)
    setLoading(false)

    if (result.success) {
      if (result.requiresPasswordChange) {
        setTempUser(result.tempUser)
      } else {
        navigate('/dashboard')
      }
    } else {
      setError(result.error)
      triggerShake()
    }
  }

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      setError('Complete todos los campos.')
      triggerShake()
      return
    }
    if (newPassword === password) {
      setError('La nueva contraseña debe ser diferente a la cédula.')
      triggerShake()
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      triggerShake()
      return
    }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 600))

    await changePassword(tempUser, newPassword)
    setLoading(false)
    navigate('/dashboard')
  }

  const handleForgotPassword = () => {
    setError('Por seguridad, contacta al soporte central de ORDENPOS para restablecer tus credenciales.')
    triggerShake()
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  return (
    <div className={`
      min-h-screen flex items-center justify-center relative overflow-hidden
      ${theme === 'dark' ? 'bg-dark-bg' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}
    `}>
      {/* Background decorative blobs */}
      {theme === 'dark' ? (
        <>
          <div className="absolute top-[-120px] left-[-120px] w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)' }} />
        </>
      ) : (
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)' }} />
      )}

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-2xl transition-all duration-300 hover:scale-110 z-10
          ${theme === 'dark' ? 'bg-dark-card border border-dark-border text-gold-400' : 'bg-white border border-light-border text-gold-600'}`}
        title="Cambiar tema"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Card */}
      <div className={`
        relative w-full max-w-md mx-4 rounded-4xl overflow-hidden animate-slide-in-up
        ${shake ? 'animate-[shake_0.4s_ease]' : ''}
        ${theme === 'dark' ? 'bg-dark-surface border border-dark-border shadow-dark-lg' : 'bg-white border border-light-border shadow-soft-lg'}
      `} style={shake ? { animation: 'shake 0.4s ease' } : {}}>
        <div className="h-1 w-full bg-gold-gradient" />

        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-3xl animate-pulse-gold" />
              <OrdenposLogo size={72} className="relative z-10 drop-shadow-lg" />
            </div>
            <h1 className="font-display font-black text-3xl tracking-tight gold-text text-center">
              {tempUser ? 'SEGURIDAD' : (businessContext ? businessContext.name : 'ORDENPOS')}
            </h1>
            <p className={`text-sm mt-1 font-medium tracking-widest uppercase text-center
              ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {tempUser ? 'Actualización Requerida' : (businessContext ? 'Acceso de Personal' : 'Sistema de Punto de Venta')}
            </p>
          </div>

          {tempUser ? (
            <form onSubmit={handlePasswordChangeSubmit} noValidate className="space-y-5">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl text-sm flex gap-3 mb-6">
                <ShieldCheck size={24} className="shrink-0" />
                <p>Por seguridad, al ser tu primer ingreso, debes cambiar tu contraseña predeterminada.</p>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Nueva Contraseña</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Ej. claveSegura123"
                  className={`w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                    ${theme === 'dark' ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
              </div>
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Confirmar Contraseña</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite la nueva contraseña"
                  className={`w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                    ${theme === 'dark' ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                  <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 bg-gold-gradient text-dark-bg shadow-gold-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                {loading ? 'Guardando...' : 'Guardar y Entrar'}
              </button>
            </form>
          ) : step === 1 ? (
            <form onSubmit={handleVerifyBusiness} noValidate className="space-y-5 animate-slide-in-right">
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Empresa / Local</label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}><Building2 size={18} /></span>
                  <input type="text" value={businessInput} onChange={e => setBusinessInput(e.target.value)} placeholder="Ingresa el nombre de la empresa"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                      ${theme === 'dark' ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                  <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 bg-gold-gradient text-dark-bg shadow-gold-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                {loading ? 'Verificando...' : <><>Continuar</><ArrowRight size={18} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5 animate-slide-in-right">
              <button type="button" onClick={() => { setStep(1); setError(''); setUsername(''); setPassword(''); }} className={`text-xs font-semibold flex items-center gap-1 hover:text-gold-500 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} -mt-2 mb-2`}>
                <ArrowLeft size={14} /> Cambiar Empresa
              </button>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Usuario</label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}><User size={18} /></span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ej. administrador o admin" autoComplete="username"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                      ${theme === 'dark' ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Contraseña</label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}><Lock size={18} /></span>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Ingrese su contraseña"
                    className={`w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                      ${theme === 'dark' ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                  <button type="button" onClick={() => setShowPass(s => !s)} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-gray-500 hover:text-gold-400' : 'text-gray-400 hover:text-gold-600'}`}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button type="button" onClick={handleForgotPassword} className={`text-xs font-semibold transition-colors hover:text-gold-500 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                  <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 bg-gold-gradient text-dark-bg shadow-gold-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                {loading ? 'Autenticando...' : <><>Iniciar Sesión</><ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          <p className={`text-center text-xs mt-8 font-medium ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            © {new Date().getFullYear()} ORDENPOS · Todos los derechos reservados
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
