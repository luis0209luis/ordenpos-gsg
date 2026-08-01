import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/AppContext'
import { DollarSign, TrendingUp, AlertCircle, Building2, Calendar, Trash2, Gift } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function AdminMasterFinance({ businesses, planPrice }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [movementLogs, setMovementLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch payment and gift logs from system_logs
  useEffect(() => {
    async function loadMovements() {
      setLoading(true)
      try {
        const { data } = await supabase.from('system_logs')
          .select('*')
          .in('action', ['add_month', 'gift_days'])
          .order('created_at', { ascending: false })
          
        if (data) setMovementLogs(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadMovements()
  }, [])

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro del historial?')) return
    setMovementLogs(prev => prev.filter(l => l.id !== logId))
    try {
      await supabase.from('system_logs').delete().eq('id', logId)
    } catch (e) {
      console.error('Error al eliminar registro:', e)
    }
  }

  // Calculations based strictly on `movementLogs`
  const stats = useMemo(() => {
    let expiring = 0
    businesses.forEach(b => {
      const currentDaysRemaining = b.days_remaining || b.daysRemaining || 0
      if (currentDaysRemaining <= 5) expiring++
    })

    const paidLogs = movementLogs.filter(l => l.action === 'add_month')
    const giftLogs = movementLogs.filter(l => l.action === 'gift_days')

    const totalRevenue = paidLogs.length * planPrice

    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyRevenue = paidLogs.filter(log => {
      const d = new Date(log.created_at)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length * planPrice

    return {
      totalRevenue,
      monthlyRevenue,
      totalGifts: giftLogs.length,
      expiringCount: expiring,
      activeCount: businesses.length
    }
  }, [businesses, planPrice, movementLogs])

  // Chart data based on movementLogs
  const chartData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const data = months.map(m => ({ name: m, Ingresos: 0, Regalos: 0 }))
    
    const currentYear = new Date().getFullYear()
    movementLogs.forEach(log => {
      const d = new Date(log.created_at)
      if (d.getFullYear() === currentYear) {
        const monthIdx = d.getMonth()
        if (log.action === 'add_month') {
          data[monthIdx].Ingresos += planPrice
        } else if (log.action === 'gift_days') {
          data[monthIdx].Regalos += planPrice
        }
      }
    })
    
    return data
  }, [movementLogs, planPrice])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3 border-b pb-4 border-dashed border-gray-500/30">
        <DollarSign size={28} className="text-green-500" />
        <div>
          <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Finanzas del Sistema (SaaS)
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ingresos reales y cortesías otorgadas a negocios</p>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`p-5 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-green-500/10 text-green-500"><TrendingUp size={16} /></div>
            <h3 className="font-semibold text-xs text-gray-400">Ingresos Totales</h3>
          </div>
          <p className="text-xl font-black font-display text-green-500">${stats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className={`p-5 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Calendar size={16} /></div>
            <h3 className="font-semibold text-xs text-gray-400">Ingresos del Mes</h3>
          </div>
          <p className={`text-xl font-black font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>${stats.monthlyRevenue.toLocaleString()}</p>
        </div>

        <div className={`p-5 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><Gift size={16} /></div>
            <h3 className="font-semibold text-xs text-gray-400">Regalos Dados</h3>
          </div>
          <p className="text-xl font-black font-display text-purple-400">{stats.totalGifts} <span className="text-xs font-normal opacity-60">cortesías</span></p>
        </div>

        <div className={`p-5 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400"><Building2 size={16} /></div>
            <h3 className="font-semibold text-xs text-gray-400">Empresas Activas</h3>
          </div>
          <p className={`text-xl font-black font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.activeCount}</p>
        </div>

        <div className={`p-5 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><AlertCircle size={16} /></div>
            <h3 className="font-semibold text-xs text-gray-400">Por Vencer (&le; 5d)</h3>
          </div>
          <p className="text-xl font-black font-display text-orange-500">{stats.expiringCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfica Dual: Verde (Ingresos) vs Morado (Regalos) */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Ingresos vs. Cortesías</h3>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-500"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Ingresos ($)</span>
              <span className="flex items-center gap-1.5 text-purple-400"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> Regalos (Cortesías)</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} />
                <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => [`$${value.toLocaleString()}`, name === 'Ingresos' ? 'Ingresos ($)' : 'Regalos (Valor equiv.)']}
                />
                <Line type="monotone" dataKey="Ingresos" name="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Regalos" name="Regalos" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historial de Movimientos */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg flex flex-col h-[400px] ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className="text-lg font-bold mb-4">Historial de Movimientos Registrados</h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {loading ? (
              <p className="text-center text-gray-500 mt-10">Cargando historial...</p>
            ) : movementLogs.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">No hay movimientos registrados.</p>
            ) : (
              movementLogs.map(log => {
                const biz = businesses.find(b => b.id === log.business_id)
                const isGift = log.action === 'gift_days'
                return (
                  <div key={log.id} className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                    <div>
                      <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{biz?.name || 'Negocio Desconocido'}</p>
                      <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                      <p className={`text-[10px] uppercase font-bold mt-1 ${isGift ? 'text-purple-400' : 'text-green-500'}`}>
                        {isGift ? '🎁 Días Obsequiados (Cortesía)' : 'Renovación de Suscripción (+30 días)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-black ${isGift ? 'text-purple-400' : 'text-green-500'}`}>
                        {isGift ? '$0 (Regalo)' : `$${planPrice.toLocaleString()}`}
                      </p>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className={`p-2 rounded-lg border transition-colors ${
                          isDark
                            ? 'bg-dark-card border-dark-border text-gray-500 hover:text-red-400 hover:border-red-500/50'
                            : 'bg-white border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300'
                        }`}
                        title="Eliminar este movimiento del historial"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
