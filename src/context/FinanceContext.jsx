import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AppContext'
import { isValidUUID } from '../utils/uuid'

const FinanceContext = createContext()

// Maps DB snake_case columns -> camelCase for UI consistency
const normalizeEmployee = (emp) => {
  const rawFreq = emp.payment_frequency || 'Mensual'
  let frequency = rawFreq
  let payDay = 'Lunes'

  if (rawFreq.includes(' - ')) {
    const parts = rawFreq.split(' - ')
    frequency = parts[0]
    payDay = parts[1] || 'Lunes'
  } else if (rawFreq.includes('(')) {
    const match = rawFreq.match(/(.+?)\s*\((.+?)\)/)
    if (match) {
      frequency = match[1].trim()
      payDay = match[2].trim()
    }
  }

  return {
    ...emp,
    baseSalary: Number(emp.salary || 0),
    frequency: frequency,
    payDay: payDay,
    displayFrequency: frequency === 'Semanal' ? `Semanal (${payDay})` : frequency
  }
}

const normalizePayroll = (p) => ({
  ...p,
  id: p.id,
  employeeId: p.employee_id || p.employeeId,
  employeeName: p.employee_name || p.employeeName || 'Empleado',
  totalPaid: Number(p.amount ?? p.totalPaid ?? 0),
  baseSalary: Number(p.base_salary ?? p.baseSalary ?? p.amount ?? 0),
  bonus: Number(p.bonus ?? 0),
  deduction: Number(p.deduction ?? 0),
  observation: p.period || p.observation || '',
  date: p.date || p.created_at || new Date().toISOString()
})

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
    let payrollChannel

    async function loadData() {
      if (!isValidUUID(bid)) {
        if (isMounted) {
          setExpenses([])
          setEmployees([])
          setPayrollHistory([])
          setLoading(false)
        }
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
        if (empRes.data) setEmployees(empRes.data.map(normalizeEmployee))
        if (payRes.data) setPayrollHistory(payRes.data.map(normalizePayroll))

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
              const norm = normalizeEmployee(payload.new)
              setEmployees(prev => prev.find(e => e.id === norm.id) ? prev : [norm, ...prev])
            }
            if (payload.eventType === 'UPDATE') {
              const norm = normalizeEmployee(payload.new)
              setEmployees(prev => prev.map(e => e.id === norm.id ? { ...e, ...norm } : e))
            }
            if (payload.eventType === 'DELETE') {
              setEmployees(prev => prev.filter(e => e.id !== payload.old.id))
            }
          })
          .subscribe()

        payrollChannel = supabase.channel('payroll-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_history', filter: `business_id=eq.${bid}` }, payload => {
            if (!isMounted) return
            if (payload.eventType === 'INSERT') {
              const norm = normalizePayroll(payload.new)
              setPayrollHistory(prev => prev.find(p => p.id === norm.id) ? prev : [norm, ...prev])
            }
            if (payload.eventType === 'UPDATE') {
              const norm = normalizePayroll(payload.new)
              setPayrollHistory(prev => prev.map(p => p.id === norm.id ? { ...p, ...norm } : p))
            }
            if (payload.eventType === 'DELETE') {
              setPayrollHistory(prev => prev.filter(p => p.id !== payload.old.id))
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
      if (payrollChannel) supabase.removeChannel(payrollChannel)
    }
  }, [bid])

  const addExpense = async (expense) => {
    if (!isValidUUID(bid)) return
    try {
      const { data } = await supabase.from('expenses').insert({ ...expense, business_id: bid, date: expense.date || new Date().toISOString() }).select().single()
      if (data) setExpenses(prev => [data, ...prev])
    } catch (e) {
      console.error(e)
    }
  }

  const deleteExpense = async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    if (!isValidUUID(bid)) return
    try {
      await supabase.from('expenses').delete().eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const updateExpense = async (id, updatedData) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e))
    if (!isValidUUID(bid)) return
    try {
      await supabase.from('expenses').update(updatedData).eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const addEmployee = async (employee) => {
    if (!isValidUUID(bid)) return
    try {
      const baseFreq = employee.frequency || 'Mensual'
      const pDay = employee.payDay || 'Lunes'
      const freqValue = baseFreq === 'Semanal' ? `Semanal - ${pDay}` : baseFreq

      const dbRecord = {
        business_id: bid,
        name: employee.name,
        role: employee.role,
        salary: Number(employee.baseSalary || employee.salary || 0),
        payment_frequency: freqValue,
      }
      const { data, error } = await supabase.from('employees').insert(dbRecord).select().single()
      if (error) { console.error('addEmployee error:', error); return }
      if (data) setEmployees(prev => [normalizeEmployee(data), ...prev])
    } catch (e) {
      console.error(e)
    }
  }

  const updateEmployee = async (id, updatedData) => {
    let freqValue = updatedData.frequency
    if (updatedData.frequency === 'Semanal' && updatedData.payDay) {
      freqValue = `Semanal - ${updatedData.payDay}`
    } else if (updatedData.frequency && updatedData.frequency !== 'Semanal') {
      freqValue = updatedData.frequency
    }

    const dbUpdate = {}
    if (updatedData.name !== undefined) dbUpdate.name = updatedData.name
    if (updatedData.role !== undefined) dbUpdate.role = updatedData.role
    if (updatedData.baseSalary !== undefined || updatedData.salary !== undefined) {
      dbUpdate.salary = Number(updatedData.baseSalary ?? updatedData.salary ?? 0)
    }
    if (freqValue !== undefined) dbUpdate.payment_frequency = freqValue

    setEmployees(prev => prev.map(e => {
      if (e.id !== id) return e
      const merged = { ...e, ...updatedData }
      if (freqValue) merged.payment_frequency = freqValue
      return normalizeEmployee(merged)
    }))

    if (!isValidUUID(bid)) return
    try {
      await supabase.from('employees').update(dbUpdate).eq('id', id)
    } catch (e) {
      console.error('updateEmployee error:', e)
    }
  }

  const deleteEmployee = async (id) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
    if (!isValidUUID(bid)) return
    try {
      await supabase.from('employees').delete().eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const addPayrollRecord = async (record) => {
    if (!isValidUUID(bid)) return
    try {
      const dbRecord = {
        business_id: bid,
        employee_id: isValidUUID(record.employeeId) ? record.employeeId : null,
        employee_name: record.employeeName || 'Empleado',
        amount: Number(record.totalPaid || record.amount || 0),
        period: record.observation || record.period || '',
        date: record.date || new Date().toISOString()
      }
      const { data, error } = await supabase.from('payroll_history').insert(dbRecord).select().single()
      if (error) {
        console.error('addPayrollRecord error:', error)
        return
      }
      if (data) setPayrollHistory(prev => [normalizePayroll(data), ...prev])
    } catch (e) {
      console.error('addPayrollRecord exception:', e)
    }
  }

  const updatePayrollRecord = async (id, updatedData) => {
    setPayrollHistory(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p))
    if (!isValidUUID(bid)) return
    try {
      const dbUpdate = {}
      if (updatedData.date) dbUpdate.date = updatedData.date
      if (updatedData.totalPaid !== undefined) dbUpdate.amount = Number(updatedData.totalPaid)
      if (updatedData.observation !== undefined) dbUpdate.period = updatedData.observation
      if (updatedData.employeeName !== undefined) dbUpdate.employee_name = updatedData.employeeName

      await supabase.from('payroll_history').update(dbUpdate).eq('id', id)
    } catch (e) {
      console.error('updatePayrollRecord error:', e)
    }
  }

  const deletePayrollRecord = async (id) => {
    setPayrollHistory(prev => prev.filter(p => p.id !== id))
    if (!isValidUUID(bid)) return
    try {
      await supabase.from('payroll_history').delete().eq('id', id)
    } catch (e) {
      console.error('deletePayrollRecord error:', e)
    }
  }

  return (
    <FinanceContext.Provider value={{
      expenses, addExpense, deleteExpense, updateExpense,
      employees, addEmployee, updateEmployee, deleteEmployee,
      payrollHistory, addPayrollRecord, updatePayrollRecord, deletePayrollRecord, loading
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

export const useFinance = () => useContext(FinanceContext)
