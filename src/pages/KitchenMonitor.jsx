import React from 'react'
import { useInventory } from '../context/InventoryContext'
import { useTheme } from '../context/AppContext'
import { CheckCircle, Clock } from 'lucide-react'
import { getPaddedTurnNumber } from '../utils/turnHelper'

export default function KitchenMonitor() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { salesHistory, updateKitchenStatus } = useInventory()

  const pendingOrders = (salesHistory || []).filter(sale => sale?.kitchenStatus === 'pending')

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in relative">
      <div className={`p-6 rounded-3xl shadow-soft-lg border mb-6 flex items-center justify-between
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
        <div>
          <h2 className={`font-display font-bold text-2xl flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Clock className="text-gold-500" />
            Monitor de Órdenes (Cocina)
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Pedidos en preparación
          </p>
        </div>
        <div className={`px-4 py-2 rounded-xl text-sm font-bold border
          ${isDark ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'bg-gold-50 border-gold-200 text-gold-700'}`}>
          {pendingOrders.length} Pendientes
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pendingOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
            <CheckCircle size={64} className={`mb-4 ${isDark ? 'text-emerald-500/50' : 'text-emerald-400'}`} />
            <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Todo al día</h3>
            <p className={`font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No hay pedidos pendientes en preparación.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingOrders.map(order => (
              <div key={order.id} className={`flex flex-col rounded-3xl overflow-hidden shadow-soft-lg border transition-all hover:border-gold-500/50
                ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
                
                <div className={`p-4 border-b flex justify-between items-center
                  ${isDark ? 'border-dark-border bg-dark-surface' : 'border-light-border bg-gray-50'}`}>
                  <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Orden #{getPaddedTurnNumber(order, salesHistory)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-bold
                    ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                    {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="p-6 flex-1">
                  <ul className="space-y-4">
                    {order.items.map(item => (
                      <li key={item.id} className="flex justify-between items-start gap-4">
                        <span className={`font-bold text-xl ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>
                          {item.quantity}x
                        </span>
                        <span className={`flex-1 font-semibold text-lg leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {item.nombre}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {order.isDelivery && (
                    <div className={`mt-6 p-4 rounded-xl text-sm border
                      ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                      <div className={`font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                        Pedido para Domicilio
                      </div>
                      {order.deliveryData?.address && (
                        <div className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className="font-bold uppercase tracking-wider text-[10px] opacity-70">Dirección:</span><br/>
                          <span className="font-bold text-sm">{order.deliveryData.address}</span>
                        </div>
                      )}
                      {order.deliveryData?.details && (
                        <div className={`mt-3 p-2 rounded-lg text-xs font-semibold
                          ${isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                          <span className="uppercase tracking-wider text-[10px] opacity-80 block mb-0.5">Empaque / Detalles:</span>
                          {order.deliveryData.details}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => {
                      updateKitchenStatus(order?.id, 'ready')
                      // Toast notification check could be added here
                      alert(`Orden #${getPaddedTurnNumber(order, salesHistory)} marcada como LISTA.`)
                    }}
                    className="w-full py-5 rounded-2xl font-black text-lg tracking-widest uppercase flex items-center justify-center gap-2 bg-emerald-500 text-white shadow-lg hover:bg-emerald-400 active:scale-95 transition-all"
                  >
                    <CheckCircle size={24} />
                    Listo / Realizado
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
