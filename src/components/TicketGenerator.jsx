import React from 'react'
import { useInventory } from '../context/InventoryContext'
import { getTurnNumber, getPaddedTurnNumber } from '../utils/turnHelper'

// Date and Time standard formatting function
const formatTicketDate = (dateString) => {
  const d = dateString ? new Date(dateString) : new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm
  
  return `Fecha: ${day}/${month}/${year} | Hora: ${strTime}`
}

export const generateRawTicket = (sale, settings, salesHistory = []) => {
  if (!sale) return ''

  const paddedTurn = getPaddedTurnNumber(sale, salesHistory)
  const line = "--------------------------------\n"
  let text = ""
  
  // Header - Dynamic Business Name
  let bizName = settings?.businessName;
  if (!bizName || bizName === 'Mi Negocio') {
    try {
      const storedUser = JSON.parse(sessionStorage.getItem('ordenpos_user') || localStorage.getItem('ordenpos_user'));
      bizName = storedUser?.businessName || storedUser?.business_name;
    } catch (e) {}
  }
  if (!bizName) {
    bizName = 'MI NEGOCIO';
  }
  
  const bizNameStr = bizName.toUpperCase()
  const bizPadding = Math.max(0, Math.floor((32 - bizNameStr.length) / 2))
  text += `${' '.repeat(bizPadding)}${bizNameStr}\n`
  
  if (settings?.address) {
    const addressStr = settings.address.substring(0, 32)
    const addressPadding = Math.max(0, Math.floor((32 - addressStr.length) / 2))
    text += `${' '.repeat(addressPadding)}${addressStr}\n`
  }
  if (settings?.taxId) {
    const taxIdStr = `ID: ${settings.taxId}`.substring(0, 32)
    const taxIdPadding = Math.max(0, Math.floor((32 - taxIdStr.length) / 2))
    text += `${' '.repeat(taxIdPadding)}${taxIdStr}\n`
  }
  text += line
  
  // Standard formatted date/time
  text += `${formatTicketDate(sale.created_at || sale.date || sale.timestamp || new Date())}\n`
  
  if (sale.isDelivery) {
    const domStr = "ORDEN DE DOMICILIO"
    const domPadding = Math.max(0, Math.floor((32 - domStr.length) / 2))
    text += `${' '.repeat(domPadding)}${domStr}\n`
  } else {
    const purchaseStr = "TICKET DE COMPRA"
    const purchasePadding = Math.max(0, Math.floor((32 - purchaseStr.length) / 2))
    text += `${' '.repeat(purchasePadding)}${purchaseStr}\n`
  }
  
  // Centered order number
  const orderStr = `Orden #${paddedTurn}`
  const orderPadding = Math.max(0, Math.floor((32 - orderStr.length) / 2))
  text += `${' '.repeat(orderPadding)}${orderStr}\n`
  
  if (sale.isDelivery) {
    text += `Cliente: ${sale.deliveryData?.name || ''}\n`
    text += `Dir: ${sale.deliveryData?.address || ''}\n`
  }
  text += line
  
  // Items
  ;(sale.items || []).forEach(item => {
    const qtyProduct = `${item.quantity}x ${item.nombre}`.substring(0, 21).padEnd(21)
    const price = `$${((item.precio || 0) * (item.quantity || 0)).toLocaleString('es-CO')}`.padStart(11)
    text += `${qtyProduct}${price}\n`
  })
  
  text += line
  
  // Totals
  const subtotal = (sale.total || 0) - (sale.isDelivery ? (sale.deliveryData?.fee || 0) : 0)
  text += `Subtotal: `.padEnd(20) + `$${subtotal.toLocaleString('es-CO').padStart(10)}\n`
  
  if (sale.isDelivery) {
    text += `Domicilio: `.padEnd(20) + `$${(sale.deliveryData?.fee || 0).toLocaleString('es-CO').padStart(10)}\n`
  }
  
  // Payment method
  const payMethod = sale.paymentMethod || 'Efectivo'
  text += `Pago: `.padEnd(20) + `${payMethod.toUpperCase().padStart(12)}\n`
  
  text += "================================\n"
  text += `TOTAL: `.padEnd(20) + `$${(sale.total || 0).toLocaleString('es-CO').padStart(10)}\n`
  text += "================================\n"
  
  // Centered footer message
  const footerMsg = settings?.footerMessage || '¡Gracias por su compra! / Vuelva pronto.'
  const footerLines = footerMsg.split('\n')
  footerLines.forEach(l => {
    const trimmed = l.trim()
    const padding = Math.max(0, Math.floor((32 - trimmed.length) / 2))
    text += `${' '.repeat(padding)}${trimmed}\n`
  })
  
  const refStr = `Ref: #${String(sale.id || '').slice(-6)}`
  const refPadding = Math.max(0, Math.floor((32 - refStr.length) / 2))
  text += `${' '.repeat(refPadding)}${refStr}\n`
  
  text += `\n` // Feed 1 line before cut (saves paper)
  
  return text
}

