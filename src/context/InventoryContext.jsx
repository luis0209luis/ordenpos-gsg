import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AppContext'

const InventoryContext = createContext()

export function InventoryProvider({ children }) {
  const { user } = useAuth()
  const bid = user?.businessId || 'default'

  const [products, setProducts] = useState([])
  const [salesHistory, setSalesHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (bid === 'default' || bid === 'master') {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const [prodRes, salesRes] = await Promise.all([
          supabase.from('products').select('*').eq('business_id', bid),
          supabase.from('sales').select('*').eq('business_id', bid).order('created_at', { ascending: false })
        ])

        if (prodRes.data) setProducts(prodRes.data)
        if (salesRes.data) {
          const mappedSales = salesRes.data.map(sale => ({
            ...sale,
            deliveryStatus: sale.delivery_status || sale.deliveryStatus,
            kitchenStatus: sale.kitchen_status || sale.kitchenStatus
          }))
          setSalesHistory(mappedSales)
        }
      } catch (e) {
        console.error("Error loading inventory data from Supabase:", e)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [bid])

  const addProduct = async (product) => {
    try {
      const { data } = await supabase.from('products').insert({ ...product, business_id: bid }).select().single()
      if (data) setProducts(prev => [...prev, data])
    } catch (e) {
      console.error(e)
    }
  }

  const updateProduct = async (id, updatedProduct) => {
    try {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedProduct } : p))
      await supabase.from('products').update(updatedProduct).eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const deleteProduct = async (id) => {
    try {
      setProducts(prev => prev.filter(p => p.id !== id))
      await supabase.from('products').delete().eq('id', id)
    } catch (e) {
      console.error(e)
    }
  }

  const processSale = async (cartItems, total, deliveryData = null, kitchenStatus = null) => {
    setProducts(prev => prev.map(product => {
      const cartItem = cartItems.find(item => item.id === product.id)
      if (cartItem) {
        return { ...product, stock_actual: Math.max(0, product.stock_actual - cartItem.quantity) }
      }
      return product
    }))

    const saleRecord = {
      business_id: bid,
      date: new Date().toISOString(),
      items: cartItems,
      total,
      isDelivery: !!deliveryData,
      deliveryData,
      kitchen_status: kitchenStatus
    }

    try {
      const { data } = await supabase.from('sales').insert(saleRecord).select().single()
      if (data) {
        const mappedData = { ...data, deliveryStatus: data.delivery_status, kitchenStatus: data.kitchen_status }
        setSalesHistory(prev => [mappedData, ...prev])
        
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
      }
    } catch (e) {
      console.error(e)
      const tempSale = { ...saleRecord, id: Date.now().toString(), deliveryStatus: saleRecord.delivery_status, kitchenStatus: saleRecord.kitchen_status }
      setSalesHistory(prev => [tempSale, ...prev])
      return tempSale
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
