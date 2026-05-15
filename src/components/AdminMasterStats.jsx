import { useState } from 'react'
import { useTheme, useSettings } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { Activity, Globe, MousePointerClick, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, Server, Star, Bell } from 'lucide-react'

export default function AdminMasterStats() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { feedbacks, deleteFeedback, toggleFeedbackStatus } = useSettings()
  const { products, salesHistory } = useInventory()

  const [notifications, setNotifications] = useState(() => {
    return JSON.parse(localStorage.getItem('ordenpos_master_notifications') || '[]')
  })

  const clearNotifications = () => {
    localStorage.setItem('ordenpos_master_notifications', '[]')
    setNotifications([])
  }

  // --- MOCK DATA PARA INTELIGENCIA DE NEGOCIO ---
  const globalVisits = {
    today: 1245,
    month: 38400,
    conversion: '8.4%' // (Usuarios Registrados / Visitas)
  }

  const appHealth = {
    loadTime: '0.8s',
    errors: 0,
    uptime: '99.9%'
  }

  const moduleHeatmap = [
    { name: 'Punto de Venta (POS)', usage: 75 },
    { name: 'Domicilios', usage: 15 },
    { name: 'Inventario', usage: 8 },
    { name: 'Reportes', usage: 2 }
  ]

  // Top categorías global reales basadas en inventario (mockeando ventas si no hay data)
  const categoryCount = products.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] || 0) + 1
    return acc
  }, {})
  
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="space-y-6 mt-8 animate-fade-in pb-12">
      
      <div className="flex items-center gap-3 border-b pb-4 border-dashed border-gray-500/30">
        <Activity size={24} className="text-gold-500" />
        <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Inteligencia de Negocio & Salud
        </h2>
      </div>

      {/* Fila 1: KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Visitas Globales */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><Globe size={20} /></div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tráfico Global</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Visitas Hoy</span>
              <span className={`text-2xl font-black font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>{globalVisits.today.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Este Mes</span>
              <span className={`text-lg font-bold font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>{globalVisits.month.toLocaleString()}</span>
            </div>
            <div className="pt-3 mt-3 border-t border-dashed border-gray-500/30 flex justify-between items-end">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tasa Conversión</span>
              <span className="text-lg font-bold font-display text-emerald-500">{globalVisits.conversion}</span>
            </div>
          </div>
        </div>

        {/* Top Categorías */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gold-500/10 text-gold-500"><Star size={20} /></div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Top Categorías</h3>
          </div>
          <div className="space-y-4">
            {topCategories.length > 0 ? topCategories.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="text-gold-500 font-bold">#{idx + 1}</span> {cat[0]}
                </span>
                <span className={`text-xs px-2 py-1 rounded-md border ${isDark ? 'bg-dark-surface border-dark-border text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  {cat[1]} prods
                </span>
              </div>
            )) : (
              <p className="text-sm text-gray-500 italic">No hay productos suficientes.</p>
            )}
          </div>
        </div>

        {/* Salud del Sistema */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><Server size={20} /></div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Salud de la App</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tiempo Carga</span>
              <span className="text-sm font-bold font-mono text-blue-500">{appHealth.loadTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Errores de Sistema</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${appHealth.errors === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {appHealth.errors === 0 ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>} {appHealth.errors}
              </span>
            </div>
            <div className="pt-3 mt-3 border-t border-dashed border-gray-500/30 flex justify-between items-center">
              <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Uptime</span>
              <span className="text-sm font-bold font-mono text-emerald-500">{appHealth.uptime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 2: Mapa de Calor y Feedbacks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Heatmap */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg flex flex-col ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500"><MousePointerClick size={20} /></div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Mapa de Calor (Uso de Módulos)</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>¿Qué apartados usan más los clientes?</p>
            </div>
          </div>
          
          <div className="flex-1 space-y-5">
            {moduleHeatmap.map((mod, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{mod.name}</span>
                  <span className={`font-bold ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>{mod.usage}%</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-dark-surface' : 'bg-gray-100'}`}>
                  <div className="h-full bg-gold-gradient rounded-full transition-all duration-1000" style={{ width: `${mod.usage}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-dashed border-gray-500/30 text-xs text-gray-500 italic">
            * Si el inventario tiene bajo uso, deberíamos considerar agregar importación masiva.
          </div>
        </div>

        {/* Feedback Buzón */}
        <div className={`p-6 rounded-3xl border shadow-soft-lg flex flex-col h-[350px] ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500"><MessageSquare size={20} /></div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Mejoras Pendientes</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Buzón de sugerencias de clientes</p>
            </div>
            <span className="ml-auto px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-full transition-all">
              {feedbacks.filter(f => f.status === 'pending').length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {feedbacks.length === 0 ? (
              <p className="text-center text-sm text-gray-500 mt-10">No hay feedback pendiente.</p>
            ) : (
              feedbacks.map(fb => (
                <div key={fb.id} className={`relative p-3 rounded-2xl border text-sm transition-all duration-300 group overflow-hidden
                  ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}
                  ${fb.status === 'done' ? 'opacity-50' : 'opacity-100'}
                `}>
                  <p className={`font-medium leading-relaxed pr-16 transition-all duration-300
                    ${isDark ? 'text-gray-300' : 'text-gray-700'}
                    ${fb.status === 'done' ? 'line-through text-gray-500' : ''}
                  `}>"{fb.text}"</p>
                  <p className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-wider">
                    {new Date(fb.date).toLocaleDateString()} - Reportado por Cliente
                  </p>
                  
                  {/* Hover Actions */}
                  <div className={`absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    ${fb.status === 'done' ? 'opacity-100' : ''}
                  `}>
                    <button 
                      onClick={() => toggleFeedbackStatus(fb.id)}
                      className={`p-1.5 rounded-lg border transition-colors
                        ${fb.status === 'done' 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : isDark ? 'bg-dark-card border-dark-border hover:bg-emerald-500/10 hover:text-emerald-400 text-gray-400' : 'bg-white border-gray-200 hover:bg-emerald-50 hover:text-emerald-500 text-gray-500'}`}
                      title={fb.status === 'done' ? 'Marcar como pendiente' : 'Marcar como listo'}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteFeedback(fb.id)}
                      className={`p-1.5 rounded-lg border transition-colors
                        ${isDark ? 'bg-dark-card border-dark-border hover:bg-red-500/10 hover:text-red-400 text-gray-400' : 'bg-white border-gray-200 hover:bg-red-50 hover:text-red-500 text-gray-500'}`}
                      title="Descartar"
                    >
                      <AlertCircle size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Fila 3: Notificaciones */}
      <div className="grid grid-cols-1 mt-6">
        <div className={`p-6 rounded-3xl border shadow-soft-lg flex flex-col max-h-[350px] ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><Bell size={20} /></div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notificaciones</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avisos de pagos y renovaciones</p>
            </div>
            {notifications.length > 0 && (
              <button onClick={clearNotifications} className="ml-auto text-xs text-red-500 hover:underline">Limpiar</button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-500 mt-10">No hay notificaciones recientes.</p>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`p-3 rounded-2xl border text-sm ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`font-medium ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>{notif.text}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{new Date(notif.date).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
