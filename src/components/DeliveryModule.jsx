import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Truck, MapPin, CheckCircle2, User, X, AlertCircle, TriangleAlert } from 'lucide-react'

// ─── Distancia Real por Carretera (OSRM / API Maps) ────────────────────────
async function getRoadDistance(lat1, lon1, lat2, lon2) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
    const res = await fetch(url)
    if (!res.ok) throw new Error('OSRM HTTP ' + res.status)
    const data = await res.json()
    if (!data.routes || !data.routes.length) throw new Error('Sin ruta de conducción')
    return data.routes[0].distance / 1000 // Convertir metros a km
  } catch (error) {
    console.warn('Fallback a Haversine lineal por fallo en API de rutas', error)
    // Fallback lineal (Haversine) si falla la API de rutas
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}

// ─── Geocodifica con Nominatim — restringido a Colombia ──────────────────────
async function geocode(address, cityHint = '') {
  const fullQuery = cityHint && !address.toLowerCase().includes(cityHint.toLowerCase())
    ? `${address}, ${cityHint}`
    : address

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(fullQuery)}` +
    `&format=json&limit=1&countrycodes=co`

  const res  = await fetch(url, { headers: { 'Accept-Language': 'es' } })
  if (!res.ok) throw new Error('Nominatim HTTP ' + res.status)
  const data = await res.json()
  if (!data.length) throw new Error('Sin resultados para: ' + fullQuery)
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name }
}

function extractCity(address) {
  if (!address) return 'Barranquilla'
  const knownCities = [
    'Barranquilla','Soledad','Malambo','Galapa','Puerto Colombia',
    'Bogotá','Medellín','Cali','Cartagena','Cúcuta','Bucaramanga'
  ]
  for (const city of knownCities) {
    if (address.toLowerCase().includes(city.toLowerCase())) return city
  }
  const parts = address.split(',')
  return parts.length > 1 ? parts[parts.length - 1].trim() : 'Barranquilla'
}

function roundToMil(value) {
  return Math.round(value / 1000) * 1000
}

function formatCOP(value) {
  return Math.round(Number(value) || 0).toLocaleString('es-CO')
}

function ModalPortal({ children }) {
  return createPortal(children, document.body)
}

const TARIFA_MINIMA     = 3000
const DISTANCIA_MAXIMA  = 20

export default function DeliveryModule({ isDelivery, deliveryData, setDeliveryData, isDark, settings }) {
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  const [showModal,     setShowModal]     = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [errorMsg,      setErrorMsg]      = useState('')
  const [localFee,      setLocalFee]      = useState(0)
  const [distWarning,   setDistWarning]   = useState(false)
  const [selectedCity,  setSelectedCity]  = useState('Barranquilla')

  const [addressInput, setAddressInput] = useState(deliveryData.address || '')

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  useEffect(() => {
    if (!addressInput.trim()) return
    const handler = setTimeout(() => {
      handleCalculate(addressInput)
    }, 600)
    return () => clearTimeout(handler)
  }, [addressInput, selectedCity])

  if (!isDelivery) return null

  const openModal = (address, distKm = null, suggestedFee = 0, warning = false) => {
    setDeliveryData(prev => ({ ...prev, address, distance: distKm, suggestedFee, confirmed: false }))
    setLocalFee(suggestedFee)
    setDistWarning(warning)
    setIsCalculating(false)
    setShowModal(true)
  }

  const handleCalculate = async (addrToCalc) => {
    const address = typeof addrToCalc === 'string' ? addrToCalc.trim() : addressInput.trim()
    if (!address) return

    setIsCalculating(true)
    setErrorMsg('')

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    const origin = settings?.address?.trim() || 'Barranquilla, Colombia'

    try {
      const cityHint = selectedCity || extractCity(origin)

      let originCoords = await geocode(origin, cityHint)
      let destCoords = await geocode(address, cityHint)

      const distKmRaw = await getRoadDistance(
        originCoords.lat, originCoords.lon,
        destCoords.lat,   destCoords.lon
      )

      const distKm1dec = parseFloat(distKmRaw.toFixed(1))

      let rawFee = 5000
      
      if (distKmRaw > 3) {
        rawFee += (distKmRaw - 3) * 1500
      }

      if (selectedCity !== 'Barranquilla') {
        rawFee += 4000
      }

      const suggestedFee = roundToMil(rawFee)
      const tooFar = distKmRaw > DISTANCIA_MAXIMA

      // Al no depender de mapas visuales, se puede dejar que el cajero confirme la lat/lng guardada si Nominatim la halló
      const lat = destCoords.lat
      const lng = destCoords.lon

      setDeliveryData(prev => ({ ...prev, address, distance: distKm1dec, suggestedFee, confirmed: true, fee: suggestedFee, lat, lng }))
      setLocalFee(suggestedFee)
      setDistWarning(tooFar)
      setIsCalculating(false)

      if (tooFar) {
        openModal(address, distKm1dec, suggestedFee, true)
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      console.warn('Geocodificación fallida:', err.message)
      setIsCalculating(false)
      // Fallback manual total
      setDeliveryData(prev => ({ ...prev, address, distance: null, suggestedFee: 0, confirmed: false, lat: null, lng: null }))
    }
  }

  const handleConfirm = () => {
    const finalFee = roundToMil(Number(localFee) || 0)
    setDeliveryData(prev => ({ ...prev, fee: finalFee, confirmed: true }))
    setShowModal(false)
  }

  const handleFeeInput = (e) => {
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
    setLocalFee(Number(raw) || 0)
  }

  return (
    <>
      <div className={`mb-6 p-6 rounded-2xl border shadow-inner animate-fade-in
        ${isDark ? 'bg-dark-card border-gold-500/30' : 'bg-gold-50/50 border-gold-400/30'}`}>

        <div className="flex items-center gap-3 text-gold-500 mb-4">
          <Truck size={24} />
          <h3 className="font-display font-bold text-lg">Módulo de Domicilio</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <User size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={deliveryData.name || ''}
              onChange={e => setDeliveryData(prev => ({ ...prev, name: e.target.value, confirmed: false }))}
              className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border-2 outline-none focus:border-gold-500 transition-colors
                ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-black'}`}
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin size={16} className="absolute left-3 top-3 text-gray-400 z-10" />
              <input
                type="text"
                placeholder="Dirección de Entrega (Ej: Cra 45 # 72-10)"
                value={addressInput}
                onChange={e => setAddressInput(e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border-2 outline-none focus:border-gold-500 transition-colors
                  ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-black'}`}
              />
            </div>

            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className={`shrink-0 px-3 py-2.5 rounded-xl text-sm border-2 outline-none focus:border-gold-500 transition-colors cursor-pointer font-semibold
                ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-800'}`}
            >
              <optgroup label="Atlántico">
                <option value="Barranquilla">Barranquilla</option>
                <option value="Soledad">Soledad</option>
                <option value="Malambo">Malambo</option>
                <option value="Galapa">Galapa</option>
                <option value="Puerto Colombia">Pto. Colombia</option>
              </optgroup>
              <optgroup label="Otras ciudades">
                <option value="Bogotá">Bogotá</option>
                <option value="Medellín">Medellín</option>
                <option value="Cali">Cali</option>
                <option value="Cartagena">Cartagena</option>
                <option value="Cúcuta">Cúcuta</option>
                <option value="Bucaramanga">Bucaramanga</option>
                <option value="Pereira">Pereira</option>
                <option value="Manizales">Manizales</option>
                <option value="Santa Marta">Santa Marta</option>
              </optgroup>
            </select>
          </div>

          <div className="md:col-span-2 relative mt-2">
            <textarea
              placeholder="Detalles de Entrega (Ej: Casa verde, frente a la tienda, timbre dañado...)"
              value={deliveryData.details || ''}
              onChange={e => setDeliveryData(prev => ({ ...prev, details: e.target.value }))}
              rows={2}
              className={`w-full p-3 rounded-xl text-sm border-2 outline-none focus:border-gold-500 transition-colors resize-none
                ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-black'}`}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
          {errorMsg && (
            <div className="flex items-center gap-2 text-red-500 text-sm font-semibold">
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          {deliveryData.confirmed ? (
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600">
              <CheckCircle2 size={18} />
              <span className="font-bold text-sm">
                Domicilio: ${formatCOP(deliveryData.fee)}
              </span>
              <button onClick={() => setShowModal(true)} className="ml-2 text-xs underline hover:text-emerald-500">
                Editar
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!addressInput.trim()) setErrorMsg('Escribe la dirección.')
                else openModal(addressInput, deliveryData.distance, deliveryData.suggestedFee || TARIFA_MINIMA, distWarning)
              }}
              disabled={isCalculating}
              className="w-full sm:w-auto px-6 py-2.5 bg-gold-gradient text-black font-bold rounded-xl shadow-gold-sm
                hover:scale-[1.02] disabled:opacity-60 disabled:cursor-wait transition-all uppercase tracking-wider text-xs"
            >
              {isCalculating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Calculando…
                </span>
              ) : 'Calcular Envío'}
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />

            <div
              className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in
                ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-light-border'}`}
              style={{ zIndex: 100000 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Truck size={20} className="text-gold-500" /> Confirmar Tarifa
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className={`p-4 rounded-xl mb-5 ${isDark ? 'bg-dark-surface' : 'bg-gray-50'}`}>
                <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Destino</p>
                <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {deliveryData.address}
                </p>

                {deliveryData.distance ? (
                  <>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full
                      ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                      📍 {deliveryData.distance} km desde tu tienda
                    </span>

                    {distWarning && (
                      <div className="mt-2 flex items-start gap-2 text-orange-500 bg-orange-500/10 rounded-lg p-2 text-xs font-semibold">
                        <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                        <span>
                          Distancia mayor a {DISTANCIA_MAXIMA} km. ¿Es correcto? Verifica la dirección
                          o ajusta el costo manualmente.
                        </span>
                      </div>
                    )}

                    <div className={`mt-3 text-[11px] font-mono rounded-lg px-3 py-2 flex flex-col gap-1
                      ${isDark ? 'bg-dark-card text-gold-400' : 'bg-gold-50 text-gold-700'}`}>
                      <div className="flex justify-between w-full">
                        <span>Base (primeros 3km):</span>
                        <span className="font-bold">$5.000</span>
                      </div>
                      {deliveryData.distance > 3 && (
                        <div className="flex justify-between w-full">
                          <span>+ Extra ({(deliveryData.distance - 3).toFixed(1)} km × $1.500):</span>
                          <span className="font-bold">+${formatCOP((deliveryData.distance - 3) * 1500)}</span>
                        </div>
                      )}
                      {selectedCity !== 'Barranquilla' && (
                        <div className="flex justify-between w-full text-orange-500">
                          <span>+ Recargo fuera de BQ:</span>
                          <span className="font-bold">+$4.000</span>
                        </div>
                      )}
                      <div className="flex justify-between w-full pt-1 mt-1 border-t border-gold-500/30">
                        <span className="uppercase font-bold tracking-wider">Total Sugerido:</span>
                        <span className="font-bold text-sm">${formatCOP(deliveryData.suggestedFee)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                    <AlertCircle size={12} /> Ingresa el costo manualmente
                  </span>
                )}
              </div>

              <div className="mb-5">
                <label className={`block text-xs uppercase font-bold tracking-wider mb-2
                  ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Costo a cobrar
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xl
                    ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={localFee === 0 ? '' : formatCOP(localFee)}
                    onChange={handleFeeInput}
                    placeholder="0"
                    autoFocus
                    className={`w-full pl-9 pr-4 py-3 rounded-xl border-2 text-2xl font-bold outline-none transition-all tracking-wider
                      ${isDark
                        ? 'bg-dark-surface border-dark-border focus:border-gold-500 text-white'
                        : 'bg-white border-light-border focus:border-gold-500 text-gray-900'}`}
                  />
                </div>

                <p className={`mt-1.5 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Mínimo: ${formatCOP(TARIFA_MINIMA)} · Redondeado al mil más cercano
                </p>

                {deliveryData.suggestedFee > 0 && localFee !== deliveryData.suggestedFee && (
                  <button
                    type="button"
                    onClick={() => setLocalFee(deliveryData.suggestedFee)}
                    className="mt-1.5 text-xs text-gold-500 font-semibold underline hover:text-gold-400 transition-colors"
                  >
                    ↩ Restaurar: ${formatCOP(deliveryData.suggestedFee)}
                  </button>
                )}
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-3.5 bg-gold-gradient text-black font-bold uppercase tracking-widest rounded-xl shadow-gold-md hover:scale-[1.02] transition-transform"
              >
                Aplicar ${formatCOP(localFee)}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}
