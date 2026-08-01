import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-8 bg-gray-800 rounded-3xl border border-gold-500/30 shadow-2xl space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-gold-400">Ocurrió un error inesperado</h2>
            <p className="text-sm text-gray-300">
              {this.state.error?.message || 'Ha ocurrido un problema al renderizar este módulo.'}
            </p>
            <div className="pt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="w-full py-3 bg-gold-gradient text-black font-bold text-sm rounded-2xl shadow-gold-md hover:scale-105 transition-all"
              >
                Cargar de Nuevo
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                }}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-xs font-semibold rounded-xl transition-all"
              >
                Intentar Continuar
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
