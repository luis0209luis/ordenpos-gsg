import { useState, useEffect } from 'react'
import { format, parseISO, addDays, addWeeks, addMonths, isToday, isThisWeek, isThisMonth, isThisYear, subWeeks, isSameWeek, startOfWeek, endOfWeek } from 'date-fns'
import * as XLSX from 'xlsx'
import { useFinance } from '../context/FinanceContext'
import { useInventory } from '../context/InventoryContext'
import { useTheme, useAuth, useDeleteConfirmation } from '../context/AppContext'
import { useCashRegister } from '../context/CashRegisterContext'
import { DollarSign, TrendingUp, TrendingDown, Users, Download, Plus, FileText, Briefcase, Calendar, CheckCircle2, Trash2, X, Edit, Archive, Gift, CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

export default function FinanceManager() {
  const { theme } = useTheme()
  const { user } = useAuth() || {}
  const { confirmDelete } = useDeleteConfirmation()
  const isDark = theme === 'dark'
  
  const { 
    expenses = [], 
    addExpense, 
    updateExpense, 
    deleteExpense, 
    employees = [], 
    addEmployee, 
    payrollHistory = [], 
    addPayrollRecord,
    updatePayrollRecord,
    deletePayrollRecord, 
    deleteEmployee 
  } = useFinance() || {}
  const { salesHistory } = useInventory()

  const [activeTab, setActiveTab] = useState('resumen') // resumen, egresos, nomina, caja

  // Cash Register History
  const { fetchRegisterHistory, currentRegister, deleteRegister } = useCashRegister() || {}
  const [registerHistory, setRegisterHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [cajaTimeFilter, setCajaTimeFilter] = useState('Mes')
  const [confirmRegisterDeleteId, setConfirmRegisterDeleteId] = useState(null)

  const handleDeleteRegister = async (id) => {
    if (!deleteRegister) return
    const res = await deleteRegister(id)
    if (res.success) {
      setRegisterHistory(prev => prev.filter(r => r.id !== id))
    } else {
      alert('Error al eliminar registro de caja: ' + res.error)
    }
  }

  useEffect(() => {
    if (activeTab === 'caja' && fetchRegisterHistory) {
      setLoadingHistory(true)
      fetchRegisterHistory().then(data => {
        setRegisterHistory(data || [])
        setLoadingHistory(false)
      })
    }
  }, [activeTab, fetchRegisterHistory, currentRegister])
  
  // Expense Form State
  const [expenseDesc, setExpenseDesc] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('Arriendo')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [editingExpenseId, setEditingExpenseId] = useState(null)

  // Employee Form State
  const [empName, setEmpName] = useState('')
  const [empRole, setEmpRole] = useState('')
  const [empFreq, setEmpFreq] = useState('Semanal')
  const [empPayDay, setEmpPayDay] = useState('Lunes')
  const [empSalary, setEmpSalary] = useState('')

  // Ficha del Empleado State
  const [selectedEmpDetails, setSelectedEmpDetails] = useState(null)
  const [editEmpName, setEditEmpName] = useState('')
  const [editEmpRole, setEditEmpRole] = useState('')
  const [editEmpFreq, setEditEmpFreq] = useState('Semanal')
  const [editEmpPayDay, setEditEmpPayDay] = useState('Lunes')
  const [editEmpSalary, setEditEmpSalary] = useState('')

  // Payroll Payment State
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [payrollDate, setPayrollDate] = useState(new Date().toISOString().split('T')[0])
  const [customBaseSalary, setCustomBaseSalary] = useState(0)
  const [useDailyCalc, setUseDailyCalc] = useState(false)
  const [daysWorked, setDaysWorked] = useState(1)
  const [dailyRate, setDailyRate] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [bonusReason, setBonusReason] = useState('')
  const [deduction, setDeduction] = useState(0)
  const [deductionReason, setDeductionReason] = useState('')
  const [observation, setObservation] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmExpenseDeleteId, setConfirmExpenseDeleteId] = useState(null)
  const [confirmPayrollDeleteId, setConfirmPayrollDeleteId] = useState(null)
  
  // Payroll Date Edit Modal State
  const [editingPayrollRecord, setEditingPayrollRecord] = useState(null)
  const [editPayrollDateValue, setEditPayrollDateValue] = useState('')

  // Payroll Export Modal State
  const [showPayrollExport, setShowPayrollExport] = useState(false)
  const [exportType, setExportType] = useState('Mensual')
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1)
  const [exportYear, setExportYear] = useState(new Date().getFullYear())

  // Filter by period
  const [timeFilter, setTimeFilter] = useState('Todo')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = esta semana, -1 = semana anterior, -2 = hace 2 semanas...

  const filteredSales = (salesHistory || []).filter(sale => {
    if (timeFilter === 'Todo') return true
    const date = parseISO(sale?.date || new Date().toISOString())
    if (timeFilter === 'Hoy') return isToday(date)
    if (timeFilter === 'Semana') {
      const targetWeekDate = addWeeks(new Date(), weekOffset)
      return isSameWeek(date, targetWeekDate, { weekStartsOn: 1 })
    }
    if (timeFilter === 'Mes') return isThisMonth(date)
    if (timeFilter === 'Año') return isThisYear(date)
    return true
  })

  const filteredExpenses = (expenses || []).filter(exp => {
    if (timeFilter === 'Todo') return true
    const date = parseISO(exp?.date || new Date().toISOString())
    if (timeFilter === 'Hoy') return isToday(date)
    if (timeFilter === 'Semana') {
      const targetWeekDate = addWeeks(new Date(), weekOffset)
      return isSameWeek(date, targetWeekDate, { weekStartsOn: 1 })
    }
    if (timeFilter === 'Mes') return isThisMonth(date)
    if (timeFilter === 'Año') return isThisYear(date)
    return true
  })

  const filteredPayroll = (payrollHistory || []).filter(p => {
    if (timeFilter === 'Todo') return true
    const date = parseISO(p?.date || new Date().toISOString())
    if (timeFilter === 'Hoy') return isToday(date)
    if (timeFilter === 'Semana') {
      const targetWeekDate = addWeeks(new Date(), weekOffset)
      return isSameWeek(date, targetWeekDate, { weekStartsOn: 1 })
    }
    if (timeFilter === 'Mes') return isThisMonth(date)
    if (timeFilter === 'Año') return isThisYear(date)
    return true
  })

  // Calcs
  const totalSales = filteredSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0)
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  const totalPayroll = filteredPayroll.reduce((sum, p) => sum + (Number(p.totalPaid) || 0), 0)
  const netProfit = totalSales - totalExpenses - totalPayroll

  const totalGiftsVal = filteredSales
    .filter(s => s.paymentMethod === 'Regalo' || s.paymentMethod === 'Gratis')
    .reduce((acc, s) => {
      const itemsVal = (s.items || []).reduce((sum, i) => sum + ((i.precio || 0) * (i.quantity || 0)), 0)
      return acc + itemsVal
    }, 0)

  const handleAddExpense = (e) => {
    e.preventDefault()
    if (!expenseDesc || !expenseAmount) return
    
    if (editingExpenseId) {
      updateExpense(editingExpenseId, {
        description: expenseDesc,
        amount: Number(expenseAmount),
        category: expenseCategory,
        date: new Date(expenseDate).toISOString()
      })
      setEditingExpenseId(null)
    } else {
      addExpense({
        description: expenseDesc,
        amount: Number(expenseAmount),
        category: expenseCategory,
        date: new Date(expenseDate).toISOString()
      })
    }
    
    setExpenseDesc('')
    setExpenseAmount('')
  }

  const handleEditExpense = (exp) => {
    setExpenseDesc(exp.description)
    setExpenseAmount(exp.amount)
    setExpenseCategory(exp.category)
    setExpenseDate(exp.date.split('T')[0])
    setEditingExpenseId(exp.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditExpense = () => {
    setExpenseDesc('')
    setExpenseAmount('')
    setExpenseCategory('Arriendo')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setEditingExpenseId(null)
  }

  const handleAddEmployee = (e) => {
    e.preventDefault()
    if (!empName || !empRole || !empSalary) return
    addEmployee({
      name: empName,
      role: empRole,
      frequency: empFreq,
      payDay: empPayDay,
      baseSalary: Number(empSalary),
      startDate: new Date().toISOString()
    })
    setEmpName('')
    setEmpRole('')
    setEmpSalary('')
  }

  const openEmployeeDetails = (emp) => {
    setSelectedEmpDetails(emp)
    setEditEmpName(emp.name || '')
    setEditEmpRole(emp.role || '')
    setEditEmpFreq(emp.frequency || 'Semanal')
    setEditEmpPayDay(emp.payDay || 'Lunes')
    setEditEmpSalary(emp.baseSalary || '')
  }

  const handleSaveEmployeeDetails = (e) => {
    e.preventDefault()
    if (!selectedEmpDetails) return
    updateEmployee(selectedEmpDetails.id, {
      name: editEmpName,
      role: editEmpRole,
      frequency: editEmpFreq,
      payDay: editEmpPayDay,
      baseSalary: Number(editEmpSalary)
    })
    setSelectedEmpDetails(null)
  }

  const openLiquidationModal = (emp) => {
    setSelectedEmp(emp)
    setPayrollDate(new Date().toISOString().split('T')[0])
    const base = Number(emp.baseSalary) || 0
    setCustomBaseSalary(base)
    setDaysWorked(1)
    setDailyRate(base)
    setUseDailyCalc(emp.frequency === 'Diario')
    setBonus(0)
    setBonusReason('')
    setDeduction(0)
    setDeductionReason('')
    setObservation('')
  }

  const handlePayPayroll = (e) => {
    e.preventDefault()
    if (!selectedEmp) return

    const effectiveBaseSalary = useDailyCalc 
      ? (Number(daysWorked || 0) * Number(dailyRate || 0))
      : Number(customBaseSalary || 0)

    const totalPaid = Math.max(0, effectiveBaseSalary + Number(bonus || 0) - Number(deduction || 0))

    const notesParts = []
    if (useDailyCalc && daysWorked) {
      notesParts.push(`${daysWorked} día(s) laborado(s) x $${Number(dailyRate || 0).toLocaleString('es-CO')}`)
    }
    if (Number(bonus) > 0) {
      notesParts.push(`Bono: +$${Number(bonus).toLocaleString('es-CO')}${bonusReason ? ` (${bonusReason})` : ''}`)
    }
    if (Number(deduction) > 0) {
      notesParts.push(`Desc: -$${Number(deduction).toLocaleString('es-CO')}${deductionReason ? ` (${deductionReason})` : ''}`)
    }
    if (observation.trim()) {
      notesParts.push(observation.trim())
    }
    const finalObservation = notesParts.join(' | ')

    const payDateISO = payrollDate ? new Date(payrollDate + 'T12:00:00').toISOString() : new Date().toISOString()

    addPayrollRecord({
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      baseSalary: effectiveBaseSalary,
      bonus: Number(bonus),
      deduction: Number(deduction),
      totalPaid,
      observation: finalObservation,
      date: payDateISO
    })
    
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setSelectedEmp(null)
      setBonus(0)
      setBonusReason('')
      setDeduction(0)
      setDeductionReason('')
      setObservation('')
    }, 1500)
  }

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()

    // 1. Resumen Tab
    const wsResumen = XLSX.utils.aoa_to_sheet([
      [`Reporte Financiero (${timeFilter})`],
      [''],
      ['Concepto', 'Monto'],
      ['Total Ingresos Reales (Ventas POS)', totalSales],
      ['Total Egresos (Gastos Operativos)', totalExpenses],
      ['Total Nómina (Pagos Empleados)', totalPayroll],
      ['Utilidad Neta', netProfit],
      ['Valor Mercancía Regalada / Cortesías', totalGiftsVal]
    ])
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    // 2. Movimientos Tab (Ingresos + Egresos)
    const ingresosData = filteredSales.map(s => ({
      Fecha: format(parseISO(s.date), 'yyyy-MM-dd HH:mm'),
      Tipo: 'Ingreso (Venta)',
      Categoria: 'POS',
      MetodoPago: s.paymentMethod || 'Efectivo',
      Descripcion: `Venta #${String(s?.id || '').slice(-5)}`,
      Monto: s.total
    }))
    const egresosData = filteredExpenses.map(e => ({
      Fecha: format(parseISO(e.date), 'yyyy-MM-dd'),
      Tipo: 'Egreso (Gasto)',
      Categoria: e.category,
      MetodoPago: '—',
      Descripcion: e.description,
      Monto: -Number(e.amount)
    }))
    const movimientos = [...ingresosData, ...egresosData].sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha))
    const wsMovimientos = XLSX.utils.json_to_sheet(movimientos)
    XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos')

    // 3. Nómina Tab
    const nominaData = filteredPayroll.map(p => ({
      FechaPago: format(parseISO(p.date), 'yyyy-MM-dd HH:mm'),
      Empleado: p.employeeName,
      SalarioBase: p.baseSalary,
      Bonos: p.bonus,
      Deducciones: p.deduction,
      TotalPagado: p.totalPaid
    }))
    const wsNomina = XLSX.utils.json_to_sheet(nominaData)
    XLSX.utils.book_append_sheet(wb, wsNomina, 'Nómina')

    XLSX.writeFile(wb, `Reporte_Financiero_${timeFilter}_${format(new Date(), 'yyyyMMdd')}.xlsx`)
  }

  const exportPayrollToExcel = () => {
    const filtered = (payrollHistory || []).filter(p => {
      const pDate = new Date(p.date)
      if (exportType === 'Mensual') {
        return pDate.getFullYear() === Number(exportYear) && (pDate.getMonth() + 1) === Number(exportMonth)
      } else {
        return pDate.getFullYear() === Number(exportYear)
      }
    })

    if (filtered.length === 0) {
      alert('No hay registros de pago en el periodo seleccionado.')
      return
    }

    const data = filtered.map(p => ({
      Fecha: format(parseISO(p.date), 'dd/MM/yyyy HH:mm'),
      Empleado: p.employeeName,
      'Salario Base': p.baseSalary,
      Bonos: p.bonus,
      Deducciones: p.deduction,
      'Total Pagado': p.totalPaid
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    // Set column widths for a better designed Excel
    ws['!cols'] = [
      { wch: 18 }, // Fecha
      { wch: 25 }, // Empleado
      { wch: 15 }, // Salario Base
      { wch: 12 }, // Bonos
      { wch: 12 }, // Deducciones
      { wch: 15 }, // Total
    ]

    const monthName = new Date(exportYear, exportMonth - 1).toLocaleString('es', { month: 'long' })
    const title = exportType === 'Mensual' ? `Nomina_${monthName}_${exportYear}` : `Nomina_Anual_${exportYear}`

    XLSX.utils.book_append_sheet(wb, ws, 'Historial')
    XLSX.writeFile(wb, `${title}.xlsx`)
    setShowPayrollExport(false)
  }

  // Calculate next payment date
  const getNextPaymentDate = (emp) => {
    try {
      const lastPayment = (payrollHistory || []).find(p => p.employeeId === emp.id)
      const startDateStr = emp.startDate || emp.created_at || new Date().toISOString()
      const baseDate = lastPayment ? parseISO(lastPayment.date) : parseISO(startDateStr)
      const freqStr = emp.displayFrequency || emp.frequency || emp.payment_frequency || 'Mensual'

      if (freqStr.includes('Diario')) {
        return format(addDays(baseDate, 1), 'dd/MM/yyyy')
      }
      if (freqStr.includes('Quincenal')) {
        return format(addDays(baseDate, 15), 'dd/MM/yyyy')
      }
      if (freqStr.includes('Mensual')) {
        return format(addMonths(baseDate, 1), 'dd/MM/yyyy')
      }

      // Semanal: Calculate target day of week (Lunes, Martes, Miércoles, etc.)
      const dayMap = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 }
      let targetDayName = emp.payDay || 'Lunes'
      for (const d of Object.keys(dayMap)) {
        if (freqStr.includes(d)) targetDayName = d
      }
      const targetDayIndex = dayMap[targetDayName] ?? 1

      const currentDayIndex = baseDate.getDay() // 0 = Sun, 1 = Mon, ...
      let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7
      if (daysToAdd === 0) daysToAdd = 7

      const nextDate = addDays(baseDate, daysToAdd)
      return format(nextDate, 'dd/MM/yyyy')
    } catch {
      return '—'
    }
  }

  return (
    <div className={`h-full overflow-y-auto p-4 lg:p-8 ${isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-gray-900'}`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight flex items-center gap-3">
            <DollarSign className="text-gold-500" size={32} />
            Finanzas y Nómina
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Control integral de caja, egresos y talento humano.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center gap-1 p-1 rounded-xl border
            ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
            {[
              { id: 'Hoy', label: 'Diario' },
              { id: 'Semana', label: 'Semanal' },
              { id: 'Mes', label: 'Mensual' },
              { id: 'Año', label: 'Anual' },
              { id: 'Todo', label: 'Todo' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => {
                  setTimeFilter(filter.id)
                  if (filter.id === 'Semana') {
                    setWeekOffset(0)
                  }
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${timeFilter === filter.id
                    ? 'bg-gold-gradient text-dark-bg shadow-gold-sm font-bold'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold tracking-wide hover:bg-emerald-500 transition-colors shadow-lg">
            <Download size={20} />
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500"><TrendingUp size={20} /></div>
            <h3 className="font-semibold text-sm">Ingresos (Ventas)</h3>
          </div>
          <p className="text-2xl font-bold font-display text-green-500">${totalSales.toLocaleString('es-CO')}</p>
        </div>
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500"><TrendingDown size={20} /></div>
            <h3 className="font-semibold text-sm">Egresos Operativos</h3>
          </div>
          <p className="text-2xl font-bold font-display text-red-500">${totalExpenses.toLocaleString('es-CO')}</p>
        </div>
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Users size={20} /></div>
            <h3 className="font-semibold text-sm">Pago Nómina</h3>
          </div>
          <p className="text-2xl font-bold font-display text-blue-500">${totalPayroll.toLocaleString('es-CO')}</p>
        </div>
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-purple-500/30' : 'bg-white border-purple-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><Gift size={20} /></div>
            <h3 className="font-semibold text-sm">Valor Regalado</h3>
          </div>
          <p className="text-2xl font-bold font-display text-purple-400">${totalGiftsVal.toLocaleString('es-CO')}</p>
        </div>
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-gold-500/50' : 'bg-white border-gold-500'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gold-500/20 text-gold-500"><DollarSign size={20} /></div>
            <h3 className="font-semibold text-sm">Utilidad Neta</h3>
          </div>
          <p className={`text-2xl font-bold font-display ${netProfit >= 0 ? 'text-gold-500' : 'text-red-500'}`}>
            ${netProfit.toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      {/* Tabs & Period Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-500/30 pb-2">
        <div className="flex gap-2 overflow-x-auto">
          {['resumen', 'egresos', 'nomina', 'caja'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg font-bold capitalize transition-colors whitespace-nowrap
                ${activeTab === tab 
                  ? (isDark ? 'bg-dark-card text-gold-400 border-t-2 border-gold-500' : 'bg-white text-gold-600 border-t-2 border-gold-500')
                  : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}
            >
              {tab === 'resumen' ? 'Resumen General' : tab === 'egresos' ? 'Gastos / Egresos' : tab === 'nomina' ? 'Nómina & RH' : '🗃️ Historial de Caja'}
            </button>
          ))}
        </div>

        {/* Selector de Semana reubicado aquí de manera estratégica cuando timeFilter === 'Semana' */}
        {timeFilter === 'Semana' && (
          <div className="relative pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setShowWeekDropdown(prev => !prev)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                isDark
                  ? 'bg-dark-card border-gold-500/40 text-gold-400 hover:border-gold-400'
                  : 'bg-white border-gold-500/50 text-gold-700 hover:border-gold-500'
              }`}
            >
              <Calendar size={14} className="text-gold-500" />
              <span>
                {weekOffset === 0
                  ? 'Esta Semana'
                  : weekOffset === -1
                  ? 'Semana Anterior'
                  : `Hace ${Math.abs(weekOffset)} Semanas`}
              </span>
              <span className="text-[11px] font-normal opacity-85">
                ({format(startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), 'dd/MM')} - {format(endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), 'dd/MM')})
              </span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showWeekDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Popover Card */}
            {showWeekDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowWeekDropdown(false)} />
                <div className={`absolute right-0 mt-2 w-72 rounded-2xl border p-3 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150 ${
                  isDark ? 'bg-dark-card/95 backdrop-blur-md border-dark-border text-white' : 'bg-white/95 backdrop-blur-md border-light-border text-gray-900'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-500/20 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span>Seleccionar Semana</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setWeekOffset(prev => prev - 1)}
                        className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                        title="Semana anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setWeekOffset(prev => Math.min(0, prev + 1))}
                        disabled={weekOffset >= 0}
                        className={`p-1 rounded-lg transition-colors ${weekOffset >= 0 ? 'opacity-30 cursor-not-allowed' : isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                        title="Semana siguiente"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {[
                      { offset: 0, label: 'Esta Semana' },
                      { offset: -1, label: 'Semana Anterior' },
                      { offset: -2, label: 'Hace 2 Semanas' },
                      { offset: -3, label: 'Hace 3 Semanas' },
                      { offset: -4, label: 'Hace 4 Semanas' },
                    ].map((item) => {
                      const start = format(startOfWeek(addWeeks(new Date(), item.offset), { weekStartsOn: 1 }), 'dd/MM')
                      const end = format(endOfWeek(addWeeks(new Date(), item.offset), { weekStartsOn: 1 }), 'dd/MM/yyyy')
                      const isSelected = weekOffset === item.offset
                      return (
                        <button
                          key={item.offset}
                          type="button"
                          onClick={() => {
                            setWeekOffset(item.offset)
                            setShowWeekDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-gold-500/20 text-gold-500 font-bold border border-gold-500/30'
                              : isDark
                              ? 'hover:bg-white/5 text-gray-300'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="text-[11px] opacity-70">{start} - {end}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tab Content: Resumen */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={18} className="text-gold-500"/> Últimos Movimientos</h3>
            <div className="space-y-3">
              {filteredSales.slice(-5).map(sale => (
                <div key={sale.id} className="flex justify-between items-center p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div>
                    <p className="font-semibold text-sm text-green-500">Ingreso POS</p>
                    <p className="text-xs text-gray-500">{format(parseISO(sale.date || new Date().toISOString()), 'dd/MM/yy HH:mm')}</p>
                  </div>
                  <p className="font-bold text-green-500">+${sale.total.toLocaleString()}</p>
                </div>
              ))}
              {filteredExpenses.slice(0, 5).map(exp => (
                <div key={exp.id} className="flex justify-between items-center p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div>
                    <p className="font-semibold text-sm text-red-500">{exp.category} - {exp.description}</p>
                    <p className="text-xs text-gray-500">{format(parseISO(exp.date || new Date().toISOString()), 'dd/MM/yy')}</p>
                  </div>
                  <p className="font-bold text-red-500">-${Number(exp.amount).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingDown size={18} className="text-red-500"/> Distribución de Egresos</h3>
            <div className="space-y-4">
              {['Arriendo', 'Servicios', 'Insumos', 'Nómina', 'Otros'].map(cat => {
                let catTotal = 0;
                if (cat === 'Nómina') catTotal = totalPayroll;
                else catTotal = filteredExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + Number(e.amount), 0);
                
                const allExp = totalExpenses + totalPayroll;
                const percent = allExp === 0 ? 0 : Math.round((catTotal / allExp) * 100);

                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{cat}</span>
                      <span className="font-bold">${catTotal.toLocaleString()} ({percent}%)</span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <div className="h-full bg-gold-gradient rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Egresos */}
      {activeTab === 'egresos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`p-6 rounded-2xl border lg:col-span-1 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {editingExpenseId ? <Edit size={18}/> : <Plus size={18}/>} 
                {editingExpenseId ? 'Editar Gasto' : 'Registrar Gasto'}
              </h3>
              {editingExpenseId && (
                <button onClick={cancelEditExpense} className="text-gray-500 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Descripción</label>
                <input type="text" value={expenseDesc} onChange={e=>setExpenseDesc(e.target.value)} required
                  className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Monto ($)</label>
                <input type="number" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} required min="0"
                  className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Categoría</label>
                <select value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)}
                  className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`}>
                  <option>Arriendo</option>
                  <option>Servicios</option>
                  <option>Insumos</option>
                  <option>Otros</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Fecha</label>
                <input type="date" value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} required
                  className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`} />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-gold-gradient text-black font-bold uppercase tracking-wider hover:scale-[1.02] transition-transform">
                {editingExpenseId ? 'Actualizar Gasto' : 'Guardar Gasto'}
              </button>
            </form>
          </div>

          <div className={`p-6 rounded-2xl border lg:col-span-2 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
             <h3 className="text-lg font-bold mb-4">Historial de Egresos</h3>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className={`border-b ${isDark ? 'border-dark-border text-gray-400' : 'border-gray-200 text-gray-500'} text-sm`}>
                     <th className="pb-3 font-semibold">Fecha</th>
                     <th className="pb-3 font-semibold">Descripción</th>
                     <th className="pb-3 font-semibold">Categoría</th>
                     <th className="pb-3 font-semibold">Monto</th>
                     <th className="pb-3 font-semibold text-right">Acciones</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredExpenses.map(exp => (
                     <tr key={exp.id} className={`border-b ${isDark ? 'border-dark-border/50' : 'border-gray-100'} text-sm hover:${isDark ? 'bg-white/5' : 'bg-black/5'} transition-colors`}>
                       <td className="py-3">{format(parseISO(exp.date || new Date().toISOString()), 'dd/MM/yyyy')}</td>
                       <td className="py-3 font-medium">{exp.description}</td>
                       <td className="py-3"><span className="px-2 py-1 bg-gray-500/10 rounded-md text-xs">{exp.category}</span></td>
                       <td className="py-3 font-bold text-red-500">-${Number(exp.amount).toLocaleString()}</td>
                       <td className="py-3 text-right">
                         {confirmExpenseDeleteId === exp.id ? (
                           <div className="flex items-center justify-end gap-2 animate-fade-in">
                             <span className="text-xs text-red-500 font-bold mr-2">¿Eliminar?</span>
                             <button onClick={() => setConfirmExpenseDeleteId(null)} className="px-2 py-1 text-xs rounded-md bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 font-bold">No</button>
                             <button onClick={() => { deleteExpense(exp.id); setConfirmExpenseDeleteId(null); }} className="px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-500 font-bold shadow-md">Sí</button>
                           </div>
                         ) : (
                           <div className="flex items-center justify-end gap-2">
                             <button onClick={() => handleEditExpense(exp)} className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`} title="Editar Gasto">
                               <Edit size={16} />
                             </button>
                             <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmExpenseDeleteId(exp.id); }} className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'}`} title="Eliminar Gasto">
                               <Trash2 size={16} />
                             </button>
                           </div>
                         )}
                       </td>
                     </tr>
                   ))}
                   {filteredExpenses.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-gray-500">No hay egresos registrados.</td></tr>}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {/* Tab Content: Nómina */}
      {activeTab === 'nomina' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-6">
            {/* Formulario Empleado */}
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Briefcase size={18}/> Nuevo Empleado</h3>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Nombre Completo</label>
                  <input type="text" value={empName} onChange={e=>setEmpName(e.target.value)} required
                    className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Cargo</label>
                  <input type="text" value={empRole} onChange={e=>setEmpRole(e.target.value)} required
                    className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Frecuencia de Pago</label>
                  <select value={empFreq} onChange={e=>setEmpFreq(e.target.value)}
                    className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`}>
                    <option value="Semanal">Semanal</option>
                    <option value="Diario">Diario</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>

                {empFreq === 'Semanal' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Día de Pago de la Semana</label>
                    <select value={empPayDay} onChange={e=>setEmpPayDay(e.target.value)}
                      className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`}>
                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-500">Salario Base ($)</label>
                  <input type="number" value={empSalary} onChange={e=>setEmpSalary(e.target.value)} required min="0"
                    className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`} />
                </div>
                <button type="submit" className="w-full py-3 rounded-xl bg-gold-gradient text-black font-bold tracking-wider hover:scale-[1.02] transition-transform">
                  Agregar Empleado
                </button>
              </form>
            </div>


          </div>

          <div className={`p-6 rounded-2xl border lg:col-span-2 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
             <h3 className="text-lg font-bold mb-4">Plantilla de Empleados</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
               {(employees || []).map(emp => (
                 <div key={emp.id} className={`p-4 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border hover:border-gold-500/40' : 'bg-gray-50 border-gray-200 hover:border-gold-500/40'} relative flex flex-col justify-between transition-all duration-200`}>
                   <div onClick={() => openEmployeeDetails(emp)} className="cursor-pointer group">
                     <div className="flex justify-between items-start">
                       <div>
                         <h4 className="font-bold text-lg group-hover:text-gold-500 transition-colors flex items-center gap-2">
                           {emp.name}
                           <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-400 group-hover:bg-gold-500 group-hover:text-black transition-colors">Ver Ficha</span>
                         </h4>
                         <p className="text-sm text-gold-500 font-semibold">{emp.role}</p>
                       </div>
                     </div>
                     <div className="mt-3 space-y-1 text-xs text-gray-500">
                       <p>Base: <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>${(Number(emp.baseSalary) || 0).toLocaleString('es-CO')}</strong> ({emp.displayFrequency || emp.frequency})</p>
                       <p className="flex items-center gap-1 text-blue-400 font-semibold"><Calendar size={12}/> Próx. Pago: {getNextPaymentDate(emp)}</p>
                     </div>
                   </div>
                   
                   {confirmDeleteId === emp.id ? (
                     <div className="mt-4 pt-3 border-t border-red-500/20 flex flex-col gap-2 animate-fade-in">
                       <p className="text-xs text-red-500 text-center font-bold">¿Eliminar empleado?</p>
                       <div className="flex gap-2">
                         <button onClick={() => setConfirmDeleteId(null)} className="flex-1 text-xs py-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 font-bold transition-colors">Cancelar</button>
                         <button onClick={() => { deleteEmployee(emp.id); setConfirmDeleteId(null); }} className="flex-1 text-xs py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 font-bold transition-colors shadow-lg">Confirmar</button>
                       </div>
                     </div>
                   ) : (
                     <div className="mt-4 pt-3 border-t border-gray-500/20 flex gap-2">
                       <button 
                         onClick={() => openEmployeeDetails(emp)}
                         className={`px-3 text-xs font-bold py-2 rounded-lg border transition-colors ${isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
                         title="Ver Ficha / Editar datos"
                       >
                         Ficha
                       </button>
                       <button 
                         onClick={() => openLiquidationModal(emp)}
                         className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-colors ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-500 hover:text-white'}`}>
                         Liquidar
                       </button>
                       <button 
                         onClick={() => setConfirmDeleteId(emp.id)}
                         className={`flex items-center justify-center px-3 rounded-lg border transition-colors ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-500 hover:text-white'}`}
                         title="Eliminar empleado"
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                   )}
                 </div>
               ))}
               {(employees || []).length === 0 && <p className="text-sm text-gray-500 col-span-2">No hay empleados registrados.</p>}
             </div>

             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 mt-8">
               <h3 className="text-lg font-bold">Historial de Nómina</h3>
               <button 
                 onClick={() => setShowPayrollExport(true)}
                 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600/10 text-green-500 font-bold hover:bg-green-600/20 transition-colors text-sm border border-green-500/20"
               >
                 <Download size={16} />
                 Descargar Histórico
               </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-dark-border text-gray-400' : 'border-gray-200 text-gray-500'} text-xs uppercase tracking-wider`}>
                      <th className="pb-3 font-semibold">Fecha</th>
                      <th className="pb-3 font-semibold">Empleado</th>
                      <th className="pb-3 font-semibold">Base</th>
                      <th className="pb-3 font-semibold">Bonos/Ded.</th>
                      <th className="pb-3 font-semibold">Notas / Motivos</th>
                      <th className="pb-3 font-semibold">Total Pagado</th>
                      <th className="pb-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayroll.map(p => (
                      <tr key={p.id} className={`border-b ${isDark ? 'border-dark-border/50' : 'border-gray-100'} text-sm`}>
                        <td className="py-3 text-xs font-semibold">{format(parseISO(p.date || new Date().toISOString()), 'dd/MM/yyyy')}</td>
                        <td className="py-3 font-medium">{p.employeeName}</td>
                        <td className="py-3 text-xs">${(Number(p.baseSalary) || 0).toLocaleString('es-CO')}</td>
                        <td className="py-3 text-xs">
                          <span className="text-green-500 font-bold">+{Number(p.bonus || 0).toLocaleString('es-CO')}</span> / <span className="text-red-500 font-bold">-{Number(p.deduction || 0).toLocaleString('es-CO')}</span>
                        </td>
                        <td className="py-3 text-xs max-w-[220px] truncate text-gray-400" title={p.observation || ''}>
                          {p.observation || '—'}
                        </td>
                        <td className="py-3 font-bold text-blue-500">${(Number(p.totalPaid) || 0).toLocaleString('es-CO')}</td>
                        <td className="py-3 text-right">
                          {confirmPayrollDeleteId === p.id ? (
                            <div className="flex items-center justify-end gap-1 animate-fade-in">
                              <span className="text-[10px] text-red-500 font-bold">¿Borrar?</span>
                              <button onClick={() => setConfirmPayrollDeleteId(null)} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-500/10 text-gray-400 font-bold">No</button>
                              <button onClick={() => { deletePayrollRecord(p.id); setConfirmPayrollDeleteId(null); }} className="px-1.5 py-0.5 text-[10px] rounded bg-red-600 text-white font-bold shadow">Sí</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => {
                                  setEditingPayrollRecord(p)
                                  setEditPayrollDateValue(p.date ? p.date.split('T')[0] : new Date().toISOString().split('T')[0])
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gold-500/10 text-gold-400' : 'hover:bg-gold-50 text-gold-600'}`}
                                title="Mover a otra fecha (Ej. Semana pasada)"
                              >
                                <CalendarDays size={15} />
                              </button>
                              <button 
                                onClick={() => setConfirmPayrollDeleteId(p.id)}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                                title="Eliminar registro"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredPayroll.length === 0 && <tr><td colSpan="7" className="py-6 text-center text-gray-500">No hay pagos de nómina registrados.</td></tr>}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      )}

      {/* Tab Content: Historial de Caja */}
      {activeTab === 'caja' && (
        <div>
          {/* Filtros de fecha */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Período:</span>
            <div className={`flex items-center gap-1 p-1 rounded-xl border
              ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
              {['Hoy', 'Semana', 'Mes', 'Todo'].map(f => (
                <button key={f} onClick={() => setCajaTimeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${cajaTimeFilter === f
                      ? 'bg-gold-gradient text-dark-bg shadow-gold-sm'
                      : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'border-dark-border bg-dark-card' : 'border-light-border bg-gray-50'}`}>
              <Archive size={18} className="text-gold-500" />
              <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Cierres de Caja Registrados</h3>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500" />
              </div>
            ) : (() => {
              const filtered = registerHistory.filter(r => {
                if (cajaTimeFilter === 'Todo') return true
                if (!r.closed_at) return false
                const d = new Date(r.closed_at)
                if (cajaTimeFilter === 'Hoy') return isToday(d)
                if (cajaTimeFilter === 'Semana') return isThisWeek(d, { weekStartsOn: 1 })
                if (cajaTimeFilter === 'Mes') return isThisMonth(d)
                return true
              })
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`border-b text-xs uppercase tracking-wider
                        ${isDark ? 'border-dark-border bg-dark-card text-gray-400' : 'border-light-border bg-gray-50 text-gray-500'}`}>
                        <th className="px-4 py-3 font-semibold">Fecha Cierre</th>
                        <th className="px-4 py-3 font-semibold">Abrió</th>
                        <th className="px-4 py-3 font-semibold">Cerró</th>
                        <th className="px-4 py-3 font-semibold text-right">Monto Inicial</th>
                        <th className="px-4 py-3 font-semibold text-right">Sistema</th>
                        <th className="px-4 py-3 font-semibold text-right">Físico</th>
                        <th className="px-4 py-3 font-semibold text-right">Diferencia</th>
                        <th className="px-4 py-3 font-semibold">Observaciones</th>
                        {user?.role === 'admin' && <th className="px-4 py-3 font-semibold text-right">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={user?.role === 'admin' ? "9" : "8"} className={`px-6 py-12 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            No hay cierres de caja en este período.
                          </td>
                        </tr>
                      ) : filtered.map(r => {
                        const diff = Number(r.difference) || 0
                        return (
                          <tr key={r.id} className={`border-b last:border-0 transition-colors
                            ${isDark ? 'border-dark-border text-gray-300 hover:bg-dark-card' : 'border-light-border text-gray-700 hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <p className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {r.closed_at ? format(parseISO(r.closed_at), 'dd/MM/yyyy') : '—'}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {r.opened_at ? format(parseISO(r.opened_at), 'HH:mm') : ''} – {r.closed_at ? format(parseISO(r.closed_at), 'HH:mm') : ''}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium">{r.opened_by || '—'}</td>
                            <td className="px-4 py-3 text-xs font-medium">{r.closed_by || '—'}</td>
                            <td className="px-4 py-3 text-right text-xs font-bold">
                              ${Math.round(Number(r.opening_amount) || 0).toLocaleString('es-CO')}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-bold">
                              ${Math.round(Number(r.closing_amount_system) || 0).toLocaleString('es-CO')}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-bold">
                              ${Math.round(Number(r.closing_amount_physical) || 0).toLocaleString('es-CO')}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold
                                ${diff >= 0
                                  ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                                  : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700')}`}>
                                {diff >= 0 ? '+' : ''}${Math.round(Math.abs(diff)).toLocaleString('es-CO')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                              {r.notes || <span className="italic opacity-50">Sin notas</span>}
                            </td>
                            {user?.role === 'admin' && (
                              <td className="px-4 py-3 text-right">
                                {confirmRegisterDeleteId === r.id ? (
                                  <div className="flex items-center justify-end gap-1.5 animate-fade-in">
                                    <span className="text-[10px] text-red-500 font-bold">¿Borrar?</span>
                                    <button onClick={() => setConfirmRegisterDeleteId(null)} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 font-bold">No</button>
                                    <button onClick={() => { handleDeleteRegister(r.id); setConfirmRegisterDeleteId(null); }} className="px-1.5 py-0.5 text-[10px] rounded bg-red-600 text-white hover:bg-red-500 font-bold shadow-md">Sí</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setConfirmRegisterDeleteId(r.id)} className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'}`} title="Eliminar Registro">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Payroll Export Modal */}
      {showPayrollExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-light-border shadow-xl'}`}>
            <h3 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
              <FileText className="text-green-500" />
              Exportar Nómina
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Genera un reporte detallado en Excel de los pagos a empleados.
            </p>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-semibold text-gray-500">Periodo a Descargar</label>
                <select value={exportType} onChange={e=>setExportType(e.target.value)}
                  className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`}>
                  <option value="Mensual">Mensual</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>
              
              <div className="flex gap-4">
                {exportType === 'Mensual' && (
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Mes</label>
                    <select value={exportMonth} onChange={e=>setExportMonth(Number(e.target.value))}
                      className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`}>
                      <option value={1}>Enero</option>
                      <option value={2}>Febrero</option>
                      <option value={3}>Marzo</option>
                      <option value={4}>Abril</option>
                      <option value={5}>Mayo</option>
                      <option value={6}>Junio</option>
                      <option value={7}>Julio</option>
                      <option value={8}>Agosto</option>
                      <option value={9}>Septiembre</option>
                      <option value={10}>Octubre</option>
                      <option value={11}>Noviembre</option>
                      <option value={12}>Diciembre</option>
                    </select>
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500">Año</label>
                  <input type="number" value={exportYear} onChange={e=>setExportYear(Number(e.target.value))}
                    className={`w-full mt-1 p-3 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-gray-50 border-gray-200'} outline-none focus:border-gold-500`} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayrollExport(false)} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>Cancelar</button>
              <button onClick={exportPayrollToExcel} className="flex-1 py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-500 flex items-center justify-center gap-2 transition-colors shadow-lg">
                <Download size={18} /> Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment / Liquidacion Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-lg rounded-3xl relative flex flex-col max-h-[85vh] my-auto shadow-2xl overflow-hidden border transition-all duration-300 ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            
            {/* Accent Bar */}
            <div className="h-1.5 bg-gold-gradient w-full shrink-0" />

            {showSuccess ? (
              <div className="flex flex-col items-center justify-center p-8 py-12 animate-scale-in">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className={`text-2xl font-black font-display text-center ${isDark ? 'text-white' : 'text-neutral-900'}`}>¡Pago Confirmado!</h3>
                <p className={`text-center mt-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>La liquidación se registró con éxito en la nómina.</p>
              </div>
            ) : (
              <>
                {/* Header fijo espaciado */}
                <div className={`px-6 pt-5 pb-4 border-b shrink-0 relative ${isDark ? 'border-dark-border bg-dark-card' : 'border-gray-100 bg-gray-50/50'}`}>
                  <button 
                    type="button"
                    onClick={() => setSelectedEmp(null)}
                    className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}>
                    <X size={16} />
                  </button>

                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-gold-500 uppercase tracking-wider">
                    <DollarSign size={14} className="shrink-0" />
                    Liquidación de Nómina
                  </div>

                  <h3 className="text-xl font-black font-display pr-10 tracking-tight">
                    Liquidando a: <span className={isDark ? 'text-gold-400' : 'text-gold-600'}>{selectedEmp.name}</span>
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs">
                    <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${isDark ? 'bg-white/5 text-gray-300 border border-white/10' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                      <Briefcase size={12} className="text-gray-400" /> Cargo: {selectedEmp.role}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${isDark ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20' : 'bg-gold-50 text-gold-700 border border-gold-200'}`}>
                      <Calendar size={12} className="text-gold-500" /> Frecuencia: {selectedEmp.frequency}
                    </span>
                  </div>
                </div>

                {/* Formulario con scroll interno */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                  <form onSubmit={handlePayPayroll} className="space-y-5">

                    {/* Fecha de Imputación del Pago */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                          <Calendar size={12} className="text-gold-500" /> Fecha del Pago / Cierre
                        </label>
                        <span className="text-[10px] text-gray-400">¿Afecta la semana pasada? Cambia la fecha</span>
                      </div>
                      <input 
                        type="date" 
                        value={payrollDate} 
                        onChange={e => setPayrollDate(e.target.value)} 
                        className={`w-full p-3 text-sm font-semibold rounded-2xl border outline-none transition-colors ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold-500'}`} 
                      />
                    </div>

                    {/* Selector de Modo de Base */}
                    <div className={`p-1.5 rounded-2xl border flex gap-1 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-100 border-gray-200'}`}>
                      <button
                        type="button"
                        onClick={() => setUseDailyCalc(false)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${!useDailyCalc ? (isDark ? 'bg-gold-500 text-black shadow-md' : 'bg-white text-gray-900 shadow-md') : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}`}
                      >
                        Monto Fijo / Ajustable
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseDailyCalc(true)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${useDailyCalc ? (isDark ? 'bg-gold-500 text-black shadow-md' : 'bg-white text-gray-900 shadow-md') : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}`}
                      >
                        Calculadora por Días
                      </button>
                    </div>

                    {/* Sección Salario Base */}
                    {!useDailyCalc ? (
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Monto Base a Liquidar ($)</label>
                        <input 
                          type="number" 
                          value={customBaseSalary} 
                          onChange={e => setCustomBaseSalary(e.target.value)} 
                          min="0"
                          step="500"
                          className={`w-full mt-1.5 p-3.5 text-xl font-black rounded-2xl border outline-none transition-colors ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold-500'}`} 
                        />
                      </div>
                    ) : (
                      <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Cálculo por Jornadas / Días</span>
                          <span className="text-xs font-bold text-gold-500">
                            Subtotal Base: ${((Number(daysWorked || 0) * Number(dailyRate || 0))).toLocaleString('es-CO')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500">Días Laborados</label>
                            <input 
                              type="number" 
                              value={daysWorked} 
                              onChange={e => setDaysWorked(e.target.value)} 
                              min="0"
                              step="0.5"
                              className={`w-full mt-1 p-2.5 text-base font-bold rounded-xl border outline-none ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500">Tarifa por Día ($)</label>
                            <input 
                              type="number" 
                              value={dailyRate} 
                              onChange={e => setDailyRate(e.target.value)} 
                              min="0"
                              step="500"
                              className={`w-full mt-1 p-2.5 text-base font-bold rounded-xl border outline-none ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                            />
                          </div>
                        </div>

                        {/* Presets de días */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-semibold text-gray-400">Acceso rápido:</span>
                          {[1, 2, 5, 6, 15].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDaysWorked(d)}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-colors ${Number(daysWorked) === d ? (isDark ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' : 'bg-gold-100 text-gold-700 border-gold-300') : (isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white border-gray-200 text-gray-600')}`}
                            >
                              {d}d
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sección Deducciones (-) */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50/50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                          Deducciones / Descuentos (-)
                        </span>
                        {/* Preset Descontar Día */}
                        <button
                          type="button"
                          onClick={() => {
                            const valDia = useDailyCalc ? Number(dailyRate || 0) : (Number(customBaseSalary || 0) / 30)
                            setDeduction(prev => Math.round(Number(prev || 0) + valDia))
                            setDeductionReason(prev => prev ? `${prev}, 1 día no laborado` : '1 día no laborado')
                          }}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                        >
                          + Descontar 1 Día
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500">Monto Descuento ($)</label>
                          <input 
                            type="number" 
                            value={deduction} 
                            onChange={e => setDeduction(e.target.value)} 
                            min="0"
                            step="500"
                            className={`w-full mt-1 p-2.5 text-base font-bold rounded-xl border outline-none text-red-500 focus:border-red-500 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-gray-200'}`} 
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500">Motivo del Descuento</label>
                          <input 
                            type="text" 
                            value={deductionReason} 
                            onChange={e => setDeductionReason(e.target.value)} 
                            placeholder="Ej. Día no laborado, anticipo..."
                            className={`w-full mt-1 p-2.5 text-xs rounded-xl border outline-none focus:border-red-500 ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sección Bonificaciones (+) */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                          Bonificaciones / Adicionales (+)
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setBonusReason('Día de alta venta')}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                          >
                            Alta Venta
                          </button>
                          <button
                            type="button"
                            onClick={() => setBonusReason('Horas extra')}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                          >
                            Horas Extra
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500">Monto Bonificación ($)</label>
                          <input 
                            type="number" 
                            value={bonus} 
                            onChange={e => setBonus(e.target.value)} 
                            min="0"
                            step="500"
                            className={`w-full mt-1 p-2.5 text-base font-bold rounded-xl border outline-none text-emerald-500 focus:border-emerald-500 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-gray-200'}`} 
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500">Motivo del Bono</label>
                          <input 
                            type="text" 
                            value={bonusReason} 
                            onChange={e => setBonusReason(e.target.value)} 
                            placeholder="Ej. Día alta venta, horas extra..."
                            className={`w-full mt-1 p-2.5 text-xs rounded-xl border outline-none focus:border-emerald-500 ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Observaciones generales */}
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Observaciones adicionales (Opcional)</label>
                      <input 
                        type="text" 
                        value={observation} 
                        onChange={e => setObservation(e.target.value)} 
                        placeholder="Notas generales de la liquidación..."
                        className={`w-full mt-1 p-3 text-xs rounded-xl border outline-none transition-colors ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-white border-gray-200 focus:border-gold-500'}`} 
                      />
                    </div>

                    {/* Desglose de Pago Neto */}
                    {(() => {
                      const effectiveBase = useDailyCalc 
                        ? (Number(daysWorked || 0) * Number(dailyRate || 0))
                        : Number(customBaseSalary || 0)
                      const totalNeto = Math.max(0, effectiveBase + Number(bonus || 0) - Number(deduction || 0))
                      return (
                        <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Monto Base</span>
                            <span className="font-semibold text-gray-300">${effectiveBase.toLocaleString('es-CO')}</span>
                          </div>
                          {Number(bonus) > 0 && (
                            <div className="flex justify-between text-xs text-emerald-500">
                              <span>+ Bonificaciones</span>
                              <span className="font-semibold">+${Number(bonus).toLocaleString('es-CO')}</span>
                            </div>
                          )}
                          {Number(deduction) > 0 && (
                            <div className="flex justify-between text-xs text-red-400">
                              <span>- Deducciones</span>
                              <span className="font-semibold">-${Number(deduction).toLocaleString('es-CO')}</span>
                            </div>
                          )}
                          <div className={`flex justify-between items-center pt-2 border-t text-base ${isDark ? 'border-dark-border' : 'border-gray-200'}`}>
                            <span className="font-bold">Total Neto a Pagar:</span>
                            <span className="text-2xl font-black text-emerald-500">
                              ${totalNeto.toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="pt-1">
                      <button 
                        type="submit" 
                        className="w-full py-4 rounded-2xl bg-gold-gradient text-black font-black uppercase tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-lg flex justify-center items-center gap-2 text-sm"
                      >
                        <CheckCircle2 size={20}/> Confirmar y Registrar Pago
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Payroll Date Modal */}
      {editingPayrollRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 relative border shadow-2xl ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <button 
              type="button" 
              onClick={() => setEditingPayrollRecord(null)}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/5'}`}>
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold font-display mb-1 flex items-center gap-2">
              <CalendarDays className="text-gold-500" size={20} />
              Cambiar Fecha del Pago
            </h3>
            <p className={`text-xs mb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Imputa este pago de <strong>{editingPayrollRecord.employeeName}</strong> (${Number(editingPayrollRecord.totalPaid || 0).toLocaleString('es-CO')}) a la semana o día correspondiente.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (!editPayrollDateValue) return
              const newISO = new Date(editPayrollDateValue + 'T12:00:00').toISOString()
              updatePayrollRecord(editingPayrollRecord.id, { date: newISO })
              setEditingPayrollRecord(null)
            }} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Nueva Fecha de Contabilización</label>
                <input 
                  type="date" 
                  value={editPayrollDateValue} 
                  onChange={e => setEditPayrollDateValue(e.target.value)} 
                  required
                  className={`w-full mt-1.5 p-3.5 text-sm font-bold rounded-2xl border outline-none ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`} 
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setEditingPayrollRecord(null)}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 rounded-xl bg-gold-gradient text-black font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition-transform">
                  Guardar Fecha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha del Empleado Modal */}
      {selectedEmpDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-xl rounded-3xl relative flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border transition-all duration-300 ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            
            {/* Accent Bar */}
            <div className="h-1.5 bg-gold-gradient w-full shrink-0" />

            {/* Header */}
            <div className={`px-6 pt-5 pb-4 border-b shrink-0 relative ${isDark ? 'border-dark-border bg-dark-card' : 'border-gray-100 bg-gray-50/50'}`}>
              <button 
                type="button"
                onClick={() => setSelectedEmpDetails(null)}
                className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-900'}`}>
                <X size={16} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gold-gradient text-black font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                  {editEmpName?.[0]?.toUpperCase() || 'E'}
                </div>
                <div>
                  <h3 className="text-xl font-black font-display tracking-tight">Ficha del Empleado</h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Información laboral, salario y día de pago semanal
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              <form onSubmit={handleSaveEmployeeDetails} className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold-500 flex items-center gap-1.5">
                  <Briefcase size={14} /> Configuración del Empleado
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={editEmpName} 
                      onChange={e => setEditEmpName(e.target.value)} 
                      required 
                      className={`w-full mt-1 p-3 text-sm font-semibold rounded-xl border outline-none ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold-500'}`} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Cargo / Rol</label>
                    <input 
                      type="text" 
                      value={editEmpRole} 
                      onChange={e => setEditEmpRole(e.target.value)} 
                      required 
                      className={`w-full mt-1 p-3 text-sm font-semibold rounded-xl border outline-none ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold-500'}`} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Salario / Tarifa Base ($)</label>
                    <input 
                      type="number" 
                      value={editEmpSalary} 
                      onChange={e => setEditEmpSalary(e.target.value)} 
                      required 
                      min="0"
                      step="500"
                      className={`w-full mt-1 p-3 text-sm font-bold rounded-xl border outline-none ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold-500'}`} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Frecuencia de Pago</label>
                    <select 
                      value={editEmpFreq} 
                      onChange={e => setEditEmpFreq(e.target.value)}
                      className={`w-full mt-1 p-3 text-sm font-semibold rounded-xl border outline-none ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold-500'}`}
                    >
                      <option value="Semanal">Semanal</option>
                      <option value="Diario">Diario</option>
                      <option value="Quincenal">Quincenal</option>
                      <option value="Mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                {/* Día Específico de Pago (si es Semanal) */}
                {editEmpFreq === 'Semanal' && (
                  <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                    <label className="text-xs font-bold uppercase tracking-wider text-gold-500 flex items-center gap-1.5">
                      <Calendar size={14} /> Día Preferido de Pago Semanal
                    </label>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Indica qué día de la semana se realiza el pago (Lunes, Martes, Domingo, etc.):
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setEditEmpPayDay(day)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${editEmpPayDay === day ? (isDark ? 'bg-gold-500 text-black border-gold-500 shadow' : 'bg-gold-500 text-black border-gold-500 shadow') : (isDark ? 'bg-dark-card border-dark-border text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100')}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button 
                    type="submit" 
                    className="flex-1 py-3.5 rounded-xl bg-gold-gradient text-black font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition-transform">
                    Guardar Ficha
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const empToPay = selectedEmpDetails
                      setSelectedEmpDetails(null)
                      openLiquidationModal(empToPay)
                    }}
                    className="py-3.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-colors shadow-md flex items-center gap-1.5">
                    <DollarSign size={16} /> Liquidar Ahora
                  </button>
                </div>
              </form>

              {/* Historial de Pagos del Empleado */}
              <div className="pt-4 border-t border-gray-500/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-400" /> Historial de Liquidaciones
                </h4>
                {(() => {
                  const empPayrolls = (payrollHistory || []).filter(p => p.employeeId === selectedEmpDetails.id)
                  const totalPaidAccum = empPayrolls.reduce((sum, p) => sum + Number(p.totalPaid || 0), 0)

                  return (
                    <div className="space-y-3">
                      <div className={`p-3.5 rounded-xl border flex justify-between items-center text-xs ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                        <span className="font-semibold text-gray-400">Total Acumulado Pagado:</span>
                        <span className="font-black text-emerald-500 text-sm">${totalPaidAccum.toLocaleString('es-CO')}</span>
                      </div>

                      {empPayrolls.length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-2 text-center">No hay registros de liquidación previos para este empleado.</p>
                      ) : (
                        <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {empPayrolls.map(p => (
                            <div key={p.id} className={`p-3 rounded-xl border flex justify-between items-center text-xs ${isDark ? 'bg-dark-surface/50 border-dark-border' : 'bg-white border-gray-200'}`}>
                              <div>
                                <p className="font-bold text-blue-400">${(Number(p.totalPaid) || 0).toLocaleString('es-CO')}</p>
                                <p className="text-[10px] text-gray-400">{format(parseISO(p.date || new Date().toISOString()), 'dd/MM/yyyy')} — {p.observation || 'Sin notas'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
