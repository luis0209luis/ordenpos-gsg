import { useState, useMemo } from 'react'
import { useTheme, useAuth } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { getPaddedTurnNumber } from '../utils/turnHelper'
import { isToday, isThisWeek, isThisMonth, isThisYear, parseISO, format } from 'date-fns'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'
import { TrendingUp, Package, DollarSign } from 'lucide-react'

export default function Reports() {
  const { theme } = useTheme() || {}
  const { user } = useAuth() || {}
  const isDark = theme === 'dark'
  const { products = [], salesHistory = [], deleteSale } = useInventory() || {}
  const [timeFilter, setTimeFilter] = useState('Mes')

  const handleDeleteSale = (id) => {
    if (confirm('¿Estás seguro? Esta acción afectará el inventario y las estadísticas diarias.')) {
      deleteSale(id)
    }
  }

  // Filter logic
  const filteredSales = useMemo(() => {
    return (salesHistory || []).filter(sale => {
      const date = parseISO(sale?.date || new Date().toISOString())
      if (timeFilter === 'Hoy') return isToday(date)
      if (timeFilter === 'Semana') return isThisWeek(date)
      if (timeFilter === 'Mes') return isThisMonth(date)
      if (timeFilter === 'Año') return isThisYear(date)
      return true
    })
  }, [salesHistory, timeFilter])

  // Aggregation for Line Chart (by Day/Month depending on filter)
  const chartData = useMemo(() => {
    const agg = {}
    filteredSales.forEach(sale => {
      let key = ''
      const date = parseISO(sale.date)
      if (timeFilter === 'Hoy') key = format(date, 'HH:mm')
      else if (timeFilter === 'Semana') key = format(date, 'EEE') // Mon, Tue...
      else if (timeFilter === 'Mes') key = format(date, 'dd MMM')
      else if (timeFilter === 'Año') key = format(date, 'MMM')

      if (!agg[key]) agg[key] = { name: key, sales: 0, orders: 0 }
      agg[key].sales += sale.total
      agg[key].orders += 1
    })
    return Object.values(agg)
  }, [filteredSales, timeFilter])

  // Top Products Logic
  const topProducts = useMemo(() => {
    const productSales = {}
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.nombre]) productSales[item.nombre] = 0
        productSales[item.nombre] += (item.precio * item.quantity)
      })
    })
    return Object.entries(productSales)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [filteredSales])

  // KPIs
  const totalIngresos = filteredSales.reduce((acc, sale) => acc + sale.total, 0)
  const totalOrdenes = filteredSales.length

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-4 rounded-xl shadow-lg border text-sm
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <p className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}: {entry.name === 'Ventas' || entry.name === 'Ingresos' ? '$' : ''}{entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      
      {/* Header and Filters */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-3xl shadow-soft-lg
        ${isDark ? 'bg-dark-surface border border-dark-border' : 'bg-white border border-light-border'}`}>
        <div>
          <h2 className={`font-display font-bold text-2xl mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Reportes y Analíticas
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Resumen de rendimiento basado en tus ventas reales.
          </p>
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-xl border
          ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-surface border-light-border'}`}>
          {['Hoy', 'Semana', 'Mes', 'Año'].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${timeFilter === filter
                  ? 'bg-gold-gradient text-dark-bg shadow-gold-sm'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-3xl shadow-soft-lg border relative overflow-hidden group
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="absolute right-0 top-0 w-32 h-32 bg-gold-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-dark-card' : 'bg-light-surface'}`}>
              <DollarSign size={24} className="text-gold-500" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ingresos Totales</p>
              <h3 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>${totalIngresos.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        
        <div className={`p-6 rounded-3xl shadow-soft-lg border relative overflow-hidden group
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-dark-card' : 'bg-light-surface'}`}>
              <TrendingUp size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Órdenes Completadas</p>
              <h3 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalOrdenes}</h3>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-3xl shadow-soft-lg border relative overflow-hidden group
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-dark-card' : 'bg-light-surface'}`}>
              <Package size={24} className="text-purple-500" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Total en Inventario</p>
              <h3 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{(products || []).length} Items</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Chart */}
        <div className={`p-6 rounded-3xl shadow-soft-lg border flex flex-col h-[400px]
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className={`font-display font-bold text-lg mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tendencia de Ventas ({timeFilter})
          </h3>
          <div className="flex-1 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffd700" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ffd700" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke={isDark ? '#333' : '#e5e5e5'} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
                  <YAxis stroke={isDark ? '#333' : '#e5e5e5'} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f1f1f' : '#f3f4f6'} vertical={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" name="Ventas" dataKey="sales" stroke="#ffd700" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 font-medium">No hay ventas en este periodo.</div>
            )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className={`p-6 rounded-3xl shadow-soft-lg border flex flex-col h-[400px]
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className={`font-display font-bold text-lg mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Productos Estrella (Ingresos)
          </h3>
          <div className="flex-1 w-full">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f1f1f' : '#f3f4f6'} vertical={false} />
                  <XAxis dataKey="name" stroke={isDark ? '#333' : '#e5e5e5'} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
                  <YAxis stroke={isDark ? '#333' : '#e5e5e5'} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#1f1f1f' : '#f3f4f6' }} />
                  <Bar dataKey="revenue" name="Ingresos" radius={[6, 6, 0, 0]}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#ffd700' : isDark ? '#333' : '#e5e5e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 font-medium">No hay datos suficientes.</div>
            )}
          </div>
        </div>

      </div>

      {/* Historial de Ventas */}
      <div className={`p-6 rounded-3xl shadow-soft-lg border flex flex-col mt-6
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
        <h3 className={`font-display font-bold text-lg mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Registro Detallado de Ventas ({timeFilter})
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-xs uppercase tracking-wider
                ${isDark ? 'border-dark-border bg-dark-card text-gray-400' : 'border-light-border bg-light-surface text-gray-500'}`}>
                <th className="px-6 py-4 font-semibold">Orden / Fecha</th>
                <th className="px-6 py-4 font-semibold">Artículos</th>
                <th className="px-6 py-4 font-semibold text-right">Total</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(filteredSales || []).slice().reverse().map(sale => (
                <tr key={sale?.id} className={`border-b last:border-0 transition-colors duration-200
                  ${isDark ? 'border-dark-border text-gray-300 hover:bg-dark-card' : 'border-light-border text-gray-700 hover:bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Orden #{getPaddedTurnNumber(sale, salesHistory)}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Ref: #{String(sale?.id || '').slice(-6)}</p>
                    <p className="text-xs text-gray-500">{new Date(sale?.date).toLocaleString()}</p>

                  </td>
                  <td className="px-6 py-4 text-sm">
                    {(sale?.items || []).map(item => (
                      <div key={item.id}>{item.quantity}x {item.nombre}</div>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    ${sale.total.toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user?.role === 'admin' ? (
                      <button onClick={() => handleDeleteSale(sale.id)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all
                        ${isDark 
                          ? 'bg-red-500/10 border-gold-500/30 text-red-400 hover:border-gold-500 hover:bg-red-500/20' 
                          : 'bg-red-50 border-gold-500/50 text-red-600 hover:border-gold-500 hover:bg-red-100'}`}>
                        Eliminar Venta
                      </button>
                    ) : (
                      <span className="text-xs italic text-gray-500">Sin permisos</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="4" className={`px-6 py-8 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    No hay ventas registradas en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
