import React, { useState, useEffect } from 'react'
import { useTheme, useSettings, useAuth } from '../context/AppContext'
import { Settings as SettingsIcon, Save, Building2, FileText, MapPin, Hash, DollarSign, Bell, Users, UserPlus, Trash2, KeyRound, ShieldCheck, CheckSquare, Square, Calendar, User } from 'lucide-react'

const defaultPermissions = {
  CAJERO: ['/pos', '/deliveries', '/inventory'],
  DOMICILIARIO: ['/deliveries'],
  PREPARADOR: ['/kitchen']
};

const availableModules = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/pos', label: 'Punto de Venta' },
  { path: '/deliveries', label: 'Domicilios' },
  { path: '/inventory', label: 'Inventario' },
  { path: '/finance', label: 'Finanzas' },
  { path: '/reports', label: 'Reportes' },
  { path: '/payments', label: 'Mi Suscripción' },
  { path: '/settings', label: 'Configuración' },
  { path: '/kitchen', label: 'Monitor de Órdenes' }
];

export default function Settings() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user, changePassword } = useAuth()
  const { settings, updateSettings, staff, addStaff, deleteStaff, changeStaffPassword, updateStaffPermissions, isConfigured } = useSettings()

  const [formData, setFormData] = useState(settings)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'CAJERO', permissions: defaultPermissions.CAJERO })
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [staffSuccess, setStaffSuccess] = useState('')

  // Admin password state
  const [adminPass, setAdminPass] = useState({ newPass: '', confirmPass: '' })
  const [passMessage, setPassMessage] = useState('')
  const [isEditingAdminPass, setIsEditingAdminPass] = useState(false)

  // Staff password state
  const [editingStaffId, setEditingStaffId] = useState(null)
  const [staffPass, setStaffPass] = useState({ newPass: '', confirmPass: '' })
  const [staffPassMessage, setStaffPassMessage] = useState('')
  const [editStaffPermissions, setEditStaffPermissions] = useState([])

  // Sync if global settings change from somewhere else
  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
    setIsSaved(false)
    setSettingsError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setSettingsError('')
    setIsSaved(false)
    const res = await updateSettings(formData)
    setIsSaving(false)
    if (res?.success) {
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } else {
      setSettingsError(res?.error || 'Error al guardar los cambios.')
    }
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    if (!newStaff.username || !newStaff.password || !newStaff.name) return
    setIsAddingStaff(true)
    setStaffError('')
    setStaffSuccess('')
    const res = await addStaff({
      name: newStaff.name,
      username: newStaff.username,
      password: newStaff.password,
      role: newStaff.role,
      permissions: newStaff.permissions
    })
    setIsAddingStaff(false)
    if (res?.success) {
      setStaffSuccess('¡Miembro creado con éxito!')
      setNewStaff({ name: '', username: '', password: '', role: 'CAJERO', permissions: defaultPermissions.CAJERO })
      setTimeout(() => setStaffSuccess(''), 3000)
    } else {
      setStaffError(res?.error || 'Error al registrar al miembro.')
    }
  }

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setNewStaff({ ...newStaff, role, permissions: defaultPermissions[role] || [] });
  }

  const handleTogglePermission = (path) => {
    setNewStaff(prev => {
      const permissions = prev.permissions.includes(path)
        ? prev.permissions.filter(p => p !== path)
        : [...prev.permissions, path];
      return { ...prev, permissions };
    });
  }

  const handleToggleEditPermission = (path) => {
    setEditStaffPermissions(prev => {
      return prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
    });
  }

  const handleAdminPasswordChange = (e) => {
    e.preventDefault()
    if (!adminPass.newPass || !adminPass.confirmPass) return
    if (adminPass.newPass !== adminPass.confirmPass) {
      setPassMessage('Las contraseñas no coinciden.')
      return
    }
    changePassword(user, adminPass.newPass)
    setAdminPass({ newPass: '', confirmPass: '' })
    setPassMessage('¡Contraseña actualizada exitosamente!')
    setTimeout(() => {
      setPassMessage('')
      setIsEditingAdminPass(false)
    }, 2000)
  }

  const handleStaffUpdate = async (id) => {
    let hasPassUpdate = false;
    setStaffPassMessage('')
    if (staffPass.newPass || staffPass.confirmPass) {
      if (staffPass.newPass !== staffPass.confirmPass) {
        setStaffPassMessage('Las contraseñas no coinciden.')
        return
      }
      const resPass = await changeStaffPassword(id, staffPass.newPass)
      if (resPass && !resPass.success) {
        setStaffPassMessage(resPass.error || 'Error al cambiar contraseña.')
        return
      }
      hasPassUpdate = true;
    }
    
    const resPerm = await updateStaffPermissions(id, editStaffPermissions);
    if (resPerm && !resPerm.success) {
      setStaffPassMessage(resPerm.error || 'Error al actualizar permisos.')
      return
    }
    
    setStaffPassMessage(hasPassUpdate ? '¡Contraseña y permisos actualizados!' : '¡Permisos actualizados!')
    setTimeout(() => {
      setStaffPassMessage('')
      setEditingStaffId(null)
    }, 2000)
  }

  const handleDeleteStaff = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar a este miembro de personal?')) {
      const res = await deleteStaff(id)
      if (res && !res.success) {
        alert(res.error || 'Error al eliminar el miembro de personal.')
      }
    }
  }

  // Filter staff for this business
  const businessStaff = staff.filter(s => s.businessId === user?.businessId)

  return (
    <div className="space-y-6 animate-fade-in pb-8 max-w-4xl">
      <div className={`p-6 rounded-3xl shadow-soft-lg border flex items-center justify-between
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gold-500/10 text-gold-500">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Configuración Global
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Personaliza los detalles de tu negocio y ajustes del sistema.
            </p>
          </div>
        </div>
      </div>

      {!isConfigured && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-pulse flex flex-col gap-1">
          <span className="font-bold text-base flex items-center gap-2">⚠️ Configuración Inicial Requerida</span>
          <span className="text-sm opacity-90">
            Para activar todas las funciones del sistema, primero debe ingresar la información de su negocio.
            Los campos <strong>Nombre del Negocio</strong>, <strong>Propietario o Dueño</strong> y <strong>Dirección</strong> son obligatorios para habilitar el resto de módulos.
          </span>
        </div>
      )}

      {settingsError && (
        <div className="p-5 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 flex flex-col gap-1">
          <span className="font-bold text-base flex items-center gap-2">❌ Error al Guardar</span>
          <span className="text-sm opacity-90">{settingsError}</span>
        </div>
      )}

      {isSaved && (
        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex flex-col gap-1">
          <span className="font-bold text-base flex items-center gap-2">✅ Cambios Guardados</span>
          <span className="text-sm opacity-90">Los detalles del negocio y ajustes del sistema se han guardado correctamente en la base de datos.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloque: Datos del Negocio (Facturación) */}
        <div className={`p-8 rounded-3xl shadow-soft-lg border
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className={`font-display font-bold text-lg mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <FileText size={20} className="text-gold-500" />
            Datos para Ticket / Factura
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Building2 size={16} /> Nombre del Negocio
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                placeholder="Ej. Mi Cafetería Premium"
                className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <User size={16} /> Propietario o Dueño
              </label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName || ''}
                onChange={handleChange}
                required
                placeholder="Nombre del titular"
                className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Hash size={16} /> ID Fiscal (RUT/NIT/RFC)
              </label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                placeholder="Opcional"
                className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <MapPin size={16} /> Dirección
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Ej. Av. Principal 123, Ciudad"
                className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <FileText size={16} /> Mensaje al Pie del Ticket
              </label>
              <input
                type="text"
                name="footerMessage"
                value={formData.footerMessage}
                onChange={handleChange}
                placeholder="Ej. ¡Gracias por preferirnos! Vuelve pronto."
                className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
            </div>
          </div>
        </div>

        {/* Bloque: Ajustes del Sistema */}
        <div className={`p-8 rounded-3xl shadow-soft-lg border
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className={`font-display font-bold text-lg mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <SettingsIcon size={20} className="text-gold-500" />
            Preferencias del Sistema
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Bell size={16} /> Stock Mínimo Global (Alerta)
              </label>
              <input
                type="number"
                name="globalMinStock"
                min="0"
                value={formData.globalMinStock}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
              <p className="text-xs text-gray-500">Cantidad base a la que se alertará por defecto.</p>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <DollarSign size={16} /> Moneda Principal
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500 appearance-none
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              >
                <option value="$">USD ($)</option>
                <option value="COP">COP ($)</option>
                <option value="MXN">MXN ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <MapPin size={16} /> Costo por Kilómetro (Domicilios)
              </label>
              <input
                type="number"
                name="deliveryCostPerKm"
                min="0"
                value={formData.deliveryCostPerKm}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
              <p className="text-xs text-gray-500">Valor base que se multiplicará por la distancia calculada en Google Maps.</p>
            </div>
            
            {/* Payroll Settings */}
            <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-500/20">
              <h4 className={`font-semibold mb-4 ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>Fechas de Corte de Nómina</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Calendar size={16} /> Pago Mensual (Día)
                  </label>
                  <input
                    type="number"
                    name="payrollMonthlyDay"
                    min="1" max="31"
                    value={formData.payrollMonthlyDay || 30}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                      ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Calendar size={16} /> Pago Quincenal (1ra)
                  </label>
                  <input
                    type="number"
                    name="payrollBiweeklyDay1"
                    min="1" max="31"
                    value={formData.payrollBiweeklyDay1 || 15}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                      ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Calendar size={16} /> Pago Quincenal (2da)
                  </label>
                  <input
                    type="number"
                    name="payrollBiweeklyDay2"
                    min="1" max="31"
                    value={formData.payrollBiweeklyDay2 || 30}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl outline-none border-2 transition-all focus:border-gold-500
                      ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Configura los días del mes en los que realizas los pagos fijos de nómina. ORDENPOS usará esta información para alertarte sobre tus obligaciones en el Dashboard.</p>
            </div>
            
          </div>
        </div>

        {/* Bloque: Gestión de Personal (Solo para Admin del local) */}
        {user?.role === 'admin' && (
          <div className={`p-8 rounded-3xl shadow-soft-lg border mt-6
            ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
            <h3 className={`font-display font-bold text-lg mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Users size={20} className="text-gold-500" />
              Gestión de Personal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Formulario de Creación */}
              <div className="md:col-span-1 space-y-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nombre Completo</label>
                  <input type="text" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Ej. Juan Pérez"
                    className={`w-full px-3 py-2.5 rounded-xl outline-none border text-sm focus:border-gold-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Usuario</label>
                  <input type="text" value={newStaff.username} onChange={e => setNewStaff({ ...newStaff, username: e.target.value })} placeholder="Ej. juan_cajero"
                    className={`w-full px-3 py-2.5 rounded-xl outline-none border text-sm focus:border-gold-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Contraseña</label>
                  <input type="password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Contraseña segura"
                    className={`w-full px-3 py-2.5 rounded-xl outline-none border text-sm focus:border-gold-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Perfil Sugerido (Rol)</label>
                  <select value={newStaff.role} onChange={handleRoleChange}
                    className={`w-full px-3 py-2.5 rounded-xl outline-none border text-sm focus:border-gold-500 appearance-none
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}>
                    <option value="CAJERO">Cajero</option>
                    <option value="DOMICILIARIO">Domiciliario</option>
                    <option value="PREPARADOR">Preparador</option>
                  </select>
                </div>
                
                <div className="space-y-2 pt-2">
                  <label className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Permisos de Acceso al Menú</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {availableModules.map(mod => {
                      const isChecked = newStaff.permissions?.includes(mod.path);
                      return (
                        <button
                          key={mod.path}
                          type="button"
                          onClick={() => handleTogglePermission(mod.path)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all border text-left
                            ${isChecked 
                              ? (isDark ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'bg-gold-50 border-gold-300 text-gold-700') 
                              : (isDark ? 'bg-dark-surface border-dark-border text-gray-500 hover:text-gray-300' : 'bg-light-surface border-light-border text-gray-500 hover:text-gray-700')}`}
                        >
                          {isChecked ? <CheckSquare size={14} className="shrink-0" /> : <Square size={14} className="shrink-0" />}
                          <span className="truncate">{mod.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {staffError && (
                  <p className="text-[11px] font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                    ⚠️ {staffError}
                  </p>
                )}
                {staffSuccess && (
                  <p className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                    ✅ {staffSuccess}
                  </p>
                )}
                <button type="button" onClick={handleAddStaff} disabled={isAddingStaff || !newStaff.username || !newStaff.password || !newStaff.name}
                  className="w-full py-2.5 mt-2 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 bg-gold-gradient text-dark-bg disabled:opacity-50 transition-all hover:scale-[1.02]">
                  {isAddingStaff ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {isAddingStaff ? 'Creando...' : 'Crear Miembro'}
                </button>
              </div>

              {/* Lista de Personal */}
              <div className="md:col-span-2">
                <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                        <th className={`px-4 py-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Usuario</th>
                        <th className={`px-4 py-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Rol</th>
                        <th className="px-4 py-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={`border-b ${isDark ? 'border-dark-border text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                        <td className="px-4 py-3 font-bold">admin (Dueño)</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gold-500/10 text-gold-500">Admin</span></td>
                        <td className="px-4 py-3 text-center text-xs">
                          <button type="button" onClick={() => setIsEditingAdminPass(!isEditingAdminPass)} className="p-1.5 rounded-lg text-gold-500 hover:bg-gold-500/10 transition-colors" title="Cambiar Contraseña">
                            <KeyRound size={16} />
                          </button>
                        </td>
                      </tr>
                      {isEditingAdminPass && (
                        <tr className={`${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-gray-200'} border-b`}>
                          <td colSpan="3" className="px-4 py-3">
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                              <div className="flex-1 space-y-1 w-full">
                                <label className={`text-[10px] uppercase font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nueva Contraseña</label>
                                <input type="password" value={adminPass.newPass} onChange={e => setAdminPass({ ...adminPass, newPass: e.target.value })} className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-gold-500 ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`} />
                              </div>
                              <div className="flex-1 space-y-1 w-full">
                                <label className={`text-[10px] uppercase font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Confirmar</label>
                                <input type="password" value={adminPass.confirmPass} onChange={e => setAdminPass({ ...adminPass, confirmPass: e.target.value })} className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-gold-500 ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`} />
                              </div>
                              <button type="button" onClick={handleAdminPasswordChange} disabled={!adminPass.newPass || !adminPass.confirmPass} className="px-4 py-2 w-full sm:w-auto rounded-xl text-xs font-bold uppercase bg-gold-gradient text-black disabled:opacity-50 transition-all hover:scale-105 shrink-0">
                                Guardar
                              </button>
                            </div>
                            {passMessage && <p className={`mt-2 text-xs font-semibold ${passMessage.includes('exitosa') ? 'text-emerald-500' : 'text-red-500'}`}>{passMessage}</p>}
                          </td>
                        </tr>
                      )}
                      {businessStaff.map(s => (
                        <React.Fragment key={s.id}>
                          <tr className={`border-b last:border-0 ${isDark ? 'border-dark-border text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                            <td className="px-4 py-3">{s.username}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/10 text-blue-500">{s.role}</span></td>
                            <td className="px-4 py-3 text-center flex items-center justify-center gap-1">
                              <button type="button" onClick={() => {
                                setEditingStaffId(editingStaffId === s.id ? null : s.id)
                                setStaffPass({ newPass: '', confirmPass: '' })
                                setStaffPassMessage('')
                                setEditStaffPermissions(s.permissions || [])
                              }} className="p-1.5 rounded-lg text-gold-500 hover:bg-gold-500/10 transition-colors" title="Editar Cajero">
                                <KeyRound size={16} />
                              </button>
                              <button type="button" onClick={() => handleDeleteStaff(s.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors" title="Eliminar Cajero">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                          {editingStaffId === s.id && (
                            <tr className={`${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-gray-200'} border-b`}>
                              <td colSpan="3" className="px-4 py-3">
                                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                                  <div className="flex-1 space-y-1 w-full">
                                    <label className={`text-[10px] uppercase font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nueva Contraseña ({s.username})</label>
                                    <input type="password" value={staffPass.newPass} onChange={e => setStaffPass({ ...staffPass, newPass: e.target.value })} className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-gold-500 ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`} />
                                  </div>
                                  <div className="flex-1 space-y-1 w-full">
                                    <label className={`text-[10px] uppercase font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Confirmar (Opcional)</label>
                                    <input type="password" value={staffPass.confirmPass} onChange={e => setStaffPass({ ...staffPass, confirmPass: e.target.value })} className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-gold-500 ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`} />
                                  </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                                  <label className={`text-[10px] uppercase font-bold mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Permisos de Acceso al Menú</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {availableModules.map(mod => {
                                      const isChecked = editStaffPermissions.includes(mod.path);
                                      return (
                                        <button
                                          key={mod.path}
                                          type="button"
                                          onClick={() => handleToggleEditPermission(mod.path)}
                                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold transition-all border
                                            ${isChecked 
                                              ? (isDark ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'bg-gold-50 border-gold-300 text-gold-700') 
                                              : (isDark ? 'bg-dark-surface border-dark-border text-gray-500 hover:text-gray-300' : 'bg-white border-light-border text-gray-500 hover:text-gray-700')}`}
                                        >
                                          {isChecked ? <CheckSquare size={12} className="shrink-0" /> : <Square size={12} className="shrink-0" />}
                                          <span>{mod.label}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                  <button type="button" onClick={() => handleStaffUpdate(s.id)} className="px-6 py-2 rounded-xl text-xs font-bold uppercase bg-gold-gradient text-black transition-all hover:scale-105 shrink-0">
                                    Guardar Cambios
                                  </button>
                                </div>
                                {staffPassMessage && <p className={`mt-2 text-xs font-semibold ${staffPassMessage.includes('exitosa') || staffPassMessage.includes('actualizados') ? 'text-emerald-500' : 'text-red-500'}`}>{staffPassMessage}</p>}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest bg-gold-gradient text-black shadow-gold-md hover:scale-105 transition-transform disabled:opacity-50"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
            ) : (
              <Save size={20} />
            )}
            {isSaving ? 'Guardando...' : isSaved ? 'Guardado Exitosamente' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
