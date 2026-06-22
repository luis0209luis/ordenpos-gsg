import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { isValidUUID } from '../utils/uuid'

/* ── Auth Context ────────────────────────────────────────────── */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ordenpos_user')) }
    catch { return null }
  })

  const verifyBusiness = async (businessNameOrId) => {
    if (businessNameOrId.toLowerCase() === 'smok' || businessNameOrId.toLowerCase() === 'ordenpos') {
      return { success: true, business: { id: 'master', name: 'ORDENPOS Master' } }
    }

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessNameOrId);
      const query = isUUID ? `id.eq.${businessNameOrId},name.ilike.${businessNameOrId}` : `name.ilike.${businessNameOrId}`;

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .or(query)
        .single()

      if (error || !data) return { success: false, error: 'Negocio no encontrado.' }
      
      return { success: true, business: data }
    } catch (e) {
      console.error(e)
      return { success: false, error: 'Error al conectar con el servidor.' }
    }
  }

  const login = async (username, password, businessId) => {
    if (username === 'administrador' && password === '0209adm') {
      if (businessId !== 'master') {
        return { success: false, error: 'Credenciales incorrectas. Verifique usuario y contraseña.' }
      }
      const userData = { username, role: 'Superadmin', loginAt: new Date().toISOString() }
      localStorage.setItem('ordenpos_user', JSON.stringify(userData))
      setUser(userData)
      return { success: true }
    }

    if (username === 'admin') {
      if (!isValidUUID(businessId)) {
        return { success: false, error: 'Credenciales incorrectas. Verifique usuario y contraseña.' }
      }
      try {
        const { data: staffMatch } = await supabase
          .from('staff')
          .select('*')
          .eq('business_id', businessId)
          .eq('username', username)
          .eq('password', password)
          .eq('role', 'admin')
          .single()

        const { data: bizMatch } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .eq('password_hash', password)
          .single()

        const match = staffMatch || bizMatch
        
        if (match) {
          const requiresPasswordChange = password === match.cedula
          const userData = { 
            username: 'admin', 
            businessId: match.id || match.business_id, 
            businessName: bizMatch?.name || match.name, 
            role: 'admin', 
            permissions: ['/dashboard', '/pos', '/deliveries', '/inventory', '/finance', '/reports', '/payments', '/settings', '/kitchen'], 
            loginAt: new Date().toISOString() 
          }
          
          if (!requiresPasswordChange) {
            localStorage.setItem('ordenpos_user', JSON.stringify(userData))
            setUser(userData)
          }
          return { success: true, requiresPasswordChange, tempUser: userData }
        }
      } catch (e) {
        console.error(e)
      }
    }

    if (!isValidUUID(businessId)) {
      return { success: false, error: 'Credenciales incorrectas. Verifique usuario y contraseña.' }
    }

    try {
      const { data: staffMatch, error } = await supabase
        .from('staff')
        .select('*')
        .eq('business_id', businessId)
        .eq('username', username)
        .eq('password', password)
        .single()

      if (staffMatch && !error) {
        const { data: matchBiz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', businessId)
          .single()
        
        const getFallbackPermissions = (role) => {
          switch(role) {
            case 'CAJERO': return ['/pos', '/deliveries', '/inventory'];
            case 'DOMICILIARIO': return ['/deliveries'];
            case 'PREPARADOR': return ['/kitchen'];
            default: return [];
          }
        }

        const userData = { 
          name: staffMatch.name || username, 
          username, 
          businessId: staffMatch.business_id, 
          businessName: matchBiz?.name, 
          role: staffMatch.role, 
          permissions: staffMatch.permissions || getFallbackPermissions(staffMatch.role), 
          loginAt: new Date().toISOString() 
        }
        localStorage.setItem('ordenpos_user', JSON.stringify(userData))
        setUser(userData)
        return { success: true }
      }
    } catch (e) {
      console.error(e)
    }

    return { success: false, error: 'Credenciales incorrectas. Verifique usuario y contraseña.' }
  }

  const changePassword = async (tempUser, newPassword) => {
    if (!isValidUUID(tempUser?.businessId)) return false
    try {
      await supabase
        .from('businesses')
        .update({ password_hash: newPassword })
        .eq('id', tempUser.businessId)

      localStorage.setItem('ordenpos_user', JSON.stringify(tempUser))
      setUser(tempUser)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('ordenpos_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, verifyBusiness }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

/* ── Theme Context ───────────────────────────────────────────── */
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('ordenpos_theme') || 'dark')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('ordenpos_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

/* ── Settings Context ────────────────────────────────────────── */
const SettingsContext = createContext(null)

const defaultSettings = {
  businessName: 'Mi Negocio',
  ownerName: '',
  taxId: '',
  address: '',
  footerMessage: '¡Gracias por su compra!',
  globalMinStock: 10,
  currency: '$',
  deliveryCostPerKm: 1200,
  payrollMonthlyDay: 30,
  payrollBiweeklyDay1: 15,
  payrollBiweeklyDay2: 30,
  categoryOrder: []
}

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const bid = user?.businessId || 'default'

  const [settings, setSettings] = useState(defaultSettings)
  const [feedbacks, setFeedbacks] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!isValidUUID(bid)) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const [settingsRes, feedbacksRes, staffRes] = await Promise.all([
          supabase.from('settings').select('*').eq('business_id', bid).maybeSingle(),
          supabase.from('feedbacks').select('*').eq('business_id', bid).order('created_at', { ascending: false }),
          supabase.from('staff').select('*').eq('business_id', bid)
        ])

        let localCatOrder = []
        try {
          localCatOrder = JSON.parse(localStorage.getItem(`ordenpos_cat_order_${bid}`)) || []
        } catch (e) {}

        if (settingsRes.data) {
          const db = settingsRes.data
          setSettings({
            businessName: db.business_name || defaultSettings.businessName,
            ownerName: db.owner_name || defaultSettings.ownerName,
            taxId: db.tax_id || defaultSettings.taxId,
            address: db.address || defaultSettings.address,
            footerMessage: db.footer_message || defaultSettings.footerMessage,
            globalMinStock: db.global_min_stock !== null && db.global_min_stock !== undefined ? db.global_min_stock : defaultSettings.globalMinStock,
            currency: db.currency || defaultSettings.currency,
            deliveryCostPerKm: db.delivery_cost_per_km !== null && db.delivery_cost_per_km !== undefined ? db.delivery_cost_per_km : defaultSettings.deliveryCostPerKm,
            payrollMonthlyDay: db.payroll_monthly_day || defaultSettings.payrollMonthlyDay,
            payrollBiweeklyDay1: db.payroll_biweekly_day1 || defaultSettings.payrollBiweeklyDay1,
            payrollBiweeklyDay2: db.payroll_biweekly_day2 || defaultSettings.payrollBiweeklyDay2,
            categoryOrder: db.category_order || localCatOrder
          })
        } else {
          setSettings({ ...defaultSettings, businessName: user?.businessName || 'Mi Negocio', categoryOrder: localCatOrder })
        }
        
        if (feedbacksRes.data) setFeedbacks(feedbacksRes.data)
        if (staffRes.data) {
          setStaff(staffRes.data.map(s => ({
            id: s.id,
            businessId: s.business_id,
            name: s.name,
            username: s.username,
            password: s.password,
            role: s.role,
            permissions: s.permissions || [],
            createdAt: s.created_at
          })))
        }
      } catch (e) {
        console.error("Error loading settings data from Supabase:", e)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [bid, user])

  const updateSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings }
    if (isValidUUID(bid)) {
      try {
        const dbPayload = {
          business_id: bid,
          business_name: updated.businessName,
          owner_name: updated.ownerName || null,
          tax_id: updated.taxId || null,
          address: updated.address || null,
          footer_message: updated.footerMessage,
          global_min_stock: updated.globalMinStock,
          currency: updated.currency,
          delivery_cost_per_km: updated.deliveryCostPerKm,
          payroll_monthly_day: updated.payrollMonthlyDay,
          payroll_biweekly_day1: updated.payrollBiweeklyDay1,
          payroll_biweekly_day2: updated.payrollBiweeklyDay2
        }
        const { error } = await supabase.from('settings').upsert(dbPayload, { onConflict: 'business_id' })
        if (error) {
          console.error("Error updating settings in DB:", error)
          return { success: false, error: error.message }
        }
        setSettings(updated)
        return { success: true }
      } catch (e) {
        console.error("Error in updateSettings:", e)
        return { success: false, error: e.message || "Error de red o conexión" }
      }
    }
    return { success: false, error: "ID de negocio no válido" }
  }

  const updateCategoryOrder = async (newOrder) => {
    const updated = { ...settings, categoryOrder: newOrder }
    
    // Save locally immediately
    try {
      localStorage.setItem(`ordenpos_cat_order_${bid}`, JSON.stringify(newOrder))
    } catch (e) {
      console.error("localStorage error:", e)
    }

    if (isValidUUID(bid)) {
      try {
        const { error } = await supabase
          .from('settings')
          .update({ category_order: newOrder })
          .eq('business_id', bid)
        
        if (error) {
          console.warn("Failed to sync category order to database (column might not be ready yet):", error.message)
        }
      } catch (e) {
        console.warn("Error updating category order in Supabase:", e)
      }
    }
    
    setSettings(updated)
    return { success: true }
  }

  const addFeedback = async (text) => {
    if (!isValidUUID(bid)) return
    const newFb = { date: new Date().toISOString(), text, status: 'pending', business_id: bid }
    try {
      const { data } = await supabase.from('feedbacks').insert(newFb).select().single()
      if (data) {
        setFeedbacks(prev => [data, ...prev])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const deleteFeedback = async (id) => {
    setFeedbacks(prev => prev.filter(fb => fb.id !== id))
    try {
      await supabase.from('feedbacks').delete().eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const toggleFeedbackStatus = async (id) => {
    const fb = feedbacks.find(f => f.id === id)
    if (!fb) return
    const newStatus = fb.status === 'pending' ? 'done' : 'pending'
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f))
    try {
      await supabase.from('feedbacks').update({ status: newStatus }).eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const addStaff = async (newStaff) => {
    if (!isValidUUID(bid)) return { success: false, error: "ID de negocio no válido" }
    try {
      const dbPayload = {
        business_id: bid,
        name: newStaff.name,
        username: newStaff.username,
        password: newStaff.password,
        role: newStaff.role,
        permissions: newStaff.permissions || []
      }
      const { data, error } = await supabase.from('staff').insert(dbPayload).select().single()
      if (error) {
        console.error("Error inserting staff:", error)
        let friendlyMsg = error.message
        if (error.code === '23505') {
          friendlyMsg = "El nombre de usuario ya está registrado. Por favor, elige otro."
        }
        return { success: false, error: friendlyMsg }
      }
      if (data) {
        const mapped = {
          id: data.id,
          businessId: data.business_id,
          name: data.name,
          username: data.username,
          password: data.password,
          role: data.role,
          permissions: data.permissions || [],
          createdAt: data.created_at
        }
        setStaff(prev => [...prev, mapped])
        return { success: true, data: mapped }
      }
      return { success: false, error: "No se pudieron obtener los datos insertados" }
    } catch (e) {
      console.error(e)
      return { success: false, error: e.message || "Error al registrar personal" }
    }
  }
  
  const deleteStaff = async (id) => {
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id)
      if (error) {
        console.error("Error deleting staff:", error)
        return { success: false, error: error.message }
      }
      setStaff(prev => prev.filter(s => s.id !== id))
      return { success: true }
    } catch (e) {
      console.error(e)
      return { success: false, error: e.message || "Error de red al eliminar" }
    }
  }
  
  const changeStaffPassword = async (id, newPassword) => {
    try {
      const { error } = await supabase.from('staff').update({ password: newPassword }).eq('id', id)
      if (error) {
        console.error("Error updating staff password:", error)
        return { success: false, error: error.message }
      }
      setStaff(prev => prev.map(s => s.id === id ? { ...s, password: newPassword } : s))
      return { success: true }
    } catch (e) {
      console.error(e)
      return { success: false, error: e.message || "Error de red al cambiar contraseña" }
    }
  }

  const updateStaffInfo = async (id, { name, username }) => {
    try {
      const payload = {}
      if (name !== undefined) payload.name = name
      if (username !== undefined) payload.username = username
      const { error } = await supabase.from('staff').update(payload).eq('id', id)
      if (error) {
        console.error("Error updating staff info:", error)
        let friendlyMsg = error.message
        if (error.code === '23505') friendlyMsg = "El nombre de usuario ya está en uso. Elige otro."
        return { success: false, error: friendlyMsg }
      }
      setStaff(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s))
      return { success: true }
    } catch (e) {
      console.error(e)
      return { success: false, error: e.message || "Error de red al actualizar información" }
    }
  }
  
  const updateStaffPermissions = async (id, permissions) => {
    try {
      const { error } = await supabase.from('staff').update({ permissions }).eq('id', id)
      if (error) {
        console.error("Error updating staff permissions:", error)
        return { success: false, error: error.message }
      }
      setStaff(prev => prev.map(s => s.id === id ? { ...s, permissions } : s))
      return { success: true }
    } catch (e) {
      console.error(e)
      return { success: false, error: e.message || "Error de red al actualizar permisos" }
    }
  }

  const isConfigured = !!(
    settings?.ownerName &&
    settings?.ownerName.trim() !== '' &&
    settings?.address &&
    settings?.address.trim() !== ''
  )

  return (
    <SettingsContext.Provider value={{ 
      settings, updateSettings, updateCategoryOrder, feedbacks, addFeedback, deleteFeedback, 
      toggleFeedbackStatus, staff, addStaff, deleteStaff, changeStaffPassword, 
      updateStaffInfo, updateStaffPermissions, loading, isConfigured
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
