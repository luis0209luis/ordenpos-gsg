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

  const processSale = async (cartItems, total, deliveryData = null, kitchenStatus = null, paymentMethod = 'Efectivo', notes = '') => {
    // Optimistic UI: update stock locally right away
    setProducts(prev => prev.map(product => {
      const cartItem = cartItems.find(item => item.id === product.id)
      if (cartItem && (product.inventory_mode === 'finished' || !product.inventory_mode)) {
        return { ...product, stock_actual: Math.max(0, product.stock_actual - cartItem.quantity) }
      }
      return product
    }))

    // Optimistically update supply items stock locally for recipe and blend products
    setSupplyItems(prev => {
      let updated = [...prev]
      for (const item of cartItems) {
        const product = products.find(p => p.id === item.id || p.id === item.productId)
        if (product && product.inventory_mode === 'recipe') {
          const recipe = productRecipes.filter(r => r.product_id === product.id)
          for (const recipeItem of recipe) {
            updated = updated.map(s => {
              if (s.id === recipeItem.supply_item_id) {
                return { ...s, stock_actual: Math.max(0, Number(s.stock_actual) - (Number(recipeItem.cantidad) * item.quantity)) }
              }
              return s
            })
          }
        } else if (product && product.inventory_mode === 'blend' && product.blend_config) {
          const config = product.blend_config
          // 1. Cup supply deduction
          if (config.cup_supply_id) {
            updated = updated.map(s => {
              if (String(s.id) === String(config.cup_supply_id)) {
                return { ...s, stock_actual: Math.max(0, Number(s.stock_actual) - (1 * item.quantity)) }
              }
              return s
            })
          }
          // 2. Fixed supplies deduction
          if (Array.isArray(config.fixed_supplies)) {
            for (const fs of config.fixed_supplies) {
              if (!fs.supply_item_id) continue
              updated = updated.map(s => {
                if (String(s.id) === String(fs.supply_item_id)) {
                  return { ...s, stock_actual: Math.max(0, Number(s.stock_actual) - (Number(fs.cantidad) * item.quantity)) }
                }
                return s
              })
            }
          }
          // 3. Flavor deduction
          if (Array.isArray(item.blendSelections) && item.blendSelections.length > 0) {
            const numFlavors = item.blendSelections.length
            const capacityOz = Number(config.cup_capacity) || 16
            const litersPerFlavor = (capacityOz / numFlavors) * 0.02957
            const totalDeductL = litersPerFlavor * item.quantity

            for (const flavorId of item.blendSelections) {
              updated = updated.map(s => {
                if (String(s.id) === String(flavorId)) {
                  return { ...s, stock_actual: Math.max(0, Number(s.stock_actual) - totalDeductL) }
                }
                return s
              })
            }
          }
        }
      }
      return updated
    })


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
      // Turns reset at 5:00 AM each day (start of new sales shift)
      try {
        const storedStr = localStorage.getItem('ordenpos_orders') || '[]'
        let stored = []
        try {
          stored = JSON.parse(storedStr)
          if (!Array.isArray(stored)) stored = []
        } catch {
          stored = []
        }

        // Helper: returns the shift-day boundary (5 AM today, or yesterday if before 5 AM)
        const getShiftStart = (date) => {
          const d = new Date(date)
          const shiftStart = new Date(d)
          shiftStart.setHours(5, 0, 0, 0)
          // If it's before 5 AM, the current shift started at 5 AM the previous day
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

          // Only continue the sequence if the last order was in the same shift
          if (lastOrderTime && getShiftStart(lastOrderTime).getTime() === currentShiftStart.getTime()) {
            nextNumber = lastNum < 50 ? lastNum + 1 : 1
          }
          // Otherwise nextNumber stays 1 (new shift reset)
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

      // Update stock in DB for each sold item according to inventory mode
      for (const item of cartItems) {
        const product = products.find(p => p.id === item.id || p.id === item.productId)
        if (!product) continue

        if (product.inventory_mode === 'finished' || !product.inventory_mode) {
          await supabase
            .from('products')
            .update({ stock_actual: Math.max(0, product.stock_actual - item.quantity) })
            .eq('id', product.id)
        } else if (product.inventory_mode === 'recipe') {
          const recipe = productRecipes.filter(r => r.product_id === product.id)
          for (const recipeItem of recipe) {
            const supply = supplyItems.find(s => s.id === recipeItem.supply_item_id)
            if (supply) {
              const newStock = Math.max(0, Number(supply.stock_actual) - (Number(recipeItem.cantidad) * item.quantity))
              await supabase
                .from('supply_items')
                .update({ stock_actual: newStock })
                .eq('id', supply.id)
              
              setSupplyItems(prev => prev.map(s => s.id === supply.id ? { ...s, stock_actual: newStock } : s))
            }
          }
        } else if (product.inventory_mode === 'blend' && product.blend_config) {
          const config = product.blend_config
          
          // 1. Cup supply deduction
          if (config.cup_supply_id) {
            const supply = supplyItems.find(s => String(s.id) === String(config.cup_supply_id))
            if (supply) {
              const newStock = Math.max(0, Number(supply.stock_actual) - (1 * item.quantity))
              await supabase
                .from('supply_items')
                .update({ stock_actual: newStock })
                .eq('id', supply.id)
              
              setSupplyItems(prev => prev.map(s => s.id === supply.id ? { ...s, stock_actual: newStock } : s))
            }
          }

          // 2. Fixed supplies deduction
          if (Array.isArray(config.fixed_supplies)) {
            for (const fs of config.fixed_supplies) {
              if (!fs.supply_item_id) continue
              const supply = supplyItems.find(s => String(s.id) === String(fs.supply_item_id))
              if (supply) {
                const newStock = Math.max(0, Number(supply.stock_actual) - (Number(fs.cantidad) * item.quantity))
                await supabase
                  .from('supply_items')
                  .update({ stock_actual: newStock })
                  .eq('id', supply.id)
                
                setSupplyItems(prev => prev.map(s => s.id === supply.id ? { ...s, stock_actual: newStock } : s))
              }
            }
          }

          // 3. Flavor deduction
          if (Array.isArray(item.blendSelections) && item.blendSelections.length > 0) {
            const numFlavors = item.blendSelections.length
            const capacityOz = Number(config.cup_capacity) || 16
            const litersPerFlavor = (capacityOz / numFlavors) * 0.02957
            const totalDeductL = litersPerFlavor * item.quantity

            for (const flavorId of item.blendSelections) {
              const supply = supplyItems.find(s => String(s.id) === String(flavorId))
              if (supply) {
                const newStock = Math.max(0, Number(supply.stock_actual) - totalDeductL)
                await supabase
                  .from('supply_items')
                  .update({ stock_actual: newStock })
                  .eq('id', supply.id)
                
                setSupplyItems(prev => prev.map(s => s.id === supply.id ? { ...s, stock_actual: newStock } : s))
              }
            }
          }
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
        kitchenStatus: kitchenStatus || null,
        paymentMethod: paymentMethod,
        notes: notes
      }
      setSalesHistory(prev => [tempSale, ...prev])
      return tempSale  // Always return something so the ticket modal works
    }
  }

  const deleteSale = async (saleId) => {
    const sale = salesHistory.find(s => s.id === saleId)
    if (!sale) return

    // Optimistic UI restore for products
    setProducts(prev => prev.map(product => {
      const soldItem = sale.items.find(item => item.id === product.id)
      if (soldItem && (product.inventory_mode === 'finished' || !product.inventory_mode)) {
        return { ...product, stock_actual: product.stock_actual + soldItem.quantity }
      }
      return product
    }))

    // Optimistic UI restore for supply items
    setSupplyItems(prev => {
      let updated = [...prev]
      for (const item of sale.items) {
        const product = products.find(p => p.id === item.id || p.id === item.productId)
        if (product && product.inventory_mode === 'recipe') {
          const recipe = productRecipes.filter(r => r.product_id === product.id)
          for (const recipeItem of recipe) {
            updated = updated.map(s => {
              if (s.id === recipeItem.supply_item_id) {
                return { ...s, stock_actual: Number(s.stock_actual) + (Number(recipeItem.cantidad) * item.quantity) }
              }
              return s
            })
          }
        } else if (product && product.inventory_mode === 'blend' && product.blend_config) {
          const config = product.blend_config
          // 1. Cup restore
          if (config.cup_supply_id) {
            updated = updated.map(s => {
              if (String(s.id) === String(config.cup_supply_id)) {
                return { ...s, stock_actual: Number(s.stock_actual) + (1 * item.quantity) }
              }
              return s
            })
          }
          // 2. Fixed restore
          if (Array.isArray(config.fixed_supplies)) {
            for (const fs of config.fixed_supplies) {
              if (!fs.supply_item_id) continue
              updated = updated.map(s => {
                if (String(s.id) === String(fs.supply_item_id)) {
                  return { ...s, stock_actual: Number(s.stock_actual) + (Number(fs.cantidad) * item.quantity) }
                }
                return s
              })
            }
          }
          // 3. Flavors restore
          if (Array.isArray(item.blendSelections) && item.blendSelections.length > 0) {
            const numFlavors = item.blendSelections.length
            const capacityOz = Number(config.cup_capacity) || 16
            const litersPerFlavor = (capacityOz / numFlavors) * 0.02957
            const totalDeductL = litersPerFlavor * item.quantity

            for (const flavorId of item.blendSelections) {
              updated = updated.map(s => {
                if (String(s.id) === String(flavorId)) {
                  return { ...s, stock_actual: Number(s.stock_actual) + totalDeductL }
                }
                return s
              })
            }
          }
        }
      }
      return updated
    })

    setSalesHistory(prev => prev.filter(s => s.id !== saleId))

    if (!isValidUUID(bid)) return

    try {
      await supabase.from('sales').delete().eq('id', saleId)
      for (const item of sale.items) {
        const product = products.find(p => p.id === item.id || p.id === item.productId)
        if (!product) continue

        if (product.inventory_mode === 'finished' || !product.inventory_mode) {
          await supabase
            .from('products')
            .update({ stock_actual: product.stock_actual + item.quantity })
            .eq('id', product.id)
        } else if (product.inventory_mode === 'recipe') {
          const recipe = productRecipes.filter(r => r.product_id === product.id)
          for (const recipeItem of recipe) {
            const supply = supplyItems.find(s => s.id === recipeItem.supply_item_id)
            if (supply) {
              const newStock = Number(supply.stock_actual) + (Number(recipeItem.cantidad) * item.quantity)
              await supabase
                .from('supply_items')
                .update({ stock_actual: newStock })
                .eq('id', supply.id)
            }
          }
        } else if (product.inventory_mode === 'blend' && product.blend_config) {
          const config = product.blend_config

          // 1. Cup restore
          if (config.cup_supply_id) {
            const supply = supplyItems.find(s => String(s.id) === String(config.cup_supply_id))
            if (supply) {
              const newStock = Number(supply.stock_actual) + (1 * item.quantity)
              await supabase
                .from('supply_items')
                .update({ stock_actual: newStock })
                .eq('id', supply.id)
            }
          }

          // 2. Fixed restore
          if (Array.isArray(config.fixed_supplies)) {
            for (const fs of config.fixed_supplies) {
              if (!fs.supply_item_id) continue
              const supply = supplyItems.find(s => String(s.id) === String(fs.supply_item_id))
              if (supply) {
                const newStock = Number(supply.stock_actual) + (Number(fs.cantidad) * item.quantity)
                await supabase
                  .from('supply_items')
                  .update({ stock_actual: newStock })
                  .eq('id', supply.id)
              }
            }
          }

          // 3. Flavors restore
          if (Array.isArray(item.blendSelections) && item.blendSelections.length > 0) {
            const numFlavors = item.blendSelections.length
            const capacityOz = Number(config.cup_capacity) || 16
            const litersPerFlavor = (capacityOz / numFlavors) * 0.02957
            const totalDeductL = litersPerFlavor * item.quantity

            for (const flavorId of item.blendSelections) {
              const supply = supplyItems.find(s => String(s.id) === String(flavorId))
              if (supply) {
                const newStock = Number(supply.stock_actual) + totalDeductL
                await supabase
                  .from('supply_items')
                  .update({ stock_actual: newStock })
                  .eq('id', supply.id)
              }
            }
          }
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
        } else {
          limits.push(0)
        }
      }

      // 2. Fixed supplies limits
      if (Array.isArray(config.fixed_supplies)) {
        for (const fs of config.fixed_supplies) {
          const supply = supplyItems.find(s => String(s.id) === String(fs.supply_item_id))
          if (supply && fs.cantidad > 0) {
            limits.push(Math.floor((Number(supply.stock_actual) || 0) / Number(fs.cantidad)))
          } else if (!supply) {
            limits.push(0)
          }
        }
      }

      // 3. Flavors capacity limit (total available flavor stock / capacity per cup)
      if (Array.isArray(config.flavor_ids) && config.flavor_ids.length > 0) {
        let totalFlavorStock = 0
        for (const fid of config.flavor_ids) {
          const supply = supplyItems.find(s => String(s.id) === String(fid))
          if (supply) {
            totalFlavorStock += Number(supply.stock_actual) || 0
          }
        }
        const capacityLiters = (Number(config.cup_capacity) || 16) * 0.02957
        if (capacityLiters > 0) {
          limits.push(Math.floor(totalFlavorStock / capacityLiters))
        } else {
          limits.push(0)
        }
      } else {
        limits.push(0)
      }

      return limits.length > 0 ? Math.min(...limits) : 0
    }

    const recipe = productRecipes.filter(r => r.product_id === productId)
    if (recipe.length === 0) return null
    const limits = recipe.map(r => {
      const supply = supplyItems.find(s => s.id === r.supply_item_id)
      if (!supply || r.cantidad === 0) return Infinity
      return Math.floor(supply.stock_actual / r.cantidad)
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
