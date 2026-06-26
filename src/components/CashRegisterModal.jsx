import { useState } from 'react'
import { useTheme } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { useCashRegister } from '../context/CashRegisterContext'
import { parseISO } from 'date-fns'
import { DollarSign, Lock, X, CheckCircle2 } from 'lucide-react'

// ─── MODAL DE APERTURA ────────────────────────────────────────────────────────
function OpeningModal({ isDark, onOpen }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || Number(amount) < 0) { setError('Ingresa un monto válido.'); return }
    setLoading(true)
    const res = await onOpen(Number(amount))
    if (!res.success) { setError(res.error || 'Error al abrir caja.'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden animate-scale-in
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-gradient flex items-center justify-center mx-auto mb-4 shadow-gold-md">
            <DollarSign size={32} className="text-black" />
          </div>
          <h2 className={`font-display font-black text-2xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Apertura de Caja
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Ingresa el monto inicial en efectivo para comenzar el turno.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Monto Inicial en Caja ($)
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>$</span>
              <input
                type="number"
                min="0"
                step="100"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError('') }}
                placeholder="0"
                autoFocus
                className={`w-full pl-8 pr-4 py-4 rounded-2xl outline-none border-2 text-xl font-bold transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
            </div>
            {error && (
              <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                ⚠️ {error}
              </p>
            )}
          </div>

          <div className={`p-4 rounded-2xl border text-xs ${isDark ? 'bg-dark-card border-dark-border text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            💡 Este monto representa el efectivo físico disponible al inicio del turno. Se usará para calcular la diferencia al cerrar caja.
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gold-gradient text-dark-bg shadow-gold-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            {loading ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL DE CIERRE ─────────────────────────────────────────────────────────
function ClosingModal({ isDark, onClose, onCancel, currentRegister }) {
  const { salesHistory = [] } = useInventory() || {}

  // Ventas del turno (desde que se abrió la caja)
  const openedAt = currentRegister?.opened_at ? parseISO(currentRegister.opened_at) : null
  const turnoSales = openedAt
    ? salesHistory.filter(s => new Date(s.date) >= openedAt)
    : salesHistory

  const paymentTotals = turnoSales.reduce((acc, s) => {
    const method = s.paymentMethod || 'Efectivo'
    if (!acc[method]) acc[method] = 0
    acc[method] += Number(s.total) || 0
    return acc
  }, { Efectivo: 0, Nequi: 0, Transferencia: 0, Otros: 0 })

  const totalSystem = turnoSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
  const expectedCash = (Number(currentRegister?.opening_amount) || 0) + (paymentTotals.Efectivo || 0)

  const [physicalCash, setPhysicalCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const difference = physicalCash !== '' ? Number(physicalCash) - expectedCash : null

  const handleClose = async (e) => {
    e.preventDefault()
    if (physicalCash === '') { setError('Ingresa el efectivo contado.'); return }
    setLoading(true)
    const res = await onClose({
      closingPhysical: Number(physicalCash),
      systemTotal: totalSystem,
      notes
    })
    if (!res.success) { setError(res.error || 'Error al cerrar caja.'); setLoading(false) }
  }

  const fmt = (n) => Math.round(n || 0).toLocaleString('es-CO')

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden animate-scale-in my-4
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-dark-border bg-dark-card' : 'border-light-border bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Lock size={20} className="text-red-500" />
            </div>
            <div>
              <h2 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Cierre de Caja</h2>
              <p className="text-xs text-gray-500">
                Abierta por {currentRegister?.opened_by} · {openedAt ? openedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-dark-surface text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleClose} className="p-6 space-y-5">

          {/* Resumen del sistema */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
            <div className={`px-4 py-2.5 border-b text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-dark-card border-dark-border text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              Resumen del Sistema (Turno)
            </div>
            <div className={`divide-y ${isDark ? 'divide-dark-border' : 'divide-light-border'}`}>
              {[
                { label: '💵 Efectivo', value: paymentTotals.Efectivo || 0 },
                { label: '📱 Nequi', value: paymentTotals.Nequi || 0 },
                { label: '🏦 Transferencia', value: paymentTotals.Transferencia || 0 },
                { label: '📝 Otros', value: (paymentTotals.Otros || 0) + Object.entries(paymentTotals).filter(([k]) => !['Efectivo','Nequi','Transferencia','Otros'].includes(k)).reduce((s,[,v]) => s+v, 0) },
              ].map(({ label, value }) => (
                <div key={label} className={`flex justify-between items-center px-4 py-2.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span>{label}</span>
                  <span className="font-bold">${fmt(value)}</span>
                </div>
              ))}
              <div className={`flex justify-between items-center px-4 py-3 font-bold text-sm ${isDark ? 'bg-dark-card text-white' : 'bg-gray-50 text-gray-900'}`}>
                <span>Total Ventas del Turno</span>
                <span className="text-gold-500 text-base">${fmt(totalSystem)}</span>
              </div>
            </div>
          </div>

          {/* Monto esperado */}
          <div className={`flex justify-between items-center px-4 py-3 rounded-2xl border text-sm font-semibold
            ${isDark ? 'bg-dark-card border-dark-border text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
            <span>🎯 Efectivo esperado en caja</span>
            <span className={`font-bold text-base ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>${fmt(expectedCash)}</span>
          </div>

          {/* Conteo físico */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Efectivo Contado Físicamente ($)
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>$</span>
              <input
                type="number"
                min="0"
                step="100"
                value={physicalCash}
                onChange={e => { setPhysicalCash(e.target.value); setError('') }}
                placeholder="0"
                autoFocus
                className={`w-full pl-8 pr-4 py-4 rounded-2xl outline-none border-2 text-xl font-bold transition-all focus:border-gold-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
              />
            </div>
          </div>

          {/* Diferencia en tiempo real */}
          {difference !== null && (
            <div className={`flex justify-between items-center px-4 py-3 rounded-2xl border font-bold text-sm transition-all
              ${difference >= 0
                ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                : (isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700')}`}>
              <span>{difference >= 0 ? '✅ Sobrante' : '⚠️ Faltante'}</span>
              <span className="text-base">{difference >= 0 ? '+' : ''}${fmt(Math.abs(difference))}</span>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Observaciones (opcional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Hubo un faltante de $5.000 por error de vueltas..."
              rows={2}
              className={`w-full px-4 py-3 rounded-2xl outline-none border-2 text-sm resize-none transition-all focus:border-gold-500
                ${isDark ? 'bg-dark-card border-dark-border text-white placeholder-gray-600' : 'bg-light-surface border-light-border text-gray-900 placeholder-gray-400'}`}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel}
              className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || physicalCash === ''}
              className="flex-1 py-3 rounded-2xl font-bold text-sm bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> : <Lock size={16} />}
              {loading ? 'Cerrando...' : 'Cerrar Caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────
export default function CashRegisterModal({ mode, onCancel }) {
  const { theme } = useTheme() || {}
  const isDark = theme === 'dark'
  const { openCashRegister, closeCashRegister, currentRegister } = useCashRegister()

  if (mode === 'open') {
    return <OpeningModal isDark={isDark} onOpen={openCashRegister} />
  }
  if (mode === 'close') {
    return <ClosingModal isDark={isDark} onClose={closeCashRegister} onCancel={onCancel} currentRegister={currentRegister} />
  }
  return null
}
