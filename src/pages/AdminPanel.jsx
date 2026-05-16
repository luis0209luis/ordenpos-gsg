import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/AppContext'
import { useSubscription } from '../context/SubscriptionContext'
import { Lock, Unlock, Gift, ShieldAlert, Undo2, Plus, X, Building2, KeyRound, BellRing, LayoutDashboard, Users, CircleDollarSign, Settings, ShieldCheck, Activity, Trash2, Pencil } from 'lucide-react'
import AdminMasterStats from '../components/AdminMasterStats'
import SystemSecurity from '../components/SystemSecurity'
import AdminMasterFinance from '../components/AdminMasterFinance'
import { sendWelcomeEmail } from '../utils/emailService'
import { insertLog } from '../utils/logger'

export default function AdminPanel() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { forceBlock, forceUnblock, addMonth, removeMonth, fechaVencimiento, daysRemaining, phase } = useSubscription()

  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'clients', 'finance', 'settings', 'security'

  // CRUD Negocios
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBizId, setEditingBizId] = useState(null)
  const [businessToDelete, setBusinessToDelete] = useState(null)
  const [businessToReset, setBusinessToReset] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [formData, setFormData] = useState({ 
    name: '', owner: '', cedula: '', email: '', phone: '', startDate: new Date().toISOString().split('T')[0] 
  })

  const [planPrice, setPlanPrice] = useState(() => {
    const saved = localStorage.getItem('ordenpos_subscription_price')
    return saved ? Number(saved) : 50000
  })

  const [settingsMaster, setSettingsMaster] = useState(() => {
    const saved = localStorage.getItem('ordenpos_settings_master')
    return saved ? JSON.parse(saved) : {
      email_notificaciones: '',
      whatsapp_notificaciones: '',
      enablePanel: true,
      enableEmail: false,
      enableWhatsApp: false
    }
  })

  useEffect(() => {
    if (isAuthenticated) {
      const loadBusinesses = async () => {
        setLoading(true)
        try {
          const { data } = await supabase.from('businesses').select('*')
          if (data) setBusinesses(data)
        } catch (e) {
          console.error(e)
        } finally {
          setLoading(false)
        }
      }
      loadBusinesses()
    }
  }, [isAuthenticated])

  useEffect(() => {
    localStorage.setItem('ordenpos_subscription_price', planPrice)
  }, [planPrice])

  useEffect(() => {
    localStorage.setItem('ordenpos_settings_master', JSON.stringify(settingsMaster))
  }, [settingsMaster])

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === '0209adm') {
      setIsAuthenticated(true)
      setError(false)
      insertLog({ type: 'success', action: 'superadmin_login', business_id: 'master', username: 'Superadmin', message: 'Inicio de sesión exitoso al panel master' })
    } else {
      setError(true)
      setPassword('')
      insertLog({ type: 'error', action: 'superadmin_login_failed', business_id: 'master', username: 'Desconocido', message: 'Intento fallido de login con clave incorrecta' })
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    if (editingBizId) {
      const updateData = {
        name: formData.name,
        owner_name: formData.owner,
        cedula: formData.cedula,
        email: formData.email,
        phone: formData.phone,
        start_date: formData.startDate
      }
      setBusinesses(prev => prev.map(b => b.id === editingBizId ? { ...b, ...formData, owner_name: formData.owner, start_date: formData.startDate, password_hash: b.password_hash } : b))
      try {
        await supabase.from('businesses').update(updateData).eq('id', editingBizId)
        insertLog({ type: 'success', action: 'update_business', business_id: editingBizId, username: 'Superadmin', message: `Negocio actualizado: ${formData.name}` })
      } catch (e) { 
        console.error(e) 
        insertLog({ type: 'error', action: 'update_business', business_id: editingBizId, username: 'Superadmin', message: `Error al actualizar: ${e.message}` })
      }
    } else {
      const newBusiness = {
        name: formData.name,
        owner_name: formData.owner,
        cedula: formData.cedula,
        email: formData.email,
        phone: formData.phone,
        start_date: formData.startDate,
        password_hash: formData.cedula,
        force_phase: null,
        days_remaining: 30
      }
      try {
        const { data, error } = await supabase.from('businesses').insert(newBusiness).select().single()
        if (error) {
          console.error("Supabase Error en AdminPanel:", error)
          insertLog({ type: 'error', action: 'create_business', business_id: 'master', username: 'Superadmin', message: `Error al crear negocio: ${error.message}` })
          throw error
        }
        if (data) {
          setBusinesses([...businesses, data])
          insertLog({ type: 'success', action: 'create_business', business_id: data.id, username: 'Superadmin', message: `Negocio creado: ${data.name}` })
          if (formData.email) {
            sendWelcomeEmail({
              to: formData.email,
              ownerName: formData.owner,
              businessName: formData.name,
              cedula: formData.cedula
            }).catch(console.error)
          }
        }
      } catch (e) { console.error("Catch error:", e) }
    }
    
    handleCloseModal()
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingBizId(null)
    setFormData({ name: '', owner: '', cedula: '', email: '', phone: '', startDate: new Date().toISOString().split('T')[0] })
  }

  const handleEditClick = (biz) => {
    setEditingBizId(biz.id)
    setFormData({
      name: biz.name,
      owner: biz.owner_name || '',
      cedula: biz.cedula,
      email: biz.email || '',
      phone: biz.phone || '',
      startDate: biz.start_date || new Date().toISOString().split('T')[0]
    })
    setIsModalOpen(true)
  }

  const confirmDelete = async () => {
    if (businessToDelete) {
      setBusinesses(prev => prev.filter(b => b.id !== businessToDelete.id))
      try {
        await supabase.from('businesses').delete().eq('id', businessToDelete.id)
        insertLog({ type: 'warning', action: 'delete_business', business_id: businessToDelete.id, username: 'Superadmin', message: `Negocio eliminado: ${businessToDelete.name}` })
      } catch (e) { console.error(e) }
      setBusinessToDelete(null)
    }
  }

  const confirmResetPassword = async () => {
    if (businessToReset) {
      setBusinesses(prev => prev.map(b => b.id === businessToReset.id ? { ...b, password_hash: b.cedula } : b))
      try {
        await supabase.from('businesses').update({ password_hash: businessToReset.cedula }).eq('id', businessToReset.id)
        insertLog({ type: 'warning', action: 'reset_password', business_id: businessToReset.id, username: 'Superadmin', message: `Contraseña restablecida para: ${businessToReset.name}` })
      } catch (e) { console.error(e) }
      setBusinessToReset(null)
    }
  }

  const handleBizBlock = async (id) => {
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, forcePhase: 3, force_phase: 3 } : b))
    try { 
      await supabase.from('businesses').update({ force_phase: 3 }).eq('id', id) 
      insertLog({ type: 'warning', action: 'block_business', business_id: id, username: 'Superadmin', message: `Negocio bloqueado manualmente` })
    } catch (e) { console.error(e) }
  }
  const handleBizUnblock = async (id) => {
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, forcePhase: null, force_phase: null } : b))
    try { 
      await supabase.from('businesses').update({ force_phase: null }).eq('id', id) 
      insertLog({ type: 'success', action: 'unblock_business', business_id: id, username: 'Superadmin', message: `Negocio desbloqueado manualmente` })
    } catch (e) { console.error(e) }
  }
  const handleBizAddMonth = async (id) => {
    const biz = businesses.find(b => b.id === id)
    const newDays = (biz?.daysRemaining || biz?.days_remaining || 0) + 30
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, daysRemaining: newDays, days_remaining: newDays } : b))
    try { 
      await supabase.from('businesses').update({ days_remaining: newDays }).eq('id', id) 
      insertLog({ type: 'success', action: 'add_month', business_id: id, username: 'Superadmin', message: `Agregado 1 mes de suscripción` })
    } catch (e) { console.error(e) }
  }
  const handleBizRemoveMonth = async (id) => {
    const biz = businesses.find(b => b.id === id)
    const newDays = Math.max(0, (biz?.daysRemaining || biz?.days_remaining || 0) - 30)
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, daysRemaining: newDays, days_remaining: newDays } : b))
    try { 
      await supabase.from('businesses').update({ days_remaining: newDays }).eq('id', id) 
      insertLog({ type: 'warning', action: 'remove_month', business_id: id, username: 'Superadmin', message: `Removido 1 mes de suscripción` })
    } catch (e) { console.error(e) }
  }

  const getBizPhase = (biz) => {
    if (biz.forcePhase !== undefined && biz.forcePhase !== null) return biz.forcePhase;
    if (biz.daysRemaining <= 0) return 3;
    if (biz.daysRemaining <= 5) return 2;
    if (biz.daysRemaining <= 15) return 1;
    return 0;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 animate-fade-in">
        <form onSubmit={handleLogin} className={`p-8 rounded-3xl max-w-sm w-full border shadow-2xl text-center
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-red-500/10 border border-red-500/30">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h2 className={`font-display font-bold text-2xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Panel Master
          </h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Acceso restringido. Ingrese clave de emergencia.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className={`w-full px-4 py-3 rounded-2xl text-center text-sm font-medium outline-none border-2 transition-all focus:border-red-500 mb-4
              ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}
              ${error ? 'border-red-500' : ''}`}
          />
          <button type="submit" className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors">
            Acceder
          </button>
        </form>
      </div>
    )
  }

  const renderTabContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Dashboard Global
            </h2>
            <AdminMasterStats />
          </div>
        )
      
      case 'clients':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header del Panel de Emergencia y CRUD */}
            <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4
              ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-500">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Gestión de Clientes
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Registro, edición y control de suscripciones SaaS.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center gap-2
                bg-gold-gradient text-dark-bg shadow-gold-md hover:shadow-gold-lg
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 whitespace-nowrap"
              >
                <Plus size={18} /> Crear Nuevo Negocio
              </button>
            </div>

            {/* Table */}
            <div className={`rounded-3xl border overflow-hidden ${isDark ? 'border-dark-border bg-dark-card' : 'border-light-border bg-light-surface'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-dark-border bg-dark-bg/50 text-gray-400' : 'border-light-border bg-gray-50 text-gray-500'}`}>
                      <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Negocio / Propietario</th>
                      <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Credenciales</th>
                      <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Suscripción SaaS</th>
                      <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider text-right">Acciones de Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/50">
                    {businesses.map(biz => {
                      const computedPhase = getBizPhase(biz)
                      const computedDate = new Date(new Date(biz.start_date || biz.startDate).getTime() + ((biz.days_remaining || biz.daysRemaining)*24*60*60*1000)).toLocaleDateString()
                      return (
                        <tr key={biz.id} className={`transition-colors ${isDark ? 'hover:bg-dark-bg/30' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500">
                                <Building2 size={20} />
                              </div>
                              <div>
                                <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{biz.name}</p>
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{biz.owner_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><span className="font-semibold text-gray-500">ID:</span> {biz.id}</p>
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><span className="font-semibold text-gray-500">PWD:</span> {biz.password_hash}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                                  ${computedPhase === 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                    computedPhase === 1 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                                    computedPhase === 2 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                                    'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                  {computedPhase === 0 ? 'Al Día' : `Fase ${computedPhase}`}
                                </span>
                                {biz.forcePhase === 3 && (
                                  <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1">
                                    <Lock size={10} /> Forzado
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Vence: {computedDate}
                              </p>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleBizAddMonth(biz.id)} className="p-1 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors" title="+ 30 Días">
                                  <Plus size={14} />
                                </button>
                                <button onClick={() => handleBizRemoveMonth(biz.id)} className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="- 30 Días">
                                  <Undo2 size={14} />
                                </button>
                                <span className={`text-[10px] ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({biz.daysRemaining}d totales)</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {biz.forcePhase === 3 ? (
                                <button onClick={() => handleBizUnblock(biz.id)} className="p-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/20" title="Desbloquear Negocio">
                                  <Unlock size={18} />
                                </button>
                              ) : (
                                <button onClick={() => handleBizBlock(biz.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/20" title="Forzar Bloqueo">
                                  <Lock size={18} />
                                </button>
                              )}
                              <button onClick={() => setBusinessToReset(biz)} className="p-2 rounded-xl bg-dark-card border border-dark-border hover:border-gold-500/50 text-gray-400 hover:text-gold-500 transition-all shadow-lg shadow-gold-500/5" title="Restablecer Clave (Cédula original)">
                                <KeyRound size={18} />
                              </button>
                              <button onClick={() => handleEditClick(biz)} className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-dark-card border-dark-border hover:border-blue-500/50 text-gray-400 hover:text-blue-500' : 'bg-white border-light-border hover:border-blue-500/50 text-gray-500 hover:text-blue-500'}`} title="Editar Cliente">
                                <Pencil size={18} />
                              </button>
                              <button onClick={() => setBusinessToDelete(biz)} className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-dark-card border-dark-border hover:border-red-500/50 text-gray-400 hover:text-red-500' : 'bg-white border-light-border hover:border-red-500/50 text-gray-500 hover:text-red-500'}`} title="Eliminar Cliente">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {businesses.length === 0 && (
                      <tr>
                        <td colSpan="4" className={`px-6 py-8 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          No hay negocios adicionales registrados. Crea uno nuevo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'finance':
        return <AdminMasterFinance businesses={businesses} planPrice={planPrice} />

      case 'settings':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Configuración de Precios de Planes */}
            <div className={`p-6 rounded-3xl border
              ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-gold-500/10 text-gold-500">
                  <Gift size={24} />
                </div>
                <div>
                  <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Parámetros Globales
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Define el costo estándar de la renovación (30 días).
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Costo de Renovación (COP)</label>
                  <input type="number" value={planPrice} onChange={e => setPlanPrice(Number(e.target.value))}
                    className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                    ${isDark ? 'bg-dark-bg border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`} />
                </div>
              </div>
            </div>

            {/* Configuración de Notificaciones */}
            <div className={`p-6 rounded-3xl border
              ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                  <BellRing size={24} />
                </div>
                <div>
                  <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Ajustes de Notificaciones
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Configura dónde y cómo recibes alertas de nuevos pagos.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Email Destino (Notificaciones)</label>
                    <input type="email" placeholder="admin@ordenpos.com" value={settingsMaster.email_notificaciones} onChange={e => setSettingsMaster({...settingsMaster, email_notificaciones: e.target.value})}
                      className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-blue-500
                      ${isDark ? 'bg-dark-bg border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>WhatsApp Destino (Futuro)</label>
                    <input type="tel" placeholder="+57 300 000 0000" value={settingsMaster.whatsapp_notificaciones} onChange={e => setSettingsMaster({...settingsMaster, whatsapp_notificaciones: e.target.value})}
                      className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-blue-500
                      ${isDark ? 'bg-dark-bg border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`} />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className={`text-xs font-semibold uppercase block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Canales Activos</label>
                  
                  <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity
                    ${isDark ? 'border-dark-border bg-dark-bg' : 'border-light-border bg-white'}`}>
                    <div>
                      <p className="font-bold text-sm">Alertas de Panel (Web)</p>
                      <p className="text-xs text-gray-500">Toast y sonido interno.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${settingsMaster.enablePanel ? 'bg-blue-500' : 'bg-gray-600'}`}>
                      <input type="checkbox" className="sr-only" checked={settingsMaster.enablePanel} onChange={e => setSettingsMaster({...settingsMaster, enablePanel: e.target.checked})} />
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settingsMaster.enablePanel ? 'translate-x-6' : ''}`} />
                    </div>
                  </label>

                  <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity
                    ${isDark ? 'border-dark-border bg-dark-bg' : 'border-light-border bg-white'}`}>
                    <div>
                      <p className="font-bold text-sm">Alertas por Email</p>
                      <p className="text-xs text-gray-500">Envío automático (Nodemailer).</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${settingsMaster.enableEmail ? 'bg-blue-500' : 'bg-gray-600'}`}>
                      <input type="checkbox" className="sr-only" checked={settingsMaster.enableEmail} onChange={e => setSettingsMaster({...settingsMaster, enableEmail: e.target.checked})} />
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settingsMaster.enableEmail ? 'translate-x-6' : ''}`} />
                    </div>
                  </label>

                  <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity
                    ${isDark ? 'border-dark-border bg-dark-bg' : 'border-light-border bg-white'}`}>
                    <div>
                      <p className="font-bold text-sm">Alertas por WhatsApp</p>
                      <p className="text-xs text-gray-500">Integración pendiente.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${settingsMaster.enableWhatsApp ? 'bg-blue-500' : 'bg-gray-600'}`}>
                      <input type="checkbox" className="sr-only" checked={settingsMaster.enableWhatsApp} onChange={e => setSettingsMaster({...settingsMaster, enableWhatsApp: e.target.checked})} />
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settingsMaster.enableWhatsApp ? 'translate-x-6' : ''}`} />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'security':
        return <SystemSecurity businesses={businesses} />
    }
  }

  return (
    <div className="h-full flex gap-6 p-4 lg:p-6 max-w-[1600px] mx-auto animate-fade-in">
      
      {/* Sidebar Navigation */}
      <div className={`w-64 flex-shrink-0 flex flex-col rounded-3xl border shadow-soft-lg overflow-hidden
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
        
        <div className={`p-6 border-b ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-gradient text-dark-bg flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="font-display font-black text-lg gold-text tracking-tight uppercase">ORDENPOS</h1>
              <p className={`text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Admin Master</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Resumen Global', icon: LayoutDashboard },
            { id: 'clients', label: 'Gestión SaaS', icon: Users },
            { id: 'finance', label: 'Finanzas', icon: CircleDollarSign },
            { id: 'settings', label: 'Ajustes del Sistema', icon: Settings },
            { id: 'security', label: 'Seguridad', icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all
                  ${isActive 
                    ? 'bg-gold-500/10 text-gold-500' 
                    : isDark 
                      ? 'text-gray-400 hover:text-white hover:bg-white/5' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-gold-500' : 'opacity-70'} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className={`p-4 border-t ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
           <button 
            onClick={() => setIsAuthenticated(false)}
            className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
          >
            Bloquear Panel
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 rounded-3xl border shadow-soft-lg overflow-y-auto p-6 lg:p-8
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
        {renderTabContent()}
      </div>

      {/* Modal CRUD Negocios */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`relative w-full max-w-md p-8 rounded-3xl shadow-2xl animate-slide-in-up border
            ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
            
            <button onClick={handleCloseModal} className={`absolute top-6 right-6 p-2 rounded-full transition-colors
              ${isDark ? 'hover:bg-dark-card text-gray-400' : 'hover:bg-light-surface text-gray-500'}`}>
              <X size={20} />
            </button>
            
            <h2 className={`font-display font-bold text-2xl mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingBizId ? 'Editar Negocio' : 'Nuevo Negocio'}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nombre del Negocio</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dueño / Contacto</label>
                  <input required type="text" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})}
                    className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cédula (ID)</label>
                  <input required type="text" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})}
                    className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Correo</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Teléfono</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fecha Inicio Suscripción</label>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white [color-scheme:dark]' : 'bg-light-surface border-light-border text-gray-900'}`} />
              </div>

              <button type="submit" className="w-full py-4 mt-4 rounded-2xl font-bold text-sm tracking-wider uppercase flex justify-center items-center gap-2
                bg-gold-gradient text-dark-bg shadow-gold-md hover:shadow-gold-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                {editingBizId ? <><Pencil size={18} /> Guardar Cambios</> : <><Plus size={18} /> Registrar Negocio</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {businessToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl text-center animate-scale-in
            ${isDark ? 'bg-dark-surface border-red-500/30' : 'bg-white border-red-500/30'}`}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-red-500/10 flex items-center justify-center text-red-500">
              <Trash2 size={32} />
            </div>
            <h3 className={`font-display font-bold text-xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ¿Eliminar Negocio?
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Estás a punto de borrar permanentemente a <strong className="text-red-500">{businessToDelete.name}</strong>. Esta acción no se puede deshacer y perderá su acceso.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBusinessToDelete(null)} className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border transition-colors
                ${isDark ? 'border-dark-border hover:bg-white/5 text-gray-400' : 'border-light-border hover:bg-black/5 text-gray-600'}`}>
                Cancelar
              </button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {businessToReset && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl text-center animate-scale-in
            ${isDark ? 'bg-dark-surface border-gold-500/30' : 'bg-white border-gold-500/30'}`}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-gold-500/10 flex items-center justify-center text-gold-500">
              <KeyRound size={32} />
            </div>
            <h3 className={`font-display font-bold text-xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ¿Restablecer Contraseña?
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              La contraseña del administrador para <strong className="text-gold-500">{businessToReset.name}</strong> volverá a ser su número de cédula (<span className="font-mono">{businessToReset.cedula}</span>).
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBusinessToReset(null)} className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border transition-colors
                ${isDark ? 'border-dark-border hover:bg-white/5 text-gray-400' : 'border-light-border hover:bg-black/5 text-gray-600'}`}>
                Cancelar
              </button>
              <button onClick={confirmResetPassword} className="flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-gold-gradient text-dark-bg hover:shadow-gold-lg transition-all">
                Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
