import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme, useSettings } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { Sun, Moon, Bell, Search, Menu, AlertTriangle, Package } from 'lucide-react'

export default function Topbar({ title, onMenuClick }) {
  const { theme, toggleTheme } = useTheme() || {}
  const isDark = theme === 'dark'
  
  const { products = [], getEstimatedStock, supplyItems = [], productRecipes = [] } = useInventory() || {}
  const { settings = {} } = useSettings() || {}
  const navigate = useNavigate()

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef(null)

  // Search State
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  // Click outside to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSearch(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus search input
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const getProductStockLimit = (product) => {
    if (product.inventory_mode === 'recipe' || product.inventory_mode === 'blend') {
      return getEstimatedStock ? (getEstimatedStock(product.id) ?? 0) : 0
    }
    return product.stock_actual ?? 0
  }

  // Returns the supply item that is the bottleneck for a recipe product
  const getBottleneckSupply = (product) => {
    if (product.inventory_mode !== 'recipe') return null
    const recipe = productRecipes.filter(r => r.product_id === product.id)
    if (recipe.length === 0) return null
    let bottleneck = null
    let lowestRatio = Infinity
    for (const r of recipe) {
      const supply = supplyItems.find(s => s.id === r.supply_item_id)
      if (!supply || r.cantidad === 0) continue
      const ratio = supply.stock_actual / r.cantidad
      if (ratio < lowestRatio) {
        lowestRatio = ratio
        bottleneck = { name: supply.nombre, stock: supply.stock_actual, needed: r.cantidad, unit: supply.unidad || 'unid.' }
      }
    }
    return bottleneck
  }

  // Calculate notifications
  const lowStockProducts = (products || []).filter(p => {
    if (p.inventory_mode === 'unlimited') return false
    const currentMinStock = p.stock_minimo ?? settings?.globalMinStock ?? 10
    return getProductStockLimit(p) <= currentMinStock
  })
  const notificationsCount = lowStockProducts.length

  // Calculate search results
  const searchResults = searchQuery.trim() === '' ? [] : (products || []).filter(p => 
    (p.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.categoria || '').toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8)

  return (
    <>
      <header className={`
        h-16 flex items-center justify-between px-4 md:px-6 shrink-0
        border-b transition-colors duration-200 z-30 relative
        ${isDark
          ? 'bg-dark-surface border-dark-border'
          : 'bg-white border-light-border shadow-soft'}
      `}>
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button 
            onClick={onMenuClick}
            className={`md:hidden p-2 rounded-xl transition-all active:scale-95
              ${isDark ? 'text-gray-400 hover:bg-dark-card hover:text-white' : 'text-gray-500 hover:bg-light-surface hover:text-gray-900'}`}>
            <Menu size={24} />
          </button>

          {/* Page title */}
          <div>
            <h2 className={`font-display font-bold text-lg
              ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h2>
            <p className={`hidden md:block text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button id="topbar-search"
            onClick={() => setShowSearch(true)}
            className={`hidden md:flex items-center gap-3 px-3 py-2 rounded-xl transition-all border group
              ${isDark
                ? 'bg-dark-card border-dark-border text-gray-400 hover:text-white hover:border-gray-700'
                : 'bg-light-surface border-light-border text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
            title="Buscar (Ctrl+K)"
          >
            <Search size={16} className="group-hover:text-gold-500 transition-colors" />
            <span className="text-xs font-medium mr-4">Buscar en el sistema...</span>
            <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold border
              ${isDark ? 'bg-dark-surface border-dark-border text-gray-500' : 'bg-white border-light-border text-gray-400'}`}>
              Ctrl K
            </div>
          </button>

          {/* Mobile Search Button */}
          <button onClick={() => setShowSearch(true)}
            className={`md:hidden p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95
              ${isDark
                ? 'text-gray-400 hover:bg-dark-card hover:text-white'
                : 'text-gray-500 hover:bg-light-surface hover:text-gray-900'}`}>
            <Search size={18} />
          </button>

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button id="topbar-notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95
                ${isDark
                  ? 'text-gray-400 hover:bg-dark-card hover:text-white'
                  : 'text-gray-500 hover:bg-light-surface hover:text-gray-900'}
                ${showNotifications ? (isDark ? 'bg-dark-card text-white' : 'bg-light-surface text-gray-900') : ''}
              `}>
              <Bell size={18} />
              {notificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-transparent bg-red-500 animate-pulse" 
                      style={{ borderColor: isDark ? '#0d0d0d' : '#ffffff' }} />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className={`absolute right-0 mt-3 w-80 md:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-fade-in
                ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
                
                <div className={`p-4 border-b flex items-center justify-between
                  ${isDark ? 'border-dark-border bg-dark-card/50' : 'border-light-border bg-gray-50/50'}`}>
                  <h3 className={`font-bold font-display ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Notificaciones
                  </h3>
                  {notificationsCount > 0 && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-md
                      ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                      {notificationsCount} nuevas
                    </span>
                  )}
                </div>
                
                <div className="max-h-[350px] overflow-y-auto scrollbar-hide">
                  {notificationsCount === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                      <Bell size={32} className={`mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        No tienes notificaciones nuevas.
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Estás al día con tu inventario.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 flex flex-col gap-1">
                      {lowStockProducts.map(p => (
                        <div key={p.id} className={`p-3 rounded-xl flex items-start gap-3 transition-colors cursor-default
                          ${isDark ? 'hover:bg-dark-card' : 'hover:bg-gray-50'}`}>
                          <div className={`p-2 rounded-lg shrink-0 mt-0.5
                            ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                            <AlertTriangle size={18} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold line-clamp-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              Stock bajo: {p.nombre}
                            </p>
                            {p.inventory_mode === 'recipe' ? (() => {
                              const bn = getBottleneckSupply(p)
                              return bn ? (
                                <>
                                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Solo se pueden preparar{' '}
                                    <span className={`font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                      ~{getProductStockLimit(p)}
                                    </span>{' '}unidades.
                                  </p>
                                  <p className={`text-xs mt-0.5 flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                    <span>⚠️</span>
                                    <span>
                                      Compra más <span className="font-bold">{bn.name}</span>
                                      {' '}— solo quedan{' '}
                                      <span className="font-bold">{bn.stock} {bn.unit}</span>
                                      {' '}(necesitas {bn.needed} por unidad)
                                    </span>
                                  </p>
                                </>
                              ) : (
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Solo quedan{' '}
                                  <span className={`font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                    ~{getProductStockLimit(p)}
                                  </span>{' '}unidades estimadas.
                                </p>
                              )
                            })() : p.inventory_mode === 'blend' ? (
                              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Solo se pueden preparar{' '}
                                <span className={`font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                  ~{getProductStockLimit(p)}
                                </span>{' '}unidades estimadas.
                              </p>
                            ) : (
                              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Solo quedan{' '}
                                <span className={`font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                  {getProductStockLimit(p)}
                                </span>{' '}unidades en stock.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            id="topbar-theme-toggle"
            onClick={toggleTheme}
            className={`
              p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95
              ${isDark
                ? 'text-gold-400 hover:bg-dark-card border border-dark-border'
                : 'text-gold-600 hover:bg-light-surface border border-light-border'}
            `}
            title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Global Search Modal overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 md:pt-24 px-4 animate-fade-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearch(false)} />
          
          <div className={`relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-slide-in-up
            ${isDark ? 'bg-dark-surface border border-dark-border' : 'bg-white border border-light-border'}`}>
            
            <div className={`flex items-center p-4 border-b
              ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
              <Search className={`mx-3 ${isDark ? 'text-gold-400' : 'text-gold-600'}`} size={24} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar productos por nombre o categoría..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent border-none outline-none text-lg font-medium placeholder-opacity-50
                  ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
              />
              <button onClick={() => setShowSearch(false)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ml-2
                ${isDark ? 'bg-dark-card text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                ESC
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 scrollbar-hide">
              {searchQuery.trim() !== '' && searchResults.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center justify-center opacity-70">
                  <Search size={32} className={`mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No se encontraron resultados para "{searchQuery}"
                  </p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 px-2
                    ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Productos ({searchResults.length})
                  </h4>
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setShowSearch(false)
                        navigate('/inventory', { state: { editProductId: p.id } })
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left border border-transparent
                        ${isDark ? 'hover:bg-dark-card hover:border-white/10' : 'hover:bg-gray-50 hover:border-gray-200'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                          ${isDark ? 'bg-white/5 text-gold-400' : 'bg-black/5 text-gold-600'}`}>
                          <Package size={20} />
                        </div>
                        <div>
                          <p className={`font-semibold text-sm line-clamp-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            {p.nombre}
                          </p>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            {p.inventory_mode === 'unlimited' ? (
                              <span>Ilimitado • {p.categoria}</span>
                            ) : (
                              <span>
                                Stock:{' '}
                                <span className={getProductStockLimit(p) <= 0 ? 'text-red-500 font-bold' : ''}>
                                  {p.inventory_mode === 'recipe' ? `~${getProductStockLimit(p)}` : getProductStockLimit(p)}
                                </span>{' '}
                                • {p.categoria}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className={`font-display font-bold text-sm shrink-0 ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>
                        ${Number(p.precio).toLocaleString('es-CO')}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.trim() === '' && (
                <div className="text-center py-12 flex flex-col items-center justify-center opacity-40">
                  <Package size={48} className={`mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Busca productos en tu catálogo...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
