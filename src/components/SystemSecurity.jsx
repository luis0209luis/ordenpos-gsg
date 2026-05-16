import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/AppContext'
import { ShieldCheck, AlertCircle, CheckCircle2, Info, Search } from 'lucide-react'

export default function SystemSecurity({ businesses }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  // Support Tickets State
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')

  useEffect(() => {
    async function fetchLogsAndTickets() {
      setLoadingLogs(true)
      setLoadingTickets(true)
      try {
        const { data: logsData } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100)
        if (logsData) setLogs(logsData)
        
        const { data: ticketsData } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(50)
        if (ticketsData) setTickets(ticketsData)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingLogs(false)
        setLoadingTickets(false)
      }
    }
    fetchLogsAndTickets()
  }, [])

  const handleReplyTicket = async (e) => {
    e.preventDefault()
    if (!replyMessage || !replyingTo) return
    try {
      const { data } = await supabase.from('support_tickets')
        .update({ admin_response: replyMessage, status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', replyingTo.id)
        .select().single()
      
      if (data) {
        setTickets(tickets.map(t => t.id === data.id ? data : t))
        setReplyingTo(null)
        setReplyMessage('')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const getLogIcon = (type) => {
    if (type === 'error') return <AlertCircle size={16} className="text-red-500" />
    if (type === 'success') return <CheckCircle2 size={16} className="text-green-500" />
    return <Info size={16} className="text-blue-500" />
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center gap-3 border-b pb-4 border-dashed border-gray-500/30">
        <ShieldCheck size={24} className="text-blue-500" />
        <h2 className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Soporte y Seguridad
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Logs Viewer */}
        <div className={`p-6 rounded-3xl border flex flex-col h-[500px] ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            Visor de Logs del Sistema
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {loadingLogs ? (
              <p className="text-center text-gray-500 mt-10">Cargando logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">No hay registros en system_logs.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className={`p-3 rounded-xl border text-sm flex gap-3 ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="mt-0.5">{getLogIcon(log.type)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className={`font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{log.action}</span>
                      <span className="text-[10px] text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{log.message}</p>
                    <div className="flex gap-3 mt-2 text-[10px] font-mono text-gray-500">
                      <span>USER: {log.username}</span>
                      <span>BIZ: {log.business_id?.slice(0,8) || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Support Tickets Management */}
        <div className={`p-6 rounded-3xl border flex flex-col h-[500px] ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            Panel de Tickets de Soporte
          </h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Responde y resuelve las dudas de los negocios de la red.
          </p>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {loadingTickets ? (
              <p className="text-center text-gray-500 mt-10">Cargando tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">No hay tickets de soporte.</p>
            ) : (
              tickets.map(t => (
                <div key={t.id} className={`p-4 rounded-xl border ${t.status === 'open' ? 'border-orange-500/30 bg-orange-500/5' : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm">{t.subject}</h4>
                      <p className="text-[10px] text-gray-500">{t.business_name} - {new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'open' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                      {t.status === 'open' ? 'Abierto' : 'Resuelto'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">{t.message}</p>
                  
                  {t.status === 'open' && replyingTo?.id !== t.id && (
                    <button onClick={() => setReplyingTo(t)} className="text-xs font-bold text-blue-500 hover:underline">
                      Responder Ticket
                    </button>
                  )}
                  
                  {t.admin_response && t.status !== 'open' && (
                    <div className="mt-2 p-3 rounded-lg bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800">
                      <p className="text-[10px] font-bold text-blue-500">Tu respuesta:</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{t.admin_response}</p>
                    </div>
                  )}
                  
                  {replyingTo?.id === t.id && (
                    <form onSubmit={handleReplyTicket} className="mt-3 space-y-2 animate-fade-in">
                      <textarea rows="3" required placeholder="Escribe tu respuesta..." value={replyMessage} onChange={e=>setReplyMessage(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-black/50 outline-none focus:border-blue-500" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => {setReplyingTo(null); setReplyMessage('');}} className="flex-1 py-1.5 rounded-lg border border-gray-300 dark:border-dark-border text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">Cancelar</button>
                        <button type="submit" className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500">Enviar y Resolver</button>
                      </div>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
