import { useState, useEffect, useRef } from 'react'
import { useTheme, useSettings } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { getSmartImage } from '../utils/imageHelper'
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Receipt, X, Printer, Edit2, Truck, Smartphone } from 'lucide-react'
import DeliveryModule from '../components/DeliveryModule'
import TicketGenerator, { generateRawTicket } from '../components/TicketGenerator'

export default function POS() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { products, processSale } = useInventory()
  const { settings, staff } = useSettings()

  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  
  // Delivery State
  const [isDelivery, setIsDelivery] = useState(false)
  const [deliveryData, setDeliveryData] = useState({ name: '', address: '', distance: null, fee: 0, suggestedFee: 0, confirmed: false })
  
  // Checkout & Ticket State
  // Checkout & Ticket State
  const [finishedSale, setFinishedSale] = useState(null)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  const categories = ['Todas', ...new Set(products.map(p => p.categoria))]

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todas' || p.categoria === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock_actual) return prev
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      if (product.stock_actual <= 0) return prev
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta
        const product = products.find(p => p.id === id)
        if (newQ > 0 && newQ <= product.stock_actual) {
          return { ...item, quantity: newQ }
        }
        if (newQ <= 0) return { ...item, quantity: 0 }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  // Calculate Totals — redondeados al entero más cercano
  const subtotal    = Math.round(cart.reduce((acc, item) => acc + (item.precio * item.quantity), 0))
  const deliveryFee = isDelivery && deliveryData.confirmed ? Math.round(deliveryData.fee) : 0
  const total       = Math.round(subtotal + deliveryFee)

  const hasPreparador = staff.some(s => s.role === 'PREPARADOR')

  const handleProcessSale = () => {
    if (cart.length === 0) return
    if (isDelivery && (!deliveryData.confirmed || !deliveryData.address)) return
    
    // If there is a Preparador, we send it to kitchen as 'pending'. Otherwise, null.
    const kitchenStatus = hasPreparador ? 'pending' : null
    
    // Process sale and get the record for tickets
    const saleRecord = processSale(cart, total, isDelivery ? deliveryData : null, kitchenStatus)
    
    // Show tickets modal
    setFinishedSale(saleRecord)
    
    // Clear cart
    setCart([])
    setIsDelivery(false)
    setDeliveryData({ name: '', address: '', distance: null, fee: 0, suggestedFee: 0, confirmed: false })
    setMobileCartOpen(false)
  }

  const handleBluetoothPrint = () => {
    if (!finishedSale) return
    const rawText = generateRawTicket(finishedSale, settings)
    const base64Data = btoa(unescape(encodeURIComponent(rawText)))
    window.location.href = `rawbt:data:text/plain;base64,${base64Data}`
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] animate-fade-in relative">
      
      {/* Left Column: Products */}
      <div className={`flex-1 flex flex-col rounded-3xl overflow-hidden shadow-soft-lg border
        ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
        
        {/* Search & Categories */}
        <div className={`p-6 border-b ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
          <div className="relative mb-4 flex gap-4">
            <div className="relative flex-1">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none
                ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Buscar productos en caja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-11 pr-4 py-4 md:py-3.5 rounded-2xl text-base md:text-sm font-medium outline-none border-2 transition-all
                  focus:border-gold-500 focus:shadow-gold-sm
                  ${isDark ? 'bg-dark-card border-dark-border text-white placeholder-gray-600' 
                           : 'bg-light-surface border-light-border text-gray-900 placeholder-gray-400'}`}
              />
            </div>
            
            <button
              onClick={() => setIsDelivery(!isDelivery)}
              className={`px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2 border-2 transition-all shrink-0
                ${isDelivery 
                  ? 'bg-gold-500 border-gold-500 text-black shadow-gold-sm' 
                  : (isDark ? 'bg-dark-card border-dark-border text-gray-400 hover:text-white' : 'bg-light-surface border-light-border text-gray-500 hover:text-gray-900')}`}
            >
              <Truck size={18} /> ¿Es Domicilio?
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-3 md:py-2 min-h-[44px] rounded-xl text-sm font-semibold transition-all whitespace-nowrap border
                  ${selectedCategory === cat
                    ? 'bg-gold-gradient text-dark-bg border-transparent shadow-gold-sm'
                    : isDark 
                      ? 'bg-dark-card border-dark-border text-gray-400 hover:text-white hover:border-gold-500/50' 
                      : 'bg-light-surface border-light-border text-gray-600 hover:text-gray-900 hover:border-gold-400/50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          
          <DeliveryModule 
            isDelivery={isDelivery}
            deliveryData={deliveryData}
            setDeliveryData={setDeliveryData}
            isDark={isDark}
            settings={settings}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const currentMinStock = product.stock_minimo !== undefined && product.stock_minimo !== null 
                ? product.stock_minimo : settings.globalMinStock
              const outOfStock = product.stock_actual <= 0
              const isLowStock = product.stock_actual <= currentMinStock && !outOfStock
              const imgInfo = getSmartImage(product.nombre, product.image)

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={outOfStock}
                  className={`relative rounded-2xl border text-left transition-all duration-200 group flex flex-col h-full overflow-hidden
                    ${outOfStock ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02]'}
                    ${isDark 
                      ? 'bg-dark-card border-dark-border hover:border-gold-500/50 hover:shadow-gold-sm' 
                      : 'bg-white border-light-border hover:border-gold-400/50 hover:shadow-soft'}`}
                >
                  {/* Image Section */}
                  <div className={`relative w-full h-32 shrink-0 ${isDark ? 'bg-black/40' : 'bg-gray-100'} overflow-hidden`}>
                    <img src={imgInfo.url} alt={product.nombre} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${imgInfo.isReference && !imgInfo.isFallback ? 'brightness-90' : ''} ${imgInfo.isFallback ? 'object-contain p-8 opacity-40 grayscale' : ''}`} />
                    
                    {/* Dark overlay for reference images to ensure readability if text was placed over it, but we place text below. Still adds a premium feel. */}
                    {imgInfo.isReference && !imgInfo.isFallback && (
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    )}

                    <span className={`absolute top-2 right-2 text-[10px] whitespace-nowrap font-bold px-2 py-0.5 rounded-md border backdrop-blur-md shadow-sm
                      ${outOfStock 
                        ? (isDark ? 'bg-gold-500/80 border-gold-500/30 text-black' : 'bg-gold-100/90 border-gold-300 text-gold-900')
                        : isLowStock 
                          ? (isDark ? 'bg-orange-500/80 border-orange-500/30 text-black' : 'bg-orange-100/90 border-orange-300 text-orange-900')
                          : (isDark ? 'bg-black/60 border-white/20 text-white' : 'bg-white/90 border-gray-300 text-gray-800')}`}>
                      Stock: {product.stock_actual}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <div className="mb-1">
                      <span className={`text-[10px] uppercase font-bold tracking-wider
                        ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {product.categoria}
                      </span>
                      <h3 className={`font-semibold line-clamp-2 leading-tight mt-0.5
                        ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {product.nombre}
                      </h3>
                    </div>
                    <div className="mt-auto pt-2 w-full">
                      <span className={`font-display font-bold text-lg block break-all
                        ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>
                        ${Number(product.precio).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Cart */}
      <div className={`
        ${mobileCartOpen ? 'fixed inset-0 z-50 p-4 bg-black/60 backdrop-blur-md flex flex-col justify-end' : 'hidden'} 
        lg:flex lg:static lg:w-96 shrink-0 lg:p-0 lg:bg-transparent lg:z-auto
      `}>
        <div className={`w-full flex flex-col shadow-soft-lg border relative overflow-hidden transition-all duration-300
          ${mobileCartOpen ? 'h-[85vh] rounded-3xl' : 'h-full lg:rounded-3xl'}
          ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
          
          <div className={`p-4 md:p-6 border-b flex items-center justify-between
            ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
            <div className="flex items-center gap-2">
              <ShoppingCart className={isDark ? 'text-gold-400' : 'text-gold-600'} />
              <h2 className={`font-display font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Orden Actual
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border
                ${isDark ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'bg-gold-50 border-gold-200 text-gold-700'}`}>
                {cart.length} items
              </span>
              {mobileCartOpen && (
                <button onClick={() => setMobileCartOpen(false)} className={`lg:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors
                  ${isDark ? 'bg-dark-card text-white hover:bg-white/10' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
              <Receipt size={48} className={`mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                El carrito está vacío. <br/> Seleccione productos para comenzar.
              </p>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className={`p-3 rounded-2xl border flex gap-3
                  ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm line-clamp-1 mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.nombre}
                    </h4>
                    <div className={`font-display font-bold text-sm ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>
                      ${Number(item.precio).toLocaleString('es-CO')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center rounded-xl border p-1
                      ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-light-surface border-light-border'}`}>
                      <button onClick={() => updateQuantity(item.id, -1)} className={`min-h-[40px] min-w-[40px] md:min-h-[32px] md:min-w-[32px] flex items-center justify-center rounded-lg transition-colors
                        ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white' : 'hover:bg-white text-gray-500 hover:text-gray-900'}`}>
                        <Minus size={16} />
                      </button>
                      <span className={`w-6 text-center text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {item.quantity}
                      </span>
                      <button onClick={() => updateQuantity(item.id, 1)} className={`min-h-[40px] min-w-[40px] md:min-h-[32px] md:min-w-[32px] flex items-center justify-center rounded-lg transition-colors
                        ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white' : 'hover:bg-white text-gray-500 hover:text-gray-900'}`}>
                        <Plus size={16} />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors
                      ${isDark ? 'hover:bg-red-500/10 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {isDelivery && deliveryFee > 0 && (
                <div className={`p-3 rounded-2xl border flex gap-3
                  ${isDark ? 'bg-gold-500/10 border-gold-500/30' : 'bg-gold-50 border-gold-300'}`}>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <Truck size={14} className="text-gold-500" /> Servicio de Domicilio
                    </h4>
                  </div>
                  <div className={`font-display font-bold text-sm self-center ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>
                    ${deliveryFee.toLocaleString('es-CO')}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Total & Checkout */}
        <div className={`p-6 border-t ${isDark ? 'border-dark-border bg-dark-card' : 'border-light-border bg-light-surface'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Subtotal</span>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>${subtotal.toLocaleString('es-CO')}</span>
          </div>
          {isDelivery && (
            <div className="flex justify-between items-center mb-2">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Servicio de Domicilio</span>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>${deliveryFee.toLocaleString('es-CO')}</span>
            </div>
          )}
          <div className={`flex justify-between items-center pt-4 mb-6 border-t ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
            <span className={`text-sm font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Total
            </span>
            <span className={`font-display font-black text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ${total.toLocaleString('es-CO')}
            </span>
          </div>
          
          <button
            onClick={handleProcessSale}
            disabled={cart.length === 0 || (isDelivery && !deliveryData.confirmed)}
            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2
              transition-all duration-300
              ${cart.length > 0 && (!isDelivery || deliveryData.confirmed)
                ? 'bg-gold-gradient text-dark-bg shadow-gold-md hover:shadow-gold-lg hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-gray-500/20 text-gray-500 cursor-not-allowed border border-dashed border-gray-500/30'}`}
          >
            <CheckCircle2 size={20} />
            Procesar e Imprimir
          </button>
        </div>
      </div>
      </div>

      {/* TICKET MODAL */}
      {finishedSale && (
        <>
        <TicketGenerator sale={finishedSale} settings={settings} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setFinishedSale(null)} />
          
          <div className="relative z-10 w-full max-w-md mx-auto flex flex-col gap-6 animate-slide-in-up">
            
            {/* Auto-print logic */}
            {(() => {
              if (finishedSale && !hasPreparador && !finishedSale.autoPrinted) {
                finishedSale.autoPrinted = true;
                setTimeout(() => window.print(), 300);
              }
              return null;
            })()}

            {/* Botón de cerrar */}
            <button onClick={() => setFinishedSale(null)} className="absolute -top-12 right-0 p-2 text-white hover:text-gold-400 transition-colors">
              <X size={32} />
            </button>

            {/* TICKET CLIENTE */}
            <div className="flex-1 bg-white p-6 rounded-sm shadow-2xl relative font-mono text-black">
              <div className="absolute top-0 left-0 right-0 h-2 bg-ticket-edge" />
              
              <div className="text-center mb-6 pt-4 border-b-2 border-dashed border-gray-300 pb-4">
                <h2 className="text-xl font-bold uppercase">{settings.businessName}</h2>
                
                <p className="text-xs text-gray-500 mt-1">{settings.address}</p>
                {settings.taxId && <p className="text-xs text-gray-500">ID: {settings.taxId}</p>}
                
                {finishedSale.isDelivery ? (
                  <div className="my-3 py-2 bg-black text-white rounded font-bold uppercase tracking-widest">
                    ORDEN DE DOMICILIO
                  </div>
                ) : (
                  <p className="text-sm font-bold mt-3 uppercase">TICKET DE COMPRA</p>
                )}
                <p className="text-xs mt-1">Orden #{finishedSale.id.slice(-6)}</p>
              </div>

              {finishedSale.isDelivery && (
                <div className="mb-6 p-3 border-2 border-black rounded-md text-sm">
                  <p className="font-bold mb-2 border-b border-gray-300 pb-1">DATOS DE ENTREGA</p>
                  <p className="uppercase"><span className="font-bold">Cliente:</span> {finishedSale.deliveryData.name}</p>
                  <p className="uppercase"><span className="font-bold">Dirección:</span> {finishedSale.deliveryData.address}</p>
                </div>
              )}

              <div className="space-y-2 mb-6 border-b-2 border-dashed border-gray-300 pb-4">
                {finishedSale.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.nombre}</span>
                    <span>${(item.precio * item.quantity).toLocaleString('es-CO')}</span>
                  </div>
                ))}
                {finishedSale.isDelivery && (
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-gray-200">
                    <span>Servicio de Domicilio</span>
                    <span>${finishedSale.deliveryData.fee.toLocaleString('es-CO')}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-lg font-bold mb-8">
                <span>TOTAL</span>
                <span>${finishedSale.total.toLocaleString('es-CO')}</span>
              </div>

              <div className="text-center text-xs text-gray-500">
                <p>{settings.footerMessage}</p>
              </div>
            </div>

            {/* Overlay Print Action */}
            <div className="absolute -bottom-20 left-0 right-0 flex flex-wrap justify-center gap-3">
              <button onClick={() => window.print()} className="px-5 py-3 rounded-xl bg-gold-gradient text-black font-bold uppercase flex items-center gap-2 hover:scale-105 transition-transform">
                <Printer size={18} /> Normal
              </button>
              <button onClick={handleBluetoothPrint} className="px-5 py-3 rounded-xl bg-blue-500 text-white font-bold uppercase flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <Smartphone size={18} /> Bluetooth
              </button>
              <button onClick={() => setFinishedSale(null)} className="px-5 py-3 rounded-xl bg-white text-black font-bold uppercase hover:bg-gray-200 transition-colors">
                Cerrar
              </button>
            </div>

          </div>
        </div>
        </>
      )}
      
      {/* Mobile Sticky Bottom Bar */}
      {cart.length > 0 && !mobileCartOpen && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 animate-slide-in-up">
          <button 
            onClick={() => setMobileCartOpen(true)}
            className="w-full bg-gold-gradient text-dark-bg min-h-[56px] px-6 rounded-2xl shadow-gold-xl font-bold flex justify-between items-center"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <span>Ver Orden ({cart.length} items)</span>
            </div>
            <span className="text-lg">Total: ${total.toLocaleString('es-CO')}</span>
          </button>
        </div>
      )}
      
    </div>
  )
}
