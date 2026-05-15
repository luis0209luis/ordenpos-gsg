import { useState, useMemo } from 'react'
import { useTheme, useAuth } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { createPortal } from 'react-dom'
import {
  Truck, Package, CheckCircle2, Clock, MapPin, User,
  ChevronDown, X, Bike, ReceiptText, Trash2
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Configuración de estados ────────────────────────────────────────────────
const STATUSES = [
  { key: 'Pendiente',   label: 'Pendiente',    color: 'amber',   icon: Clock        },
  { key: 'En Camino',   label: 'En Camino',    color: 'blue',    icon: Bike         },
  { key: 'Entregado',   label: 'Entregado',    color: 'emerald', icon: CheckCircle2 },
  { key: 'Cancelado',   label: 'Cancelado',    color: 'red',     icon: X            },
]

const STATUS_STYLES = {
  Pendiente: {
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    dot:   'bg-amber-400',
  },
  'En Camino': {
    badge: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400',
    dot:   'bg-blue-400 animate-pulse',
  },
  Entregado: {
    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    dot:   'bg-emerald-400',
  },
  Cancelado: {
    badge: 'bg-red-500/15 border-red-500/30 text-red-500',
    dot:   'bg-red-400',
  },
}

function formatCOP(value) {
  return Math.round(Number(value) || 0).toLocaleString('es-CO')
}

function StatusDropdown({ currentStatus, saleId, onUpdate, isDark }) {
  const [open, setOpen] = useState(false)
  const styles = STATUS_STYLES[currentStatus] || STATUS_STYLES['Pendiente']

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02]
          ${styles.badge}`}
      >
        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
        {currentStatus || 'Pendiente'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute right-0 top-full mt-2 z-[99999] rounded-xl shadow-2xl border overflow-hidden min-w-[160px]
              ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}
          >
            {STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => { onUpdate(saleId, s.key); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-left transition-colors
                  ${s.key === currentStatus
                    ? (isDark ? 'bg-gold-500/10 text-gold-400' : 'bg-gold-50 text-gold-700')
                    : (isDark ? 'hover:bg-dark-surface text-gray-300' : 'hover:bg-gray-50 text-gray-700')}`}
              >
                <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[s.key]?.dot}`} />
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Deliveries() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const isDark = theme === 'dark'
  const { salesHistory, updateDeliveryStatus, deleteSale } = useInventory()

  const [filter, setFilter] = useState('Pendiente')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Solo ventas con domicilio, más recientes primero
  const deliveries = useMemo(() =>
    salesHistory
      .filter(s => s.isDelivery)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [salesHistory]
  )

  const filtered = useMemo(() => {
    if (filter === 'Todos') return deliveries
    return deliveries.filter(d => (d.deliveryStatus || 'Pendiente') === filter)
  }, [deliveries, filter])

  // Contadores por estado
  const counts = useMemo(() => {
    const c = { Todos: deliveries.length }
    STATUSES.forEach(s => {
      c[s.key] = deliveries.filter(d => (d.deliveryStatus || 'Pendiente') === s.key).length
    })
    return c
  }, [deliveries])

  return (
    <div className="space-y-6 animate-fade-in pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`p-6 rounded-3xl shadow-soft-lg border flex flex-col md:flex-row items-start md:items-center justify-between gap-4
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gold-500/10 text-gold-500">
            <Truck size={24} />
          </div>
          <div>
            <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Panel de Domicilios
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {deliveries.length} pedidos en total · Gestión de estados en tiempo real
            </p>
          </div>
        </div>

        {/* KPI pills */}
        <div className="flex flex-wrap gap-2">
          {[...STATUSES, { key: 'Todos', label: 'Todos', color: 'gray' }].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                ${filter === s.key
                  ? 'bg-gold-gradient text-black border-transparent shadow-gold-sm'
                  : (isDark ? 'bg-dark-card border-dark-border text-gray-400 hover:text-white' : 'bg-light-surface border-light-border text-gray-600 hover:text-gray-900')}`}
            >
              {s.key !== 'Todos' && <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[s.key]?.dot}`} />}
              {s.label ?? s.key}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black
                ${filter === s.key ? 'bg-black/20' : (isDark ? 'bg-dark-surface text-gray-400' : 'bg-gray-200 text-gray-600')}`}>
                {counts[s.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Listado ────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className={`p-16 rounded-3xl border flex flex-col items-center gap-4 text-center
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <Package size={48} className={isDark ? 'text-gray-700' : 'text-gray-300'} />
          <p className={`font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            No hay pedidos de domicilio {filter !== 'Todos' ? `con estado "${filter}"` : 'registrados'}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(delivery => {
            const status = delivery.deliveryStatus || 'Pendiente'
            const styles = STATUS_STYLES[status] ?? STATUS_STYLES['Pendiente']
            const dd = delivery.deliveryData || {}

            return (
              <div
                key={delivery.id}
                className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-soft
                  ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}
              >
                {/* Cabecera: ID + estado */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Orden
                    </span>
                    <p className={`font-display font-bold text-lg leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      #{delivery.id.slice(-6)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDropdown
                      currentStatus={status}
                      saleId={delivery.id}
                      onUpdate={updateDeliveryStatus}
                      isDark={isDark}
                    />
                    {(user?.role === 'admin' || user?.role === 'Superadmin') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirm(delivery.id);
                        }}
                        className={`p-1.5 rounded-lg border transition-all hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 relative z-10
                          ${isDark ? 'bg-dark-card border-dark-border text-gray-400' : 'bg-white border-light-border text-gray-500'}`}
                        title="Eliminar Domicilio"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Fecha */}
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  🕐 {format(parseISO(delivery.date), "d 'de' MMMM · HH:mm", { locale: es })}
                </p>

                {/* Datos del cliente */}
                <div className={`p-3 rounded-xl space-y-1.5 ${isDark ? 'bg-dark-card' : 'bg-gray-50'}`}>
                  {dd.name && (
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-gold-500 shrink-0" />
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {dd.name}
                      </span>
                    </div>
                  )}
                  {dd.address && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-gold-500 shrink-0 mt-1" />
                        <span className={`text-sm font-bold leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {dd.address}
                        </span>
                      </div>
                      <a 
                        href={`https://waze.com/ul?q=${encodeURIComponent(dd.address + ', Barranquilla')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-400 ml-5 flex items-center gap-1"
                      >
                        📍 Abrir en Waze / Maps
                      </a>
                    </div>
                  )}
                  {dd.details && (
                    <div className={`mt-2 p-2.5 rounded-lg text-xs font-semibold leading-relaxed
                      ${isDark ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                      <span className="uppercase tracking-wider text-[10px] opacity-70 block mb-0.5">Observaciones de Entrega:</span>
                      {dd.details}
                    </div>
                  )}
                  {dd.distance && (
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                      📍 {dd.distance} km
                    </span>
                  )}
                </div>

                {/* Artículos */}
                <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ReceiptText size={12} className="text-gold-500" />
                    <span className="font-semibold uppercase tracking-wider">Pedido</span>
                  </div>
                  {delivery.items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantity}× {item.nombre}</span>
                      <span className="font-semibold">${formatCOP(item.precio * item.quantity)}</span>
                    </div>
                  ))}
                  {dd.fee > 0 && (
                    <div className={`flex justify-between pt-1 border-t font-semibold
                      ${isDark ? 'border-dark-border text-gold-400' : 'border-gray-200 text-gold-600'}`}>
                      <span><Truck size={10} className="inline mr-1" />Domicilio</span>
                      <span>${formatCOP(dd.fee)}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className={`flex justify-between items-center pt-3 border-t font-display
                  ${isDark ? 'border-dark-border' : 'border-gray-100'}`}>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Total
                  </span>
                  <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ${formatCOP(delivery.total)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal de Confirmación de Eliminación ────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setDeleteConfirm(null)}>
          <div 
            className={`p-6 rounded-3xl shadow-2xl max-w-sm w-full border ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Eliminar Domicilio
              </h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                ¿Está seguro de eliminar este pedido? Esta acción <strong className="text-red-500">restaurará</strong> los productos al inventario y no se puede deshacer.
              </p>
              
              <div className="flex w-full gap-3 mt-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${isDark ? 'bg-dark-card hover:bg-gray-800 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    deleteSale(deleteConfirm);
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/30"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
