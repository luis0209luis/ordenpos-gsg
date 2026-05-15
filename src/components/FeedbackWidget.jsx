import { useState } from 'react'
import { useTheme, useSettings } from '../context/AppContext'
import { MessageSquarePlus, X, Send } from 'lucide-react'

export default function FeedbackWidget() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { addFeedback } = useSettings()
  
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addFeedback(text.trim())
    setSent(true)
    setText('')
    setTimeout(() => {
      setIsOpen(false)
      setTimeout(() => setSent(false), 500)
    }, 2000)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Modal / Formulario Flotante */}
      {isOpen && (
        <div className={`mb-4 w-80 p-5 rounded-3xl shadow-2xl border animate-slide-in-up origin-bottom-right
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <MessageSquarePlus size={18} className="text-purple-500" /> 
              Sugerencias
            </h3>
            <button onClick={() => setIsOpen(false)} className={`p-1 rounded-lg transition-colors
              ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-black'}`}>
              <X size={16} />
            </button>
          </div>

          {sent ? (
            <div className="py-8 text-center animate-fade-in">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Send size={20} />
              </div>
              <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>¡Gracias por tu idea!</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>La enviaremos a nuestro equipo de producto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                ¿Qué podríamos mejorar en ORDENPOS para ayudarte a vender más?
              </p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Escribe tu idea o error aquí..."
                rows="4"
                className={`w-full p-3 rounded-xl text-sm outline-none border-2 resize-none transition-colors
                  focus:border-purple-500
                  ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-gray-50 border-gray-200 text-black'}`}
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className={`w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all
                  ${text.trim() 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30 hover:scale-[1.02]' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-dark-card dark:text-gray-600 dark:border dark:border-dark-border'}`}
              >
                Enviar al Equipo <Send size={14} />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Botón Flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95
          ${isOpen 
            ? 'bg-gray-800 text-white hover:bg-gray-900' 
            : 'bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-purple-500/30'}`}
        title="Danos Feedback"
      >
        {isOpen ? <X size={24} /> : <MessageSquarePlus size={24} />}
      </button>

    </div>
  )
}
