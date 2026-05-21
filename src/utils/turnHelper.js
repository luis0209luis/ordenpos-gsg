export const getTurnNumber = (sale, salesHistory = []) => {
  if (!sale) return 1

  // 1. Try to read from localStorage (ordenpos_orders)
  try {
    const stored = JSON.parse(localStorage.getItem('ordenpos_orders') || '[]')
    const found = stored.find(item => item && item.id === sale.id)
    if (found && found.number) {
      return found.number
    }
  } catch (e) {
    console.error("Error reading ordenpos_orders from localStorage:", e)
  }

  // 2. Fallback to daily sequential order number calculation wrapped to 50
  const saleDate = sale.created_at || sale.date || sale.timestamp
  if (!saleDate) return 1
  const saleDateStr = new Date(saleDate).toLocaleDateString()
  
  const allSales = [...(salesHistory || [])]
  if (!allSales.some(s => s.id === sale.id)) {
    allSales.push(sale)
  }
  
  const sameDaySales = allSales.filter(s => {
    if (!s) return false
    const sDate = s.created_at || s.date
    if (!sDate) return false
    const dStr = new Date(sDate).toLocaleDateString()
    return dStr === saleDateStr
  })
  
  sameDaySales.sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date))
  
  const idx = sameDaySales.findIndex(s => s.id === sale.id)
  const dailyNum = idx === -1 ? 1 : idx + 1
  
  // Cyclic wrap-around (1 to 50)
  return ((dailyNum - 1) % 50) + 1
}

export const getPaddedTurnNumber = (sale, salesHistory = []) => {
  const num = getTurnNumber(sale, salesHistory)
  return String(num).padStart(2, '0')
}
