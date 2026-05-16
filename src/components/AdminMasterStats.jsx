import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/AppContext'
import { Activity, Globe, MessageSquare, Star } from 'lucide-react'

export default function AdminMasterStats() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [stats, setStats] = useState({
    activeBusinesses: 0,
    globalSalesTotal: 0,
    totalProducts: 0,
    expiringBusinesses: 0,
    latestSales: [],
    recentTickets: [],
    topCategories: []
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const { count: bCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true })
        const { data: salesData } = await supabase.from('sales').select('total')
        const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
        const { count: eCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true }).lte('days_remaining', 5)
        
        const { data: latestSales } = await supabase.from('sales').select('*').order('date', { ascending: false }).limit(5)
        const { data: recentTickets } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(5)
        
        // Fetch products to determine real top categories globally
        const { data: allProducts } = await supabase.from('products').select('categoria')
        let catCount = {}
        if (allProducts) {
          allProducts.forEach(p => {
            if (p.categoria) {
              catCount[p.categoria] = (catCount[p.categoria] || 0) + 1
            }
          })
        }
        const topCategories = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 3)

        const sumSales = salesData ? salesData.reduce((sum, s) => sum + (Number(s.total) || 0), 0) : 0
        
        setStats({
          activeBusinesses: bCount || 0,
          globalSalesTotal: sumSales,
          totalProducts: pCount || 0,
          expiringBusinesses: eCount || 0,
          latestSales: latestSales || [],
          recentTickets: recentTickets || [],
          topCategories
        })
      } catch (e) {
        console.error(e)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="space-y-6 mt-8 animate-fade-in pb-12">
      
      <div className="flex items-center gap-3 border-b pb-4 border-dashed border-gray-500/30">
        <Activity size={24} className="text-gold-500" />
        <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Inteligencia de Negocio & Salud
        </h2>
      </div>

      {/* Fila 1: KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Métricas Globales Reales */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><Globe size={20} /></div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Métricas Generales</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Empresas Activas</span>
              <span className={`text-2xl font-black font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.activeBusinesses}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ventas Globales Procesadas</span>
              <span className={`text-lg font-bold font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>${stats.globalSalesTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Productos en el Sistema</span>
              <span className={`text-lg font-bold font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.totalProducts.toLocaleString()}</span>
            </div>
            <div className="pt-3 mt-3 border-t border-dashed border-gray-500/30 flex justify-between items-end">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Empresas por Vencer (&le; 5 días)</span>
              <span className="text-lg font-bold font-display text-orange-500">{stats.expiringBusinesses}</span>
            </div>
          </div>
        </div>

        {/* Top Categorías Reales */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gold-500/10 text-gold-500"><Star size={20} /></div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Categorías Más Populares (Global)</h3>
          </div>
          <div className="space-y-4">
            {stats.topCategories.length > 0 ? stats.topCategories.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-gold-500 font-bold">#{idx + 1}</span> {cat[0]}
                </span>
                <span className={`text-xs px-2 py-1 rounded-md border ${isDark ? 'bg-dark-surface border-dark-border text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  {cat[1]} productos
                </span>
              </div>
            )) : (
              <p className="text-sm text-gray-500 italic">Cargando datos o no hay productos suficientes.</p>
            )}
          </div>
        </div>

      </div>

      {/* Fila 2: Ventas y Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Últimas Ventas */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg flex flex-col h-[350px] ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500"><Activity size={20} /></div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Últimas Ventas Procesadas</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Monitoreo global en tiempo real</p>
            </div>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {stats.latestSales.map((sale) => (
              <div key={sale.id} className={`p-3 rounded-xl border flex justify-between items-center ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Venta #{sale.id.split('-')[0]}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(sale.date || sale.created_at).toLocaleString()}</p>
                </div>
                <p className="font-bold text-green-500">${Number(sale.total).toLocaleString()}</p>
              </div>
            ))}
            {stats.latestSales.length === 0 && <p className="text-xs text-gray-500 italic">No hay ventas registradas.</p>}
          </div>
        </div>

        {/* Support Tickets Recientes */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg flex flex-col h-[350px] ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500"><MessageSquare size={20} /></div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tickets de Soporte Recientes</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Estado de solicitudes de la red</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {stats.recentTickets.length === 0 ? (
              <p className="text-center text-sm text-gray-500 mt-10">No hay tickets de soporte.</p>
            ) : (
              stats.recentTickets.map(t => (
                <div key={t.id} className={`p-3 rounded-2xl border text-sm transition-all duration-300
                  ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}
                `}>
                  <div className="flex justify-between items-start mb-1">
                    <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.subject}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${t.status === 'open' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                      {t.status === 'open' ? 'Abierto' : 'Resuelto'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {t.business_name} - {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
