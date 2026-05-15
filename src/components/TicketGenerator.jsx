import React from 'react'

export const generateRawTicket = (sale, settings) => {
  if (!sale) return ''

  const line = "--------------------------------\n"
  let text = ""
  
  // Header
  text += `${settings.businessName.toUpperCase()}\n`
  if (settings.address) text += `${settings.address}\n`
  if (settings.taxId) text += `ID: ${settings.taxId}\n`
  text += line
  
  text += `Fecha: ${new Date(sale.timestamp).toLocaleString('es-CO')}\n`
  text += `Orden #${sale.id.slice(-6)}\n`
  if (sale.isDelivery) {
    text += `DOMICILIO\n`
    text += `Cliente: ${sale.deliveryData.name}\n`
    text += `Dir: ${sale.deliveryData.address}\n`
  }
  text += line
  
  // Items
  sale.items.forEach(item => {
    const qty = item.quantity.toString().padEnd(2)
    const name = item.nombre.substring(0, 18).padEnd(18)
    const price = `$${(item.precio * item.quantity).toLocaleString('es-CO')}`.padStart(10)
    text += `${qty} ${name} ${price}\n`
  })
  
  text += line
  
  // Totals
  const subtotal = sale.total - (sale.isDelivery ? sale.deliveryData.fee : 0)
  text += `Subtotal: `.padEnd(20) + `$${subtotal.toLocaleString('es-CO').padStart(10)}\n`
  
  if (sale.isDelivery) {
    text += `Domicilio: `.padEnd(20) + `$${sale.deliveryData.fee.toLocaleString('es-CO').padStart(10)}\n`
  }
  
  text += `TOTAL: `.padEnd(20) + `$${sale.total.toLocaleString('es-CO').padStart(10)}\n`
  
  text += line
  text += `${settings.footerMessage || 'Gracias por su compra'}\n`
  text += `\n\n\n` // Feed paper
  
  return text
}

export default function TicketGenerator({ sale, settings }) {
  if (!sale) return null

  const subtotal = sale.total - (sale.isDelivery ? sale.deliveryData.fee : 0)

  return (
    <div className="print-only ticket-container">
      <div className="ticket-header">
        <h2>{settings.businessName}</h2>
        {settings.address && <p>{settings.address}</p>}
        {settings.taxId && <p>ID: {settings.taxId}</p>}
        <p className="mt-2 text-sm">{new Date(sale.timestamp).toLocaleString('es-CO')}</p>
        <p className="font-bold uppercase mt-1">
          {sale.isDelivery ? 'Orden de Domicilio' : 'Ticket de Compra'}
        </p>
        <p className="text-xs">Orden #{sale.id.slice(-6)}</p>
      </div>

      {sale.isDelivery && (
        <div className="ticket-delivery">
          <p><strong>Cliente:</strong> {sale.deliveryData.name}</p>
          <p><strong>Dir:</strong> {sale.deliveryData.address}</p>
        </div>
      )}

      <div className="ticket-items">
        {sale.items.map(item => (
          <div key={item.id} className="ticket-item">
            <span className="qty">{item.quantity}x</span>
            <span className="name">{item.nombre}</span>
            <span className="price">${(item.precio * item.quantity).toLocaleString('es-CO')}</span>
          </div>
        ))}
      </div>

      <div className="ticket-totals">
        <div className="flex justify-between mb-1">
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString('es-CO')}</span>
        </div>
        {sale.isDelivery && (
          <div className="flex justify-between mb-1">
            <span>Domicilio</span>
            <span>${sale.deliveryData.fee.toLocaleString('es-CO')}</span>
          </div>
        )}
        <div className="flex justify-between font-bold mt-1 text-lg">
          <span>TOTAL</span>
          <span>${sale.total.toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div className="ticket-footer">
        <p>{settings.footerMessage || 'Gracias por su compra'}</p>
      </div>
    </div>
  )
}