export default function TicketGenerator({ sale, settings }) {
  const { salesHistory } = useInventory() || {}
  if (!sale) return null

  const turnNumber = getTurnNumber(sale, salesHistory)
  const paddedTurn = String(turnNumber).padStart(2, '0')
  const subtotal = (sale.total || 0) - (sale.isDelivery ? (sale.deliveryData?.fee || 0) : 0)

  // Resolving business name dynamically
  let bizName = settings?.businessName;
  if (!bizName || bizName === 'Mi Negocio') {
    try {
      const storedUser = JSON.parse(sessionStorage.getItem('ordenpos_user') || localStorage.getItem('ordenpos_user'));
      bizName = storedUser?.businessName || storedUser?.business_name;
    } catch (e) {}
  }
  if (!bizName) {
    bizName = 'MI NEGOCIO';
  }

  return (
    <div className="print-only ticket-container font-mono text-black bg-white select-none">
      <div className="ticket-header text-center border-b border-dashed border-black pb-2 mb-2">
        <h2 className="text-lg font-bold uppercase text-black">{bizName}</h2>
        {settings?.address && <p className="text-xs text-black">{settings.address}</p>}
        {settings?.taxId && <p className="text-xs text-black">ID: {settings.taxId}</p>}
        
        {/* Date and Time standard formatting */}
        <p className="text-xs text-black mt-1">
          {formatTicketDate(sale.created_at || sale.date || sale.timestamp)}
        </p>
        
        <p className="font-bold uppercase text-xs mt-2 text-black">
          {sale.isDelivery ? 'Orden de Domicilio' : 'Ticket de Compra'}
        </p>
        
        {/* Centered Order #02 with large size, bold, and NO heavy box/borders */}
        <p className="font-bold text-2xl text-black mt-1">
          Orden #{paddedTurn}
        </p>
      </div>

      {sale.isDelivery && (
        <div className="ticket-delivery border-b border-dashed border-black pb-2 mb-2 text-xs text-black">
          <p className="uppercase"><strong className="font-bold">Cliente:</strong> {sale.deliveryData?.name}</p>
          <p className="uppercase"><strong className="font-bold">Dir:</strong> {sale.deliveryData?.address}</p>
        </div>
      )}

      <div className="ticket-items border-b border-dashed border-black pb-2 mb-2 text-xs text-black">
        {(sale.items || []).map(item => (
          <div key={item.id} className="ticket-item flex justify-between mb-1">
            <span className="text-left font-mono">
              {item.quantity}x {item.nombre}
            </span>
            <span className="text-right font-mono">
              ${((item.precio || 0) * (item.quantity || 0)).toLocaleString('es-CO')}
            </span>
          </div>
        ))}
      </div>

      <div className="ticket-totals text-xs text-black">
        <div className="flex justify-between mb-1 font-mono">
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString('es-CO')}</span>
        </div>
        {sale.isDelivery && (
          <div className="flex justify-between mb-1 font-mono">
            <span>Domicilio</span>
            <span>${(sale.deliveryData?.fee || 0).toLocaleString('es-CO')}</span>
          </div>
        )}
        
        {/* Payment method in print component */}
        <div className="flex justify-between mb-1 font-mono">
          <span>Método de Pago</span>
          <span className="uppercase">{sale.paymentMethod || 'Efectivo'}</span>
        </div>
        
        {/* TOTAL highlighted with double line border above it */}
        <div className="flex justify-between font-bold text-base pt-1 font-mono border-t-4 border-double border-black">
          <span>TOTAL</span>
          <span>${(sale.total || 0).toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div className="ticket-footer text-center mt-4 border-t border-dashed border-black pt-2 text-xs text-black">
        <p className="font-mono">{settings?.footerMessage || '¡Gracias por su compra! / Vuelva pronto.'}</p>
        <p className="text-[10px] font-mono mt-1">Ref: #{String(sale.id || '').slice(-6)}</p>
      </div>
    </div>
  )
}
