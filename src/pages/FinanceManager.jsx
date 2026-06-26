import { useState, useEffect } from 'react'
import { format, parseISO, addDays, addWeeks, addMonths, isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns'
import * as XLSX from 'xlsx'
import { useFinance } from '../context/FinanceContext'
import { useInventory } from '../context/InventoryContext'
import { useTheme, useAuth } from '../context/AppContext'
import { useCashRegister } from '../context/CashRegisterContext'
import { DollarSign, TrendingUp, TrendingDown, Users, Download, Plus, FileText, Briefcase, Calendar, CheckCircle2, Trash2, X, Edit, Archive } from 'lucide-react'

export default function FinanceManager() {
  const { theme } = useTheme()
  const { user } = useAuth() || {}
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
  const [empFreq, setEmpFreq] = useState('Mensual')
  const [empSalary, setEmpSalary] = useState('')

  // Payroll Payment State
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [bonus, setBonus] = useState(0)
  const [deduction, setDeduction] = useState(0)
  const [observation, setObservation] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmExpenseDeleteId, setConfirmExpenseDeleteId] = useState(null)
  
  // Payroll Export Modal State
  const [showPayrollExport, setShowPayrollExport] = useState(false)
  const [exportType, setExportType] = useState('Mensual')
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1)
  const [exportYear, setExportYear] = useState(new Date().getFullYear())

  // Filter by period
  const [timeFilter, setTimeFilter] = useState('Todo')

  const filteredSales = (salesHistory || []).filter(sale => {
    if (timeFilter === 'Todo') return true
    const date = parseISO(sale?.date || new Date().toISOString())
    if (timeFilter === 'Hoy') return isToday(date)
    if (timeFilter === 'Semana') return isThisWeek(date)
    if (timeFilter === 'Mes') return isThisMonth(date)
    if (timeFilter === 'Año') return isThisYear(date)
    return true
  })

  const filteredExpenses = (expenses || []).filter(exp => {
    if (timeFilter === 'Todo') return true
    const date = parseISO(exp?.date || new Date().toISOString())
    if (timeFilter === 'Hoy') return isToday(date)
    if (timeFilter === 'Semana') return isThisWeek(date)
    if (timeFilter === 'Mes') return isThisMonth(date)
    if (timeFilter === 'Año') return isThisYear(date)
    return true
  })

  const filteredPayroll = (payrollHistory || []).filter(p => {
    if (timeFilter === 'Todo') return true
    const date = parseISO(p?.date || new Date().toISOString())
    if (timeFilter === 'Hoy') return isToday(date)
    if (timeFilter === 'Semana') return isThisWeek(date)
    if (timeFilter === 'Mes') return isThisMonth(date)
    if (timeFilter === 'Año') return isThisYear(date)
    return true
  })

  // Calcs
  const totalSales = filteredSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0)
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  const totalPayroll = filteredPayroll.reduce((sum, p) => sum + (Number(p.totalPaid) || 0), 0)
  const netProfit = totalSales - totalExpenses - totalPayroll

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
      baseSalary: Number(empSalary),
      startDate: new Date().toISOString()
    })
    setEmpName('')
    setEmpRole('')
    setEmpSalary('')
  }

  const handlePayPayroll = (e) => {
    e.preventDefault()
    if (!selectedEmp) return
    const totalPaid = selectedEmp.baseSalary + Number(bonus) - Number(deduction)
    addPayrollRecord({
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      baseSalary: selectedEmp.baseSalary,
      bonus: Number(bonus),
      deduction: Number(deduction),
      totalPaid,
      observation
    })
    
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setSelectedEmp(null)
      setBonus(0)
      setDeduction(0)
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
      ['Total Ingresos (Ventas POS)', totalSales],
      ['Total Egresos (Gastos Operativos)', totalExpenses],
      ['Total Nómina (Pagos Empleados)', totalPayroll],
      ['Utilidad Neta', netProfit]
    ])
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    // 2. Movimientos Tab (Ingresos + Egresos)
    const ingresosData = filteredSales.map(s => ({
      Fecha: format(parseISO(s.date), 'yyyy-MM-dd HH:mm'),
      Tipo: 'Ingreso (Venta)',
      Categoria: 'POS',
      Descripcion: `Venta #${String(s?.id || '').slice(-5)}`,
      Monto: s.total
    }))
    const egresosData = filteredExpenses.map(e => ({
      Fecha: format(parseISO(e.date), 'yyyy-MM-dd'),
      Tipo: 'Egreso (Gasto)',
      Categoria: e.category,
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
    const lastPayment = (payrollHistory || []).find(p => p.employeeId === emp.id)
    const baseDate = lastPayment ? parseISO(lastPayment.date) : parseISO(emp.startDate)
    let nextDate;
    if (emp.frequency === 'Diario') nextDate = addDays(baseDate, 1)
    else if (emp.frequency === 'Semanal') nextDate = addWeeks(baseDate, 1)
    else if (emp.frequency === 'Quincenal') nextDate = addDays(baseDate, 15)
    else nextDate = addMonths(baseDate, 1)
    return format(nextDate, 'dd/MM/yyyy')
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
                onClick={() => setTimeFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-500/30 pb-2 overflow-x-auto">
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
                    <option>Diario</option>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                  </select>
                </div>
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
                 <div key={emp.id} className={`p-4 rounded-xl border ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'} relative flex flex-col justify-between`}>
                   <div>
                     <h4 className="font-bold text-lg">{emp.name}</h4>
                     <p className="text-sm text-gold-500 font-semibold">{emp.role}</p>
                     <div className="mt-3 space-y-1 text-xs text-gray-500">
                       <p>Base: <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>${(Number(emp.baseSalary) || 0).toLocaleString()}</strong> ({emp.frequency})</p>
                       <p className="flex items-center gap-1 text-blue-400"><Calendar size={12}/> Próx. Pago: {getNextPaymentDate(emp)}</p>
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
                         onClick={() => { setSelectedEmp(emp); setBonus(0); setDeduction(0); }}
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
                    <tr className={`border-b ${isDark ? 'border-dark-border text-gray-400' : 'border-gray-200 text-gray-500'} text-sm`}>
                      <th className="pb-3 font-semibold">Fecha</th>
                      <th className="pb-3 font-semibold">Empleado</th>
                      <th className="pb-3 font-semibold">Bonos/Ded.</th>
                      <th className="pb-3 font-semibold">Total Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayroll.map(p => (
                      <tr key={p.id} className={`border-b ${isDark ? 'border-dark-border/50' : 'border-gray-100'} text-sm`}>
                        <td className="py-3">{format(parseISO(p.date || new Date().toISOString()), 'dd/MM/yyyy')}</td>
                        <td className="py-3 font-medium">{p.employeeName}</td>
                        <td className="py-3">
                          <span className="text-green-500 text-xs">+{p.bonus}</span> / <span className="text-red-500 text-xs">-{p.deduction}</span>
                        </td>
                        <td className="py-3 font-bold text-blue-500">${(Number(p.totalPaid) || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {filteredPayroll.length === 0 && <tr><td colSpan="4" className="py-6 text-center text-gray-500">No hay pagos de nómina registrados.</td></tr>}
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
                if (cajaTimeFilter === 'Semana') return isThisWeek(d)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 relative overflow-hidden transition-all duration-300 transform scale-100 ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-light-border shadow-2xl'}`}>
            
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 animate-scale-in">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className={`text-2xl font-black font-display text-center ${isDark ? 'text-white' : 'text-neutral-900'}`}>¡Pago Confirmado!</h3>
                <p className={`text-center mt-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>La liquidación se registró con éxito en la nómina.</p>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setSelectedEmp(null)}
                  className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/5'}`}>
                  <X size={20} />
                </button>

                <h3 className="text-xl font-bold font-display mb-2 pr-8">
                  Liquidando a: <span className={isDark ? 'text-gold-400' : 'text-gold-600'}>{selectedEmp.name}</span>
                </h3>
                
                <div className="flex items-center gap-3 mb-6">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-gray-700'}`}>
                    Frecuencia: {selectedEmp.frequency}
                  </span>
                </div>

                <form onSubmit={handlePayPayroll} className="space-y-4">
                  <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <span className="text-sm font-semibold text-gray-500">Salario Base</span>
                    <span className="text-xl font-bold">${selectedEmp.baseSalary.toLocaleString('es-CO')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Bonos Extras (+)</label>
                      <input type="number" value={bonus} onChange={e=>setBonus(e.target.value)} min="0"
                        className={`w-full mt-1 p-3 text-lg font-bold rounded-xl border outline-none transition-colors ${isDark ? 'bg-dark-surface border-dark-border text-green-400 focus:border-green-500' : 'bg-white border-gray-200 text-green-600 focus:border-green-500'}`} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Deducciones (-)</label>
                      <input type="number" value={deduction} onChange={e=>setDeduction(e.target.value)} min="0"
                        className={`w-full mt-1 p-3 text-lg font-bold rounded-xl border outline-none transition-colors ${isDark ? 'bg-dark-surface border-dark-border text-red-400 focus:border-red-500' : 'bg-white border-gray-200 text-red-600 focus:border-red-500'}`} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500">Observaciones (Opcional)</label>
                    <input type="text" value={observation} onChange={e=>setObservation(e.target.value)} placeholder="Ej. Bono por metas cumplidas"
                      className={`w-full mt-1 p-3 rounded-xl border outline-none transition-colors ${isDark ? 'bg-dark-surface border-dark-border text-white focus:border-gold-500' : 'bg-white border-gray-200 focus:border-gold-500'}`} />
                  </div>

                  <div className={`flex justify-between items-center text-lg pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <span className="font-bold text-gray-500">Total Neto a Pagar:</span>
                    <span className="text-3xl font-black text-green-500">
                      ${(selectedEmp.baseSalary + Number(bonus) - Number(deduction)).toLocaleString('es-CO')}
                    </span>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full py-4 rounded-xl bg-gold-gradient text-black font-black uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-lg flex justify-center items-center gap-2">
                      <CheckCircle2 size={20}/> Confirmar Pago
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
