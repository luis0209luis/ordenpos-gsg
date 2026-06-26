import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AppContext'

const CashRegisterContext = createContext()

export function CashRegisterProvider({ children }) {
  const { user } = useAuth() || {}
  const bid = user?.businessId

  const [currentRegister, setCurrentRegister] = useState(null)
  const [loadingRegister, setLoadingRegister] = useState(true)

  const loadCurrentRegister = useCallback(async () => {
    if (!bid) { setLoadingRegister(false); return }
    setLoadingRegister(true)
    try {
      const { data } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('business_id', bid)
        .eq('status', 'open')
        .maybeSingle()
      setCurrentRegister(data || null)
    } catch (e) {
      console.error('Error loading cash register:', e)
      setCurrentRegister(null)
    } finally {
      setLoadingRegister(false)
    }
  }, [bid])

  useEffect(() => {
    loadCurrentRegister()
  }, [loadCurrentRegister])

  const openCashRegister = async (openingAmount) => {
    if (!bid) return { success: false, error: 'No business ID' }
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          business_id: bid,
          opened_by: user?.name || user?.username || 'Desconocido',
          opening_amount: Number(openingAmount),
          status: 'open',
          opened_at: new Date().toISOString()
        })
        .select()
        .single()
      if (error) return { success: false, error: error.message }
      setCurrentRegister(data)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const closeCashRegister = async ({ closingPhysical, systemTotal, notes }) => {
    if (!currentRegister) return { success: false, error: 'No hay caja abierta' }
    const difference = Number(closingPhysical) - Number(systemTotal)
    try {
      const { error } = await supabase
        .from('cash_registers')
        .update({
          status: 'closed',
          closed_by: user?.name || user?.username || 'Desconocido',
          closing_amount_system: Number(systemTotal),
          closing_amount_physical: Number(closingPhysical),
          difference,
          notes: notes || null,
          closed_at: new Date().toISOString()
        })
        .eq('id', currentRegister.id)
      if (error) return { success: false, error: error.message }
      setCurrentRegister(null)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const fetchRegisterHistory = async () => {
    if (!bid) return []
    try {
      const { data } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('business_id', bid)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(30)
      return data || []
    } catch (e) {
      return []
    }
  }

  return (
    <CashRegisterContext.Provider value={{
      currentRegister,
      loadingRegister,
      openCashRegister,
      closeCashRegister,
      fetchRegisterHistory,
      reloadRegister: loadCurrentRegister
    }}>
      {children}
    </CashRegisterContext.Provider>
  )
}

export const useCashRegister = () => useContext(CashRegisterContext)
