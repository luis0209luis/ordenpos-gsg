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
  const [supplyItems, setSupplyItems] = useState([])
  const [productRecipes, setProductRecipes] = useState([])
  const [customizationOptions, setCustomizationOptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let productsChannel
    let salesChannel
    let supplyItemsChannel
    let optionsChannel
    let pollingInterval

    async function loadData() {
      if (!isValidUUID(bid)) {
        if (isMounted) {
          setProducts([])
          setSalesHistory([])
          setSupplyItems([])
          setProductRecipes([])
          setCustomizationOptions([])
          setLoading(false)
        }
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
            kitchenStatus: sale.kitchen_status || sale.kitchenStatus,
            paymentMethod: sale.payment_method || sale.paymentMethod || 'Efectivo',
            notes: sale.notes
          }))
          setSalesHistory(mappedSales)
        }

        // Fetch supply items, recipes and customization options in parallel
        const productIds = prodRes.data?.map(p => p.id) || []
        const [supplyRes, recipesRes, optionsRes] = await Promise.all([
          supabase.from('supply_items').select('*').eq('business_id', bid),
          productIds.length > 0
            ? supabase.from('product_recipes').select('*').in('product_id', productIds)
            : Promise.resolve({ data: [] }),
          productIds.length > 0
            ? supabase.from('product_customization_options').select('*').in('product_id', productIds).order('sort_order', { ascending: true })
            : Promise.resolve({ data: [] })
        ])

        if (!isMounted) return

        if (supplyRes.data) setSupplyItems(supplyRes.data)
        if (recipesRes.data) setProductRecipes(recipesRes.data)
        if (optionsRes.data) setCustomizationOptions(optionsRes.data)

        // Set up real-time channel for supply_items
        supplyItemsChannel = supabase.channel('supply_items-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'supply_items', filter: `business_id=eq.${bid}` }, payload => {
            if (!isMounted) return
            if (payload.eventType === 'INSERT') {
              setSupplyItems(prev => prev.find(s => s.id === payload.new.id) ? prev : [...prev, payload.new])
            }
            if (payload.eventType === 'UPDATE') {
              setSupplyItems(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s))
            }
            if (payload.eventType === 'DELETE') {
              setSupplyItems(prev => prev.filter(s => s.id !== payload.old.id))
            }
          })
          .subscribe()

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
              kitchenStatus: sale.kitchen_status || sale.kitchenStatus,
              paymentMethod: sale.payment_method || sale.paymentMethod || 'Efectivo',
              notes: sale.notes
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

        optionsChannel = supabase.channel('customization-options-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'product_customization_options' }, payload => {
            if (!isMounted) return
            if (payload.eventType === 'INSERT') {
              setCustomizationOptions(prev => prev.find(o => o.id === payload.new.id) ? prev : [...prev, payload.new].sort((a,b)=>a.sort_order - b.sort_order))
            }
            if (payload.eventType === 'UPDATE') {
              setCustomizationOptions(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o).sort((a,b)=>a.sort_order - b.sort_order))
            }
            if (payload.eventType === 'DELETE') {
              setCustomizationOptions(prev => prev.filter(o => o.id !== payload.old.id))
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
                kitchenStatus: sale.kitchen_status || sale.kitchenStatus,
                paymentMethod: sale.payment_method || sale.paymentMethod || 'Efectivo',
                notes: sale.notes
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
      if (supplyItemsChannel) supabase.removeChannel(supplyItemsChannel)
      if (optionsChannel) supabase.removeChannel(optionsChannel)
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

  const saveCustomizationOptions = async (productId, options) => {
    try {
      // Delete all existing options for this product
      await supabase.from('product_customization_options').delete().eq('product_id', productId)
      if (options.length > 0) {
        const rows = options.map((o, i) => ({
          product_id: productId,
          supply_item_id: o.supply_item_id || null,
          label: o.label,
          cantidad_base: parseFloat(o.cantidad_base) || 0,
          discount_mode: o.discount_mode || 'split',
          extra_price: parseFloat(o.extra_price) || 0,
          sort_order: i
        }))
        const { data, error } = await supabase.from('product_customization_options').insert(rows).select()
        if (error) throw error
        setCustomizationOptions(prev => [
          ...prev.filter(o => o.product_id !== productId),
          ...data
        ])
      } else {
        setCustomizationOptions(prev => prev.filter(o => o.product_id !== productId))
      }
    } catch (e) {
      console.error('Error saving customization options:', e)
      throw e
    }
  }

  const getProductOptions = (productId) => {
    return customizationOptions
      .filter(o => o.product_id === productId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  const calculateStockDeltas = (rawItems, multiplier = 1) => {
    const productDeltas = {}
    const supplyDeltas = {}

    let itemList = rawItems
    if (typeof rawItems === 'string') {
      try {
        itemList = JSON.parse(rawItems)
      } catch {
        itemList = []
      }
    }
    if (!Array.isArray(itemList)) itemList = []

    for (const item of itemList) {
      if (!item) continue
      const itemQty = Number(item.quantity || item.cantidad || 1)
      if (isNaN(itemQty) || itemQty <= 0) continue

      const product = products.find(p => String(p.id) === String(item.id || item.productId))
      if (!product) continue

      const mode = product.inventory_mode || 'finished'

      if (mode === 'finished') {
        const pid = String(product.id)
        productDeltas[pid] = (productDeltas[pid] || 0) + (multiplier * itemQty)
      } else if (mode === 'recipe') {
        const recipe = productRecipes.filter(r => String(r.product_id) === String(product.id))
        for (const recipeItem of recipe) {
          if (!recipeItem?.supply_item_id) continue
          const sid = String(recipeItem.supply_item_id)
          const qtyUsed = Number(recipeItem.cantidad) || 0
          supplyDeltas[sid] = (supplyDeltas[sid] || 0) + (multiplier * qtyUsed * itemQty)
        }
      } else if (mode === 'blend' && product.blend_config) {
        const config = product.blend_config

        // 1. Cup supply
        if (config.cup_supply_id) {
          const sid = String(config.cup_supply_id)
          supplyDeltas[sid] = (supplyDeltas[sid] || 0) + (multiplier * 1 * itemQty)
        }

        // 2. Fixed supplies
        if (Array.isArray(config.fixed_supplies)) {
          for (const fs of config.fixed_supplies) {
            if (!fs?.supply_item_id) continue
            const sid = String(fs.supply_item_id)
            const qtyUsed = Number(fs.cantidad) || 0
            supplyDeltas[sid] = (supplyDeltas[sid] || 0) + (multiplier * qtyUsed * itemQty)
          }
        }

        // 3. Flavors
        if (Array.isArray(item.blendSelections) && item.blendSelections.length > 0) {
          const numFlavors = item.blendSelections.length
          const capacityOz = Number(config.cup_capacity) || 16
          const litersPerFlavor = (capacityOz / numFlavors) * 0.02957
          const totalLiters = litersPerFlavor * itemQty

          for (const flavorId of item.blendSelections) {
            if (!flavorId) continue
            const sid = String(flavorId)
            supplyDeltas[sid] = (supplyDeltas[sid] || 0) + (multiplier * totalLiters)
          }
        }
      }
    }

    for (const key in productDeltas) {
      productDeltas[key] = Math.round(productDeltas[key] * 10000) / 10000
    }
    for (const key in supplyDeltas) {
      supplyDeltas[key] = Math.round(supplyDeltas[key] * 10000) / 10000
    }

    return { productDeltas, supplyDeltas }
  }

  const processSale = async (cartItems, total, deliveryData = null, kitchenStatus = null, paymentMethod = 'Efectivo', notes = '') => {
    const { productDeltas, supplyDeltas } = calculateStockDeltas(cartItems, -1)

    // Snapshot stock values BEFORE optimistic update for accurate DB writes
    const productStockSnapshot = {}
    const supplyStockSnapshot = {}
    for (const pid of Object.keys(productDeltas)) {
      const p = products.find(p => String(p.id) === pid)
      if (p) productStockSnapshot[pid] = Number(p.stock_actual) || 0
    }
    for (const sid of Object.keys(supplyDeltas)) {
      const s = supplyItems.find(s => String(s.id) === sid)
      if (s) supplyStockSnapshot[sid] = Number(s.stock_actual) || 0
    }

    // Optimistic UI: update stock locally right away
    setProducts(prev => prev.map(p => {
      const delta = productDeltas[String(p.id)]
      if (delta !== undefined) {
        const curStock = Number(p.stock_actual) || 0
        const newStock = Math.max(0, Math.round((curStock + delta) * 10000) / 10000)
        return { ...p, stock_actual: newStock }
      }
      return p
    }))

    setSupplyItems(prev => prev.map(s => {
      const delta = supplyDeltas[String(s.id)]
      if (delta !== undefined) {
        const curStock = Number(s.stock_actual) || 0
        const newStock = Math.max(0, Math.round((curStock + delta) * 10000) / 10000)
        return { ...s, stock_actual: newStock }
      }
      return s
    }))

    // Build the record — do NOT include created_at, Supabase generates it automatically
    const dbSaleRecord = {
      business_id: bid,
      items: cartItems,
      total,
      is_delivery: !!deliveryData,
      delivery_data: deliveryData || null,
      delivery_status: deliveryData ? 'Pendiente' : null,
      kitchen_status: kitchenStatus || null,
      payment_method: paymentMethod,
      notes: notes,
      cajero_name: user?.name || user?.username || null
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
        kitchenStatus: data.kitchen_status,
        paymentMethod: data.payment_method || paymentMethod,
        notes: data.notes || notes
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

        const getShiftStart = (date) => {
          const d = new Date(date)
          const shiftStart = new Date(d)
          shiftStart.setHours(5, 0, 0, 0)
          if (d < shiftStart) {
            shiftStart.setDate(shiftStart.getDate() - 1)
          }
          return shiftStart
        }

        const now = new Date()
        const currentShiftStart = getShiftStart(now)

        let nextNumber = 1
        if (stored.length > 0) {
          const lastOrder = stored[stored.length - 1]
          const lastNum = lastOrder && typeof lastOrder.number === 'number' ? lastOrder.number : 0
          const lastOrderTime = lastOrder && lastOrder.ts ? new Date(lastOrder.ts) : null

          if (lastOrderTime && getShiftStart(lastOrderTime).getTime() === currentShiftStart.getTime()) {
            nextNumber = lastNum < 50 ? lastNum + 1 : 1
          }
        }

        stored.push({ id: data.id, number: nextNumber, ts: now.toISOString() })
        if (stored.length > 200) {
          stored.shift()
        }
        localStorage.setItem('ordenpos_orders', JSON.stringify(stored))
      } catch (e) {
        console.error("Error updating localStorage ordenpos_orders:", e)
      }

      setSalesHistory(prev => [mappedData, ...prev])

      // Update stock in DB using pre-optimistic snapshot to avoid double counting
      if (isValidUUID(bid)) {
        for (const [pid, delta] of Object.entries(productDeltas)) {
          const product = products.find(p => String(p.id) === pid)
          if (product) {
            const baseStock = productStockSnapshot[pid] !== undefined ? productStockSnapshot[pid] : (Number(product.stock_actual) || 0)
            const newStock = Math.max(0, Math.round((baseStock + delta) * 10000) / 10000)
            await supabase.from('products').update({ stock_actual: newStock }).eq('id', product.id)
          }
        }

        for (const [sid, delta] of Object.entries(supplyDeltas)) {
          const supply = supplyItems.find(s => String(s.id) === sid)
          if (supply) {
            const baseStock = supplyStockSnapshot[sid] !== undefined ? supplyStockSnapshot[sid] : (Number(supply.stock_actual) || 0)
            const newStock = Math.max(0, Math.round((baseStock + delta) * 10000) / 10000)
            await supabase.from('supply_items').update({ stock_actual: newStock }).eq('id', supply.id)
          }
        }
      }

      return mappedData

    } catch (e) {
      console.error("Error saving sale to Supabase:", e)

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
        kitchenStatus: kitchenStatus || null,
        paymentMethod: paymentMethod,
        notes: notes
      }
      setSalesHistory(prev => [tempSale, ...prev])
      return tempSale
    }
  }

  const deleteSale = async (saleId) => {
    const sale = salesHistory.find(s => s.id === saleId)
    if (!sale) return

    const { productDeltas, supplyDeltas } = calculateStockDeltas(sale.items, +1)

    // Snapshot stock values BEFORE optimistic update for accurate DB writes
    const productStockSnapshot = {}
    const supplyStockSnapshot = {}
    for (const pid of Object.keys(productDeltas)) {
      const p = products.find(p => String(p.id) === pid)
      if (p) productStockSnapshot[pid] = Number(p.stock_actual) || 0
    }
    for (const sid of Object.keys(supplyDeltas)) {
      const s = supplyItems.find(s => String(s.id) === sid)
      if (s) supplyStockSnapshot[sid] = Number(s.stock_actual) || 0
    }

    // Optimistic UI restore for products
    setProducts(prev => prev.map(p => {
      const delta = productDeltas[String(p.id)]
      if (delta !== undefined) {
        const curStock = Number(p.stock_actual) || 0
        const newStock = Math.max(0, Math.round((curStock + delta) * 10000) / 10000)
        return { ...p, stock_actual: newStock }
      }
      return p
    }))

    // Optimistic UI restore for supply items
    setSupplyItems(prev => prev.map(s => {
      const delta = supplyDeltas[String(s.id)]
      if (delta !== undefined) {
        const curStock = Number(s.stock_actual) || 0
        const newStock = Math.max(0, Math.round((curStock + delta) * 10000) / 10000)
        return { ...s, stock_actual: newStock }
      }
      return s
    }))

    setSalesHistory(prev => prev.filter(s => s.id !== saleId))

    if (!isValidUUID(bid)) return

    try {
      await supabase.from('sales').delete().eq('id', saleId)

      // Use pre-optimistic snapshot to calculate correct new stock in DB
      for (const [pid, delta] of Object.entries(productDeltas)) {
        const product = products.find(p => String(p.id) === pid)
        if (product) {
          const baseStock = productStockSnapshot[pid] !== undefined ? productStockSnapshot[pid] : (Number(product.stock_actual) || 0)
          const newStock = Math.max(0, Math.round((baseStock + delta) * 10000) / 10000)
          await supabase.from('products').update({ stock_actual: newStock }).eq('id', product.id)
        }
      }

      for (const [sid, delta] of Object.entries(supplyDeltas)) {
        const supply = supplyItems.find(s => String(s.id) === sid)
        if (supply) {
          const baseStock = supplyStockSnapshot[sid] !== undefined ? supplyStockSnapshot[sid] : (Number(supply.stock_actual) || 0)
          const newStock = Math.max(0, Math.round((baseStock + delta) * 10000) / 10000)
          await supabase.from('supply_items').update({ stock_actual: newStock }).eq('id', supply.id)
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
      const updateData = { delivery_status: newStatus }
      if (newStatus === 'Entregado') {
        updateData.domiciliario_name = user?.name || user?.username || null
      }
      await supabase.from('sales').update(updateData).eq('id', saleId)
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
      const updateData = { kitchen_status: newStatus }
      if (newStatus === 'ready') {
        updateData.preparador_name = user?.name || user?.username || null
      }
      await supabase.from('sales').update(updateData).eq('id', saleId)
    } catch (e) {
      console.error(e)
    }
  }

  const addSupplyItem = async (item) => {
    if (!isValidUUID(bid)) {
      const mockItem = { ...item, id: `mock-supply-${Date.now()}`, business_id: bid }
      setSupplyItems(prev => [...prev, mockItem])
      return mockItem
    }
    const { data, error } = await supabase.from('supply_items').insert({ ...item, business_id: bid }).select().single()
    if (error) throw error
    setSupplyItems(prev => [...prev, data])
    return data
  }

  const updateSupplyItem = async (id, updates) => {
    if (!isValidUUID(bid)) {
      setSupplyItems(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
      return { id, ...updates }
    }
    const { data, error } = await supabase.from('supply_items').update(updates).eq('id', id).select().single()
    if (error) throw error
    setSupplyItems(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
    return data
  }

  const deleteSupplyItem = async (id) => {
    if (!isValidUUID(bid)) {
      setSupplyItems(prev => prev.filter(s => s.id !== id))
      return
    }
    const { error } = await supabase.from('supply_items').delete().eq('id', id)
    if (error) throw error
    setSupplyItems(prev => prev.filter(s => s.id !== id))
  }

  const saveProductRecipe = async (productId, recipeItems) => {
    if (!isValidUUID(bid)) {
      const newRecipes = recipeItems.map(r => ({ id: `mock-recipe-${Date.now()}-${Math.random()}`, product_id: productId, supply_item_id: r.supply_item_id, cantidad: r.cantidad }))
      setProductRecipes(prev => [...prev.filter(r => r.product_id !== productId), ...newRecipes])
      return
    }
    await supabase.from('product_recipes').delete().eq('product_id', productId)
    if (recipeItems.length > 0) {
      const rows = recipeItems.map(r => ({ product_id: productId, supply_item_id: r.supply_item_id, cantidad: r.cantidad }))
      const { data, error } = await supabase.from('product_recipes').insert(rows).select()
      if (error) throw error
      setProductRecipes(prev => [...prev.filter(r => r.product_id !== productId), ...data])
    } else {
      setProductRecipes(prev => prev.filter(r => r.product_id !== productId))
    }
  }

  const getEstimatedStock = (productId) => {
    const product = products.find(p => p.id === productId)
    if (!product) return null

    if (product.inventory_mode === 'blend' && product.blend_config) {
      const config = product.blend_config
      const limits = []
      
      // 1. Cup supply limit
      if (config.cup_supply_id) {
        const cupSupply = supplyItems.find(s => String(s.id) === String(config.cup_supply_id))
        if (cupSupply) {
          limits.push(Math.floor(Number(cupSupply.stock_actual) || 0))
        }
      }

      // 2. Fixed supplies limits
      if (Array.isArray(config.fixed_supplies)) {
        for (const fs of config.fixed_supplies) {
          const supply = supplyItems.find(s => String(s.id) === String(fs.supply_item_id))
          if (supply && fs.cantidad > 0) {
            limits.push(Math.floor((Number(supply.stock_actual) || 0) / Number(fs.cantidad)))
          }
        }
      }

      // 3. Flavors capacity limit (total available flavor stock / capacity per cup)
      if (Array.isArray(config.flavor_ids) && config.flavor_ids.length > 0) {
        let totalFlavorStock = 0
        let validFlavors = 0
        for (const fid of config.flavor_ids) {
          const supply = supplyItems.find(s => String(s.id) === String(fid))
          if (supply) {
            totalFlavorStock += Number(supply.stock_actual) || 0
            validFlavors++
          }
        }
        if (validFlavors > 0) {
          const capacityLiters = (Number(config.cup_capacity) || 16) * 0.02957
          if (capacityLiters > 0) {
            limits.push(Math.floor(totalFlavorStock / capacityLiters))
          }
        }
      }

      return limits.length > 0 ? Math.min(...limits) : null
    }

    const recipe = productRecipes.filter(r => r.product_id === productId)
    if (recipe.length === 0) return null
    const limits = recipe.map(r => {
      const supply = supplyItems.find(s => s.id === r.supply_item_id)
      if (!supply || r.cantidad === 0) return Infinity
      return Math.floor((Number(supply.stock_actual) || 0) / Number(r.cantidad))
    })
    return Math.min(...limits)
  }


  return (
    <InventoryContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct,
      processSale, salesHistory, deleteSale, updateDeliveryStatus, updateKitchenStatus, loading,
      supplyItems, addSupplyItem, updateSupplyItem, deleteSupplyItem,
      productRecipes, saveProductRecipe, getEstimatedStock,
      customizationOptions, saveCustomizationOptions, getProductOptions
    }}>
      {children}
    </InventoryContext.Provider>
  )
}

export const useInventory = () => useContext(InventoryContext)
