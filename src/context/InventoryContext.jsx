import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AppContext'
import { isValidUUID } from '../utils/uuid'

const InventoryContext = createContext()

export function InventoryProvider({ children }) {
  const { user } = useAuth()
  const bid = user?.businessId || 'default'

  const [products, setProducts] = useState([])
  const [salesHistory, setSalesHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let productsChannel
    let salesChannel
    let pollingInterval

    async function loadData() {
      if (!isValidUUID(bid)) {
        if (isMounted) setLoading(false)
        return
      }

      if (isMounted) setLoading(true)
      try {
        const [prodRes, salesRes] = await Promise.all([
          supabase.from('products').select('*').eq('business_id', bid),
          supabase.from('sales').select('*').eq('business_id', bid).order('created_at', { ascending: false })
        ])

        if (!isMounted) return

        if (prodRes.data) setProducts(prodRes.data)
        if (salesRes.data) {
          const mappedSales = salesRes.data.map(sale => ({
            ...sale,
            date: sale.created_at || sale.date,
            isDelivery: sale.is_delivery,
            deliveryData: sale.delivery_data,
            deliveryStatus: sale.delivery_status || sale.deliveryStatus,
            kitchenStatus: sale.kitchen_status || sale.kitchenStatus
          }))
          setSalesHistory(mappedSales)
        }

        productsChannel = supabase.channel('products-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `business_id=eq.${bid}` }, payload => {
            if (!isMounted) return
            if (payload.eventType === 'INSERT') {
              setProducts(prev => prev.find(p => p.id === payload.new.id) ? prev : [...prev, payload.new])
            }
            if (payload.eventType === 'UPDATE') {
              setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p))
            }
            if (payload.eventType === 'DELETE') {
              setProducts(prev => prev.filter(p => p.id !== payload.old.id))
            }
          })
          .subscribe()

        salesChannel = supabase.channel('sales-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `business_id=eq.${bid}` }, payload => {
            if (!isMounted) return
            const mapSale = sale => ({
              ...sale,
              date: sale.created_at || sale.date,
              isDelivery: sale.is_delivery,
              deliveryData: sale.delivery_data,
              deliveryStatus: sale.delivery_status || sale.deliveryStatus,
              kitchenStatus: sale.kitchen_status || sale.kitchenStatus
            })

            if (payload.eventType === 'INSERT') {
              setSalesHistory(prev => prev.find(s => s.id === payload.new.id) ? prev : [mapSale(payload.new), ...prev])
            }
            if (payload.eventType === 'UPDATE') {
              setSalesHistory(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...mapSale(payload.new) } : s))
            }
            if (payload.eventType === 'DELETE') {
              setSalesHistory(prev => prev.filter(s => s.id !== payload.old.id))
            }
          })
          .subscribe()

        // Set up the polling interval every 8 seconds as robust fallback for sales
        pollingInterval = setInterval(async () => {
          try {
            const { data, error } = await supabase.from('sales').select('*').eq('business_id', bid).order('created_at', { ascending: false })
            if (error) {
              console.error("Error polling sales:", error)
              return
            }
            if (data && isMounted) {
              const mappedSales = data.map(sale => ({
                ...sale,
                date: sale.created_at || sale.date,
                isDelivery: sale.is_delivery,
                deliveryData: sale.delivery_data,
                deliveryStatus: sale.delivery_status || sale.deliveryStatus,
                kitchenStatus: sale.kitchen_status || sale.kitchenStatus
              }))
              setSalesHistory(prev => {
                const hasDifferences = prev.length !== mappedSales.length ||
                  prev.some((s, idx) => {
                    const m = mappedSales[idx];
                    return !m || s.id !== m.id || s.kitchenStatus !== m.kitchenStatus || s.deliveryStatus !== m.deliveryStatus;
                  });
                return hasDifferences ? mappedSales : prev;
              });
            }
          } catch (err) {
            console.error("Error inside sales polling interval:", err)
          }
        }, 8000)

      } catch (e) {
        console.error("Error loading inventory data from Supabase:", e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
      if (productsChannel) supabase.removeChannel(productsChannel)
      if (salesChannel) supabase.removeChannel(salesChannel)
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [bid])

  const addProduct = async (product) => {
    try {
      if (!isValidUUID(bid)) {
        const mockProduct = { ...product, id: `mock-${Date.now()}` }
        setProducts(prev => [...prev, mockProduct])
        return mockProduct
      }

      const { data, error } = await supabase.from('products').insert({ ...product, business_id: bid }).select().single()
      if (error) {
        console.error("Supabase Error en addProduct:", error)
        throw error
      }
      if (data) {
        setProducts(prev => [...prev, data])
        return data
      }
    } catch (e) {
      console.error("Catch error en InventoryContext (addProduct):", e)
      throw e
    }
  }

  const updateProduct = async (id, updatedProduct) => {
    try {
      if (!isValidUUID(bid)) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedProduct } : p))
        return updatedProduct
      }

      const { data, error } = await supabase.from('products').update(updatedProduct).eq('id', id).select().single()
      if (error) {
        console.error("Supabase Error en updateProduct:", error)
        throw error
      }
      if (data) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
        return data
      }
    } catch (e) {
      console.error("Catch error en InventoryContext (updateProduct):", e)
      throw e
    }
  }

  const deleteProduct = async (id) => {
    try {
      if (!isValidUUID(bid)) {
        setProducts(prev => prev.filter(p => p.id !== id))
        return
      }

      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      console.error("Catch error en InventoryContext (deleteProduct):", e)
      throw e
    }
  }

  const processSale = async (cartItems, total, deliveryData = null, kitchenStatus = null) => {
    // Optimistic UI: update stock locally right away
    setProducts(prev => prev.map(product => {
      const cartItem = cartItems.find(item => item.id === product.id)
      if (cartItem) {
        return { ...product, stock_actual: Math.max(0, product.stock_actual - cartItem.quantity) }
      }
      return product
    }))

    // Build the record — do NOT include created_at, Supabase generates it automatically
    const dbSaleRecord = {
      business_id: bid,
      items: cartItems,
      total,
      is_delivery: !!deliveryData,
      delivery_data: deliveryData || null,
      delivery_status: deliveryData ? 'Pendiente' : null,
      kitchen_status: kitchenStatus || null
    }

    const nowISO = new Date().toISOString()

    try {
      const { data, error } = await supabase
        .from('sales')
        .insert(dbSaleRecord)
        .select()
        .single()

      if (error) {
        console.error("Supabase INSERT error en sales:", error.message, error.details, error.hint)
        throw error
      }

      if (!data) throw new Error("Supabase no retornó datos tras el INSERT")

      const mappedData = {
        ...data,
        date: data.created_at || nowISO,
        isDelivery: data.is_delivery,
        deliveryData: data.delivery_data,
        deliveryStatus: data.delivery_status,
        kitchenStatus: data.kitchen_status
      }

      // Save turn number locally under ordenpos_orders in localStorage
      try {
        const storedStr = localStorage.getItem('ordenpos_orders') || '[]'
        let stored = []
        try {
          stored = JSON.parse(storedStr)
          if (!Array.isArray(stored)) stored = []
        } catch {
          stored = []
        }
        
        let nextNumber = 1
        if (stored.length > 0) {
          const lastOrder = stored[stored.length - 1]
          const lastNum = lastOrder && typeof lastOrder.number === 'number' ? lastOrder.number : 0
          if (lastNum < 50) {
            nextNumber = lastNum + 1
          } else {
            nextNumber = 1
          }
        }
        
        stored.push({ id: data.id, number: nextNumber })
        if (stored.length > 100) {
          stored.shift()
        }
        localStorage.setItem('ordenpos_orders', JSON.stringify(stored))
      } catch (e) {
        console.error("Error updating localStorage ordenpos_orders:", e)
      }

      setSalesHistory(prev => [mappedData, ...prev])

      // Update stock in DB for each sold item
      for (const item of cartItems) {
        const product = products.find(p => p.id === item.id)
        if (product) {
          await supabase
            .from('products')
            .update({ stock_actual: Math.max(0, product.stock_actual - item.quantity) })
            .eq('id', item.id)
        }
      }

      return mappedData

    } catch (e) {
      console.error("Error saving sale to Supabase:", e)

      // Fallback: create a temporary local sale so the ticket always shows
      const tempSale = {
        id: `temp-${Date.now()}`,
        business_id: bid,
        date: nowISO,
        created_at: nowISO,
        items: cartItems,
        total,
        isDelivery: !!deliveryData,
        deliveryData: deliveryData || null,
        deliveryStatus: deliveryData ? 'Pendiente' : null,
        kitchenStatus: kitchenStatus || null
      }
      setSalesHistory(prev => [tempSale, ...prev])
      return tempSale  // Always return something so the ticket modal works
    }
  }

  const deleteSale = async (saleId) => {
    const sale = salesHistory.find(s => s.id === saleId)
    if (!sale) return

    setProducts(prev => prev.map(product => {
      const soldItem = sale.items.find(item => item.id === product.id)
      if (soldItem) {
        return { ...product, stock_actual: product.stock_actual + soldItem.quantity }
      }
      return product
    }))
    setSalesHistory(prev => prev.filter(s => s.id !== saleId))

    if (!isValidUUID(bid)) return

    try {
      await supabase.from('sales').delete().eq('id', saleId)
      for (const item of sale.items) {
        const product = products.find(p => p.id === item.id)
        if (product) {
          await supabase
            .from('products')
            .update({ stock_actual: product.stock_actual + item.quantity })
            .eq('id', item.id)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const updateDeliveryStatus = async (saleId, newStatus) => {
    setSalesHistory(prev => prev.map(sale =>
      sale.id === saleId ? { ...sale, deliveryStatus: newStatus } : sale
    ))
    if (!isValidUUID(bid)) return
    try {
      await supabase.from('sales').update({ delivery_status: newStatus }).eq('id', saleId)
    } catch (e) {
      console.error(e)
    }
  }

  const updateKitchenStatus = async (saleId, newStatus) => {
    setSalesHistory(prev => prev.map(sale =>
      sale.id === saleId ? { ...sale, kitchenStatus: newStatus } : sale
    ))
    if (!isValidUUID(bid)) return
    try {
      await supabase.from('sales').update({ kitchen_status: newStatus }).eq('id', saleId)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <InventoryContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct,
      processSale, salesHistory, deleteSale, updateDeliveryStatus, updateKitchenStatus, loading
    }}>
      {children}
    </InventoryContext.Provider>
  )
}

export const useInventory = () => useContext(InventoryContext)
