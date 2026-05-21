import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth, useTheme } from '../context/AppContext'
import { MessageSquare, Plus, CheckCircle2, Clock, X } from 'lucide-react'
import { isValidUUID } from '../utils/uuid'

export default function SupportTickets() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const isDark = theme === 'dark'
  const bid = user?.businessId

  const [tickets, setTickets] = useState([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTickets() {
      if (!isValidUUID(bid)) return
      setLoading(true)
      try {
        const { data } = await supabase.from('support_tickets').select('*').eq('business_id', bid).order('created_at', { ascending: false })
        if (data) setTickets(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadTickets()
  }, [bid])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject || !message) return
    if (!isValidUUID(bid)) return
    try {
      const { data } = await supabase.from('support_tickets').insert({
        business_id: bid,
        business_name: user?.businessName || 'Negocio',
        subject,
        message,
        status: 'open'
      }).select().single()
      
      if (data) {
        setTickets([data, ...tickets])
        setSubject('')
        setMessage('')
        setShowModal(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className={`h-full p-6 lg:p-8 overflow-y-auto ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight flex items-center gap-3">
            <MessageSquare className="text-blue-500" size={32} />
            Soporte Técnico
          </h1>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Crea tickets de soporte para comunicarte con el administrador del sistema.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 flex items-center gap-2 transition-all hover:scale-[1.02]">
          <Plus size={20} /> Nuevo Ticket
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Cargando tickets...</p>
        ) : tickets.length === 0 ? (
          <p className={`text-center py-10 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No has creado ningún ticket de soporte.</p>
        ) : (
          tickets.map(t => (
            <div key={t.id} className={`p-6 rounded-2xl border transition-all ${
              t.status === 'open' 
                ? (isDark ? 'border-blue-500/30 bg-blue-500/5' : 'border-blue-300/60 bg-blue-50/50') 
                : (isDark ? 'border-gray-800 bg-white/5' : 'border-gray-200 bg-gray-50/50')
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>{t.subject}</h3>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${t.status === 'open' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                  {t.status === 'open' ? <><Clock size={14}/> Abierto</> : <><CheckCircle2 size={14}/> Resuelto</>}
                </span>
              </div>
              <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.message}</p>
              
              {t.admin_response && (
                <div className={`mt-4 p-4 rounded-xl border ${isDark ? 'bg-black/20 border-gray-800' : 'bg-white border-gray-200'}`}>
                  <p className="text-xs font-bold text-blue-500 mb-2">Respuesta del Administrador:</p>
                  <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.admin_response}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-xl ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Crear Nuevo Ticket</h2>
              <button onClick={() => setShowModal(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Asunto</label>
                <input required type="text" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Ej. Dificultad con la impresora térmica"
                  className={`w-full p-3 rounded-xl border bg-transparent outline-none focus:border-blue-500 transition-colors
                    ${isDark ? 'border-dark-border text-white' : 'border-gray-200 text-gray-900'}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mensaje detallado</label>
                <textarea required rows="5" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escribe aquí los detalles del inconveniente..."
                  className={`w-full p-3 rounded-xl border bg-transparent outline-none focus:border-blue-500 transition-colors
                    ${isDark ? 'border-dark-border text-white' : 'border-gray-200 text-gray-900'}`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} 
                  className={`flex-1 py-3 rounded-xl border font-bold transition-all hover:bg-opacity-90
                    ${isDark ? 'border-dark-border text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all hover:scale-[1.02]">Enviar Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
