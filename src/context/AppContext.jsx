import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/* ── Auth Context ────────────────────────────────────────────── */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ordenpos_user')) }
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
      sessionStorage.setItem('ordenpos_user', JSON.stringify(userData))
      setUser(userData)
      return { success: true }
    }

    if (username === 'admin') {
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
            sessionStorage.setItem('ordenpos_user', JSON.stringify(userData))
            setUser(userData)
          }
          return { success: true, requiresPasswordChange, tempUser: userData }
        }
      } catch (e) {
        console.error(e)
      }
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
        sessionStorage.setItem('ordenpos_user', JSON.stringify(userData))
        setUser(userData)
        return { success: true }
      }
    } catch (e) {
      console.error(e)
    }

    return { success: false, error: 'Credenciales incorrectas. Verifique usuario y contraseña.' }
  }

  const changePassword = async (tempUser, newPassword) => {
    try {
      await supabase
        .from('businesses')
        .update({ password_hash: newPassword })
        .eq('id', tempUser.businessId)

      sessionStorage.setItem('ordenpos_user', JSON.stringify(tempUser))
      setUser(tempUser)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const logout = () => {
    sessionStorage.removeItem('ordenpos_user')
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
  payrollBiweeklyDay2: 30
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
      if (bid === 'default' || bid === 'master') {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const [settingsRes, feedbacksRes, staffRes] = await Promise.all([
          supabase.from('settings').select('*').eq('business_id', bid).single(),
          supabase.from('feedbacks').select('*').eq('business_id', bid).order('created_at', { ascending: false }),
          supabase.from('staff').select('*').eq('business_id', bid)
        ])

        if (settingsRes.data) {
          setSettings({ ...defaultSettings, ...settingsRes.data })
        } else {
          setSettings({ ...defaultSettings, businessName: user?.businessName || 'Mi Negocio' })
        }
        
        if (feedbacksRes.data) setFeedbacks(feedbacksRes.data)
        if (staffRes.data) setStaff(staffRes.data)
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
    setSettings(updated)
    if (bid !== 'default' && bid !== 'master') {
      try {
        await supabase.from('settings').upsert({ business_id: bid, ...updated })
      } catch (e) {
        console.error(e)
      }
    }
  }

  const addFeedback = async (text) => {
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
    try {
      const { data } = await supabase.from('staff').insert({ ...newStaff, business_id: bid }).select().single()
      if (data) setStaff(prev => [...prev, data])
    } catch (e) {
      console.error(e)
    }
  }
  
  const deleteStaff = async (id) => {
    setStaff(prev => prev.filter(s => s.id !== id))
    try {
      await supabase.from('staff').delete().eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }
  
  const changeStaffPassword = async (id, newPassword) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, password: newPassword } : s))
    try {
      await supabase.from('staff').update({ password: newPassword }).eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }
  
  const updateStaffPermissions = async (id, permissions) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, permissions } : s))
    try {
      await supabase.from('staff').update({ permissions }).eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <SettingsContext.Provider value={{ 
      settings, updateSettings, feedbacks, addFeedback, deleteFeedback, 
      toggleFeedbackStatus, staff, addStaff, deleteStaff, changeStaffPassword, 
      updateStaffPermissions, loading 
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
