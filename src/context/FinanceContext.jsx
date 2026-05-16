import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AppContext'

const FinanceContext = createContext()

export function FinanceProvider({ children }) {
  const { user } = useAuth()
  const bid = user?.businessId || 'default'

  const [expenses, setExpenses] = useState([])
  const [employees, setEmployees] = useState([])
  const [payrollHistory, setPayrollHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let expensesChannel
    let employeesChannel

    async function loadData() {
      if (bid === 'default' || bid === 'master') {
        if (isMounted) setLoading(false)
        return
      }
      if (isMounted) setLoading(true)
      try {
        const [expRes, empRes, payRes] = await Promise.all([
          supabase.from('expenses').select('*').eq('business_id', bid).order('date', { ascending: false }),
          supabase.from('employees').select('*').eq('business_id', bid),
          supabase.from('payroll_history').select('*').eq('business_id', bid).order('date', { ascending: false })
        ])

        if (!isMounted) return

        if (expRes.data) setExpenses(expRes.data)
        if (empRes.data) setEmployees(empRes.data)
        if (payRes.data) setPayrollHistory(payRes.data)

        expensesChannel = supabase.channel('expenses-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `business_id=eq.${bid}` }, payload => {
            if (!isMounted) return
            if (payload.eventType === 'INSERT') {
              setExpenses(prev => prev.find(e => e.id === payload.new.id) ? prev : [payload.new, ...prev])
            }
            if (payload.eventType === 'UPDATE') {
              setExpenses(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e))
            }
            if (payload.eventType === 'DELETE') {
              setExpenses(prev => prev.filter(e => e.id !== payload.old.id))
            }
          })
          .subscribe()

        employeesChannel = supabase.channel('employees-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `business_id=eq.${bid}` }, payload => {
            if (!isMounted) return
            if (payload.eventType === 'INSERT') {
              setEmployees(prev => prev.find(e => e.id === payload.new.id) ? prev : [payload.new, ...prev])
            }
            if (payload.eventType === 'UPDATE') {
              setEmployees(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e))
            }
            if (payload.eventType === 'DELETE') {
              setEmployees(prev => prev.filter(e => e.id !== payload.old.id))
            }
          })
          .subscribe()

      } catch (e) {
        console.error("Error loading finance data:", e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
      if (expensesChannel) supabase.removeChannel(expensesChannel)
      if (employeesChannel) supabase.removeChannel(employeesChannel)
    }
  }, [bid])

  const addExpense = async (expense) => {
    try {
      const { data } = await supabase.from('expenses').insert({ ...expense, business_id: bid, date: expense.date || new Date().toISOString() }).select().single()
      if (data) setExpenses(prev => [data, ...prev])
    } catch (e) {
      console.error(e)
    }
  }

  const deleteExpense = async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    try {
      await supabase.from('expenses').delete().eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const updateExpense = async (id, updatedData) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e))
    try {
      await supabase.from('expenses').update(updatedData).eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const addEmployee = async (employee) => {
    try {
      const { data } = await supabase.from('employees').insert({ ...employee, business_id: bid }).select().single()
      if (data) setEmployees(prev => [data, ...prev])
    } catch (e) {
      console.error(e)
    }
  }

  const updateEmployee = async (id, updatedData) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e))
    try {
      await supabase.from('employees').update(updatedData).eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const deleteEmployee = async (id) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
    try {
      await supabase.from('employees').delete().eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const addPayrollRecord = async (record) => {
    try {
      const { data } = await supabase.from('payroll_history').insert({ ...record, business_id: bid, date: new Date().toISOString() }).select().single()
      if (data) setPayrollHistory(prev => [data, ...prev])
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <FinanceContext.Provider value={{
      expenses, addExpense, deleteExpense, updateExpense,
      employees, addEmployee, updateEmployee, deleteEmployee,
      payrollHistory, addPayrollRecord, loading
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

export const useFinance = () => useContext(FinanceContext)
