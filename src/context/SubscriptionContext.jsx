import { createContext, useContext, useState, useEffect } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { isValidUUID } from '../utils/uuid'
import { useAuth } from './AppContext'

const SubscriptionContext = createContext()

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const bid = user?.businessId || 'default'
  const isMaster = bid === 'master'

  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false)
        return
      }
      if (!isMaster && !isValidUUID(bid)) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        let query = supabase.from('businesses').select('*')
        if (!isMaster) {
          query = query.eq('id', bid)
        }
        
        const { data, error } = await query
        if (error) console.error("Error businesses:", error.message)
        if (data) {
          const normalized = data.map(b => ({
            ...b,
            startDate:     b.start_date     ?? b.startDate     ?? null,
            daysRemaining: b.days_remaining ?? b.daysRemaining ?? 0,
            forcePhase:    b.force_phase    ?? b.forcePhase    ?? null,
          }))
          setBusinesses(normalized)
          setForcedState(null)
          
          if (!isMaster) {
            const biz = normalized.find(b => b.id === bid)
            const fVencimiento = computeExpirationDate(biz)
            const dRestantes = differenceInDays(parseISO(fVencimiento), new Date())
            console.log(`Cargando suscripción fresca para ${biz?.name || bid}: ${dRestantes} días (desde DB)`)
          }
        }
      } catch (e) {
        console.error("Error loading subscription data:", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [bid, user, isMaster])

  const myBiz = businesses.find(b => b.id === bid)

  const computeExpirationDate = (biz) => {
    if (!biz || !biz.startDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 2); // Default active
      return defaultDate.toISOString();
    }
    // The true expiration date is the start_date plus the total accumulated days_remaining
    const expiration = new Date(biz.startDate);
    const storedDays = biz.daysRemaining || biz.days_remaining || 0;
    expiration.setDate(expiration.getDate() + storedDays);
    return expiration.toISOString();
  }

  const fechaVencimiento = computeExpirationDate(myBiz)
  const [now, setNow] = useState(new Date())
  const [forcedState, setForcedState] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const daysRemaining = differenceInDays(parseISO(fechaVencimiento), now)

  let phase = 0
  const isAdminForcedPhase3 = myBiz?.forcePhase === 3

  if (isAdminForcedPhase3 || forcedState === 'fase3') {
    phase = 3
  } else if (forcedState === 'fase1') {
    phase = 1
  } else {
    // Fase 0: 4+ días restantes (todo normal)
    // Fase 1: 3 a -2 días (banner de advertencia)
    // Fase 2: -3 a -5 días (modal cada 7 min)
    // Fase 3: -6 o más días vencidos (bloqueo total)
    if (daysRemaining <= -6) {
      phase = 3
    } else if (daysRemaining <= -3) {
      phase = 2
    } else if (daysRemaining <= 3) {
      phase = 1
    } else {
      phase = 0
    }
  }

  const forceBlock = async () => {
    setForcedState('fase3')
    if (!isMaster && isValidUUID(bid)) {
      await supabase.from('businesses').update({ force_phase: 3 }).eq('id', bid)
    }
  }

  const forceUnblock = async () => {
    setForcedState('fase1')
    if (!isMaster && isValidUUID(bid)) {
      await supabase.from('businesses').update({ force_phase: null }).eq('id', bid)
    }
  }
  
  const addMonth = async (days = 30) => {
    setForcedState(null)
    const currentDays = myBiz?.daysRemaining || myBiz?.days_remaining || 0
    const newDays = currentDays + days
    setBusinesses(prev => prev.map(b => b.id === bid ? { ...b, daysRemaining: newDays, days_remaining: newDays } : b))
    
    if (!isMaster && isValidUUID(bid)) {
      try {
        await supabase.from('businesses').update({ days_remaining: newDays }).eq('id', bid)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const removeMonth = async () => {
    setForcedState(null)
    const currentDays = myBiz?.daysRemaining || myBiz?.days_remaining || 0
    const newDays = Math.max(0, currentDays - 30)
    setBusinesses(prev => prev.map(b => b.id === bid ? { ...b, daysRemaining: newDays, days_remaining: newDays } : b))
    
    if (!isMaster && isValidUUID(bid)) {
      try {
        await supabase.from('businesses').update({ days_remaining: newDays }).eq('id', bid)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const simulateDateChange = async (daysOffset) => {
    setForcedState(null)
    const currentDays = myBiz?.daysRemaining || myBiz?.days_remaining || 0
    const newDays = currentDays + daysOffset
    setBusinesses(prev => prev.map(b => b.id === bid ? { ...b, daysRemaining: newDays, days_remaining: newDays } : b))
    
    if (!isMaster && isValidUUID(bid)) {
      try {
        await supabase.from('businesses').update({ days_remaining: newDays }).eq('id', bid)
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <SubscriptionContext.Provider value={{ 
      fechaVencimiento, 
      daysRemaining, 
      phase, 
      simulateDateChange,
      forceBlock,
      forceUnblock,
      addMonth,
      removeMonth,
      loading
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
