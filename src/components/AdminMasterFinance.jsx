import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/AppContext'
import { DollarSign, TrendingUp, AlertCircle, Building2, Calendar } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminMasterFinance({ businesses, planPrice }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [paymentLogs, setPaymentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch payment logs from system_logs (when a month is added or business created)
  useEffect(() => {
    async function loadPayments() {
      setLoading(true)
      try {
        const { data } = await supabase.from('system_logs')
          .select('*')
          .in('action', ['add_month', 'create_business'])
          .order('created_at', { ascending: false })
          
        if (data) setPaymentLogs(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadPayments()
  }, [])

  // Calculations based strictly on `businesses` table
  const stats = useMemo(() => {
    let totalRevenue = 0
    let expiring = 0
    
    businesses.forEach(b => {
      // Calculate total days ever bought: 
      // (Days passed since start_date) + (days_remaining)
      const startDate = new Date(b.start_date || b.startDate)
      const daysPassed = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
      const currentDaysRemaining = b.days_remaining || b.daysRemaining || 0
      
      const totalDays = daysPassed + currentDaysRemaining
      // Assuming each 30 days equals 1 payment of planPrice
      const monthsBought = Math.max(1, Math.floor(totalDays / 30))
      totalRevenue += monthsBought * planPrice

      if (currentDaysRemaining <= 5) expiring++
    })

    // Calculate revenue just for the current month (mocked from paymentLogs)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyRevenue = paymentLogs.filter(log => {
      const d = new Date(log.created_at)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length * planPrice

    return {
      totalRevenue,
      monthlyRevenue,
      expiringCount: expiring,
      activeCount: businesses.length
    }
  }, [businesses, planPrice, paymentLogs])

  // Chart data based on paymentLogs
  const chartData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const data = months.map(m => ({ name: m, Ingresos: 0 }))
    
    const currentYear = new Date().getFullYear()
    paymentLogs.forEach(log => {
      const d = new Date(log.created_at)
      if (d.getFullYear() === currentYear) {
        data[d.getMonth()].Ingresos += planPrice
      }
    })
    
    // Si no hay logs suficientes, rellenar basado en los negocios para que no se vea vacío
    if (paymentLogs.length === 0) {
      businesses.forEach(b => {
        const d = new Date(b.start_date || b.startDate)
        if (d.getFullYear() === currentYear) {
          data[d.getMonth()].Ingresos += planPrice
        }
      })
    }
    return data
  }, [paymentLogs, businesses, planPrice])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3 border-b pb-4 border-dashed border-gray-500/30">
        <DollarSign size={28} className="text-green-500" />
        <div>
          <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Finanzas del Sistema (SaaS)
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ingresos generados por suscripciones de negocios</p>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-green-500/10 text-green-500"><TrendingUp size={18} /></div>
            <h3 className="font-semibold text-sm">Ingresos Totales</h3>
          </div>
          <p className="text-2xl font-black font-display text-green-500">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Calendar size={18} /></div>
            <h3 className="font-semibold text-sm">Ingresos del Mes</h3>
          </div>
          <p className={`text-2xl font-black font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>${stats.monthlyRevenue.toLocaleString()}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500"><Building2 size={18} /></div>
            <h3 className="font-semibold text-sm">Empresas Activas</h3>
          </div>
          <p className={`text-2xl font-black font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.activeCount}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><AlertCircle size={18} /></div>
            <h3 className="font-semibold text-sm">Por Vencer (&le; 5 días)</h3>
          </div>
          <p className="text-2xl font-black font-display text-orange-500">{stats.expiringCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfica */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className="text-lg font-bold mb-6">Ingresos Mensuales</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} />
                <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Ingresos']}
                />
                <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historial de Pagos */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg flex flex-col h-[400px] ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className="text-lg font-bold mb-4">Historial de Pagos Registrados</h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {loading ? (
              <p className="text-center text-gray-500 mt-10">Cargando pagos...</p>
            ) : paymentLogs.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">No hay pagos recientes registrados.</p>
            ) : (
              paymentLogs.map(log => {
                const biz = businesses.find(b => b.id === log.business_id)
                return (
                  <div key={log.id} className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                    <div>
                      <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{biz?.name || 'Negocio Desconocido'}</p>
                      <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                      <p className="text-[10px] text-green-500 mt-1 uppercase font-bold">{log.action === 'create_business' ? 'Suscripción Inicial (30 días)' : 'Renovación (+30 días)'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-green-500">${planPrice.toLocaleString()}</p>
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
