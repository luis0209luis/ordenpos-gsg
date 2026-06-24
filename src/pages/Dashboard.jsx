import { useTheme, useAuth, useSettings } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { useFinance } from '../context/FinanceContext'
import { useMemo } from 'react'
import { getSmartImage } from '../utils/imageHelper'
import OrdenposLogo from '../components/OrdenposLogo'
import { TrendingUp, Receipt, DollarSign, Calculator, ArrowUpRight, ArrowDownRight, AlertTriangle, CalendarClock, Bike } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'



export default function Dashboard() {
  const { theme } = useTheme() || {}
  const { user } = useAuth() || {}
  const { settings = {} } = useSettings() || {}
  const { products = [], salesHistory = [], getEstimatedStock } = useInventory() || {}
  const { employees = [] } = useFinance() || {}
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  const topProducts = useMemo(() => {
    const counts = {};
    const history = salesHistory || [];
    history.forEach(sale => {
      const items = sale?.items || [];
      items.forEach(item => {
        if (item && item.id) {
          counts[item.id] = (counts[item.id] || 0) + (item.quantity || 0)
        }
      })
    })

    const top = Object.entries(counts)
      .map(([id, quantity]) => {
        const product = (products || []).find(p => p && String(p.id) === id)
        if (!product) return null // Filtrar productos eliminados

        const imgInfo = getSmartImage(product.nombre, product.image_url)
        return {
          id,
          name: product.nombre,
          sales: quantity,
          img: imgInfo.url,
          isReference: imgInfo.isReference,
          isFallback: imgInfo.isFallback
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)

    if (top.length === 0) {
      return (products || []).slice(0, 5).map(p => {
        if (!p) return null
        const imgInfo = getSmartImage(p.nombre, p.image_url)
        return {
          id: p.id,
          name: p.nombre,
          sales: 0,
          img: imgInfo.url,
          isReference: imgInfo.isReference,
          isFallback: imgInfo.isFallback
        }
      }).filter(Boolean)
    }
    return top
  }, [salesHistory, products])

  const displayBusinessName = (settings?.businessName && settings.businessName !== 'Mi Negocio') 
    ? settings.businessName 
    : (user?.businessName || 'Mi Negocio')

  const currentLogo = !isDark && settings?.logoLightUrl ? settings.logoLightUrl : (settings?.logoUrl || null)

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString()
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = yesterdayDate.toLocaleDateString()

    let todaySales = 0, todayTickets = 0
    let yesterdaySales = 0, yesterdayTickets = 0

    const history = salesHistory || []
    history.forEach(sale => {
      if (!sale || !sale.date) return
      const d = new Date(sale.date)
      if (isNaN(d.getTime())) return
      const dStr = d.toLocaleDateString()
      if (dStr === todayStr) {
        todaySales += sale.total || 0
        todayTickets++
      } else if (dStr === yesterdayStr) {
        yesterdaySales += sale.total || 0
        yesterdayTickets++
      }
    })

    const todayAvg = todayTickets > 0 ? todaySales / todayTickets : 0
    const yesterdayAvg = yesterdayTickets > 0 ? yesterdaySales / yesterdayTickets : 0

    const calcTrend = (t, y) => {
      if (y === 0 && t === 0) return { val: '0%', isUp: true }
      if (y === 0) return { val: '+100%', isUp: true }
      const diff = ((t - y) / y) * 100
      return { val: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`, isUp: diff >= 0 }
    }

    const salesTrend = calcTrend(todaySales, yesterdaySales)
    const ticketsTrend = calcTrend(todayTickets, yesterdayTickets)
    const avgTrend = calcTrend(todayAvg, yesterdayAvg)

    return [
      { label: 'Ventas del Día', value: `$${todaySales.toLocaleString('es-CO')}`, icon: DollarSign, trend: salesTrend.val, isUp: salesTrend.isUp },
      { label: 'Tickets Generados', value: todayTickets.toString(), icon: Receipt, trend: ticketsTrend.val, isUp: ticketsTrend.isUp },
      { label: 'Ticket Promedio', value: `$${Math.round(todayAvg).toLocaleString('es-CO')}`, icon: Calculator, trend: avgTrend.val, isUp: avgTrend.isUp },
    ]
  }, [salesHistory])

  const realSalesData = useMemo(() => {
    const buckets = {}
    for (let i = 8; i <= 22; i++) {
      buckets[`${i.toString().padStart(2, '0')}:00`] = 0
    }

    const today = new Date().toLocaleDateString()
    const history = salesHistory || []
    history.forEach(sale => {
      if (!sale || !sale.date) return
      const d = new Date(sale.date)
      if (isNaN(d.getTime())) return
      if (d.toLocaleDateString() === today) {
        let hour = d.getHours()
        if (hour < 8) hour = 8
        if (hour > 22) hour = 22
        
        const bucketStr = `${hour.toString().padStart(2, '0')}:00`
        buckets[bucketStr] += sale.total || 0
      }
    })

    return Object.entries(buckets).map(([time, sales]) => ({ time, sales }))
  }, [salesHistory])

  const CustomSalesTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length && typeof label === 'string') {
      const hourNum = parseInt(label.split(':')[0], 10)
      if (isNaN(hourNum)) return null
      const ampm = hourNum >= 12 ? 'PM' : 'AM'
      return (
        <div className={`px-4 py-2 rounded-xl shadow-lg border text-sm font-bold backdrop-blur-md
          ${isDark ? 'bg-black/90 border-gold-500/30 text-white' : 'bg-white/90 border-gold-400/30 text-neutral-900'}`}>
          <span className="text-gold-500 mr-2">{label} {ampm}</span> 
          - ${(payload[0]?.value || 0).toLocaleString('es-CO')}
        </div>
      )
    }
    return null
  }

  const realLowStock = useMemo(() => {
    return (products || [])
      .filter(p => {
        if (p.inventory_mode === 'unlimited') return false
        const currentMinStock = p.stock_minimo ?? settings?.globalMinStock ?? 10
        const stockLimit = p.inventory_mode === 'recipe'
          ? (getEstimatedStock ? (getEstimatedStock(p.id) ?? 0) : 0)
          : (p.stock_actual ?? 0)
        return stockLimit <= currentMinStock
      })
      .map(p => {
        const stockLimit = p.inventory_mode === 'recipe'
          ? (getEstimatedStock ? (getEstimatedStock(p.id) ?? 0) : 0)
          : (p.stock_actual ?? 0)
        return { 
          id: p.id, 
          name: p.nombre, 
          stock: stockLimit,
          isRecipe: p.inventory_mode === 'recipe'
        }
      })
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5) // Show only top 5 alerts to keep UI clean
  }, [products, settings, getEstimatedStock])

  const todayDeliveriesCount = useMemo(() => {
    const todayStr = new Date().toLocaleDateString()
    return (salesHistory || []).filter(s => {
      if (!s || !s.isDelivery || !s.date) return false
      const d = new Date(s.date)
      if (isNaN(d.getTime())) return false
      return d.toLocaleDateString() === todayStr
    }).length
  }, [salesHistory])

  const payrollSummary = useMemo(() => {
    if (!employees || employees.length === 0) {
      return { daysLeft: '-', amount: 0 }
    }

    const today = new Date()
    today.setHours(0,0,0,0)
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    const mDay = Number(settings?.payrollMonthlyDay) || 30
    const bDay1 = Number(settings?.payrollBiweeklyDay1) || 15
    const bDay2 = Number(settings?.payrollBiweeklyDay2) || 30

    const payDatesMap = {} 

    employees.forEach(emp => {
      if (!emp) return
      let nextDates = []
      
      if (emp.frequency === 'Mensual') {
        let d = new Date(currentYear, currentMonth, mDay)
        if (d < today) d = new Date(currentYear, currentMonth + 1, mDay)
        nextDates.push(d)
      } else if (emp.frequency === 'Quincenal') {
        let d1 = new Date(currentYear, currentMonth, bDay1)
        if (d1 < today) d1 = new Date(currentYear, currentMonth + 1, bDay1)
        
        let d2 = new Date(currentYear, currentMonth, bDay2)
        if (d2 < today) d2 = new Date(currentYear, currentMonth + 1, bDay2)

        nextDates.push(d1, d2)
      } else if (emp.frequency === 'Semanal') {
        let d = new Date(today)
        d.setDate(today.getDate() + (7 - today.getDay())) 
        nextDates.push(d)
      } else if (emp.frequency === 'Diario') {
        let d = new Date(today)
        d.setDate(today.getDate() + 1)
        nextDates.push(d)
      } else {
        let d = new Date(currentYear, currentMonth, mDay)
        if (d < today) d = new Date(currentYear, currentMonth + 1, mDay)
        nextDates.push(d)
      }

      if (nextDates.length > 0) {
        nextDates.sort((a, b) => a - b)
        const closestDate = nextDates[0]
        const ts = closestDate.getTime()
        // If biweekly, split the base salary by 2 for the projection
        const amountToAdd = emp.frequency === 'Quincenal' ? Number(emp.baseSalary) / 2 : Number(emp.baseSalary)
        payDatesMap[ts] = (payDatesMap[ts] || 0) + (amountToAdd || 0)
      }
    })

    const futureDates = Object.keys(payDatesMap).map(Number).sort((a, b) => a - b)
    if (futureDates.length > 0) {
      const closestTs = futureDates[0]
      const closestDate = new Date(closestTs)
      const diffTime = closestDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return {
        daysLeft: diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Mañana' : `en ${diffDays} días`,
        amount: payDatesMap[closestTs]
      }
    }

    return { daysLeft: '-', amount: 0 }
  }, [employees, settings])

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Dynamic Header (The Hero Section) */}
      <div className={`relative p-8 md:p-10 rounded-3xl overflow-hidden border shadow-xl transition-colors duration-500
        ${isDark 
          ? 'bg-gradient-to-br from-black via-[#1a1a1a] to-[#262626] border-gold-500/40 shadow-black/40' 
          : 'bg-gradient-to-br from-white via-slate-50/50 to-slate-100/70 border-neutral-200/70 shadow-neutral-100/30'}`}>
        
        {/* Subtle glow effect */}
        {isDark && <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] pointer-events-none" />}
        {!isDark && <div className="absolute top-0 left-1/4 w-96 h-96 bg-slate-200/30 rounded-full blur-[100px] pointer-events-none" />}
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative group shrink-0">
              {/* Gold glow only in dark mode */}
              {isDark && (
                <div className="absolute inset-0 rounded-2xl blur-xl bg-gold-500/20 group-hover:bg-gold-500/40 transition-all duration-500" />
              )}
              
              <div className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center p-2 border shadow-md transition-all duration-500 group-hover:scale-105
                ${isDark 
                  ? 'bg-neutral-900/90 border-white/10 shadow-black/50' 
                  : 'bg-white border-neutral-200/50 shadow-neutral-100/50'}`}>
                {currentLogo ? (
                  <img 
                    src={currentLogo} 
                    alt="Logo del Negocio" 
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <OrdenposLogo size={60} className="drop-shadow-sm" />
                )}
              </div>
            </div>
            <div>
              <h1 className={`font-display font-black text-4xl tracking-tight mb-2 uppercase
                ${isDark ? 'gold-text' : 'text-neutral-900 drop-shadow-sm'}`}>
                {displayBusinessName}
              </h1>
              <p className={`text-lg md:text-xl font-light ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                {greeting}, <span className={`font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>{user?.username || 'Usuario'}</span>. Así va el pulso de tu negocio hoy.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/pos')}
            className="px-8 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase
            bg-gold-gradient text-dark-bg shadow-gold-md hover:shadow-gold-xl
            hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center gap-3">
            Nueva Orden
            <TrendingUp size={20} />
          </button>
        </div>
      </div>

      {/* Stats Grid (Glassmorphism) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className={`
              p-6 rounded-3xl relative overflow-hidden transition-all duration-500 transform hover:-translate-y-2 group
              backdrop-blur-xl backdrop-saturate-150
              ${isDark ? 'glass-dark border border-white/5 hover:border-gold-500/50 hover:shadow-gold-sm' 
                       : 'glass-light border border-black/5 hover:border-gold-400/60 hover:shadow-gold-sm'}
            `}>
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gold-500 blur-md opacity-20 rounded-full group-hover:opacity-40 transition-opacity duration-500" />
                  <div className={`relative p-3 rounded-2xl ${isDark ? 'bg-black/40' : 'bg-white/80'} border border-white/10 group-hover:border-gold-500/30 transition-colors`}>
                    <Icon size={24} className="text-gold-400 group-hover:text-gold-300 transition-colors" />
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border
                  ${stat.isUp 
                    ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200')
                    : (isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200')}
                `}>
                  {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  vs. ayer: {stat.trend}
                </div>
              </div>
              <div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {stat.label}
                </p>
                <h3 className={`text-3xl font-bold font-display tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {stat.value}
                </h3>
              </div>
            </div>
          )
        })}
      </div>

      {/* Next-Gen Area Chart */}
      <div className={`p-6 md:p-8 rounded-3xl min-h-[400px] flex flex-col transition-all duration-500 group
        ${isDark ? 'glass-dark border border-white/5 hover:border-gold-500/30 shadow-dark-md' : 'glass-light border border-black/5 hover:border-gold-400/40 shadow-soft-lg'}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className={`font-bold font-display text-xl ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Flujo de Ingresos
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Ventas en tiempo real del día actual</p>
          </div>
          <button 
            onClick={() => navigate('/reports')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 border
            ${isDark ? 'bg-white/5 hover:bg-white/10 text-gold-400 border-white/10 hover:border-gold-500/30' : 'bg-black/5 hover:bg-black/10 text-gold-600 border-black/5 hover:border-gold-400/30'}`}>
            Reporte Detallado
          </button>
        </div>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={realSalesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffd700" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#ffd700" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                ticks={['08:00', '12:00', '16:00', '20:00']}
                tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                content={<CustomSalesTooltip />}
                cursor={{ stroke: 'rgba(255,215,0,0.2)', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#ffd700" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorSales)" 
                activeDot={{ r: 6, fill: '#ffd700', stroke: isDark ? '#111' : '#FFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dashboard 360° Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Top Productos */}
        <div className={`p-6 md:p-8 rounded-3xl flex-1 transition-all duration-500
          ${isDark ? 'glass-dark border border-white/5 hover:border-gold-500/30 shadow-dark-md' : 'glass-light border border-black/5 hover:border-gold-400/40 shadow-soft-lg'}`}>
          <h3 className={`font-bold font-display text-lg mb-6 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Top Productos
          </h3>
          <div className="space-y-5">
            {topProducts.map((product, idx) => (
              <div key={product.id} onClick={() => navigate('/inventory', { state: { editProductId: product.id } })} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gold-500/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <img src={product.img} alt={product.name} className={`w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-gold-400 transition-all duration-300 relative z-10 shadow-md ${product.isReference && !product.isFallback ? 'brightness-[0.8] saturate-150' : (product.isFallback ? 'p-2 bg-dark-card border-white/10' : '')}`} />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${idx < 3 ? 'bg-gold-500 text-dark-bg border-gold-400' : 'bg-dark-bg text-gold-400 border-gold-500/50'} text-[10px] font-bold rounded-full flex items-center justify-center border z-20 shadow-sm`}>
                      {idx + 1}
                    </div>
                  </div>
                  <div>
                    <p className={`font-semibold text-sm group-hover:text-gold-400 transition-colors ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                      {product.name}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                      {product.sales} unidades
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${isDark ? 'bg-white/5 text-gold-400 group-hover:bg-gold-500/10' : 'bg-black/5 text-gold-600 group-hover:bg-gold-400/10'}`}>
                  Top
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas de Inventario */}
        <div className={`p-6 md:p-8 rounded-3xl flex-1 transition-all duration-500
          ${isDark ? 'glass-dark border border-white/5 hover:border-rose-500/30 shadow-dark-md' : 'glass-light border border-black/5 hover:border-rose-400/40 shadow-soft-lg'}`}>
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className={isDark ? "text-rose-400" : "text-rose-600"} size={22} />
            <h3 className={`font-bold font-display text-lg ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Alertas de Inventario
            </h3>
          </div>
          <div className="space-y-4">
            {realLowStock.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>Inventario en óptimas condiciones.</p>
            ) : (
              realLowStock.map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors border
                  ${isDark ? 'border-white/5 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/20' : 'border-black/5 bg-black/5 hover:bg-rose-50 hover:border-rose-200'}`}>
                  <div>
                    <p className={`font-semibold text-sm line-clamp-1 pr-2 ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                      {item.name}
                    </p>
                    <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                      Stock: {item.stock} unds
                    </p>
                  </div>
                  <button onClick={() => navigate('/inventory', { state: { editProductId: item.id } })} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border shrink-0
                    ${isDark ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'border-rose-200 text-rose-600 hover:bg-rose-50'}`}>
                    Reponer
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resumen Operativo */}
        <div className="flex flex-col gap-6">
          {/* Nómina */}
          <div className={`p-6 md:p-8 rounded-3xl flex-1 transition-all duration-500 flex flex-col justify-center relative overflow-hidden group
            ${isDark ? 'glass-dark border border-white/5 hover:border-gold-500/30 shadow-dark-md' : 'glass-light border border-black/5 hover:border-gold-400/40 shadow-soft-lg'}`}>
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-opacity opacity-20 group-hover:opacity-40
              ${isDark ? 'bg-gold-500' : 'bg-gold-400'}`} />
            
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <CalendarClock className={isDark ? "text-gold-400" : "text-gold-600"} size={22} />
              <h3 className={`font-bold font-display text-lg ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Nómina
              </h3>
            </div>
            <div className="relative z-10">
              <p className={`text-sm mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Próximo pago <span className={`font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>{payrollSummary.daysLeft}</span>
              </p>
              <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                ${payrollSummary.amount.toLocaleString('es-CO')}
              </div>
              <p className={`text-xs mt-1 font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Pendientes por pagar
              </p>
            </div>
          </div>

          {/* Domicilios */}
          <div className={`p-6 md:p-8 rounded-3xl flex-1 transition-all duration-500 flex items-center justify-between group
            ${isDark ? 'glass-dark border border-emerald-500/20 hover:border-emerald-500/50 shadow-dark-md' : 'glass-light border border-emerald-500/20 hover:border-emerald-500/40 shadow-soft-lg'}`}>
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <Bike className={isDark ? "text-emerald-400" : "text-emerald-600"} size={18} />
                  <h3 className={`font-bold font-display text-sm ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Domicilios Hoy
                  </h3>
               </div>
               <p className={`text-xs font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Enviados con éxito</p>
            </div>
            <div className={`text-4xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {todayDeliveriesCount}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
