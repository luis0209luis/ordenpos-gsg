import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme, useSettings } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { useFinance } from '../context/FinanceContext'
import { Plus, Edit2, Trash2, AlertTriangle, Search, X, Check, PackagePlus, Copy, GripVertical } from 'lucide-react'

const DEFAULT_UNITS = [
  { value: 'unidad', label: 'Unidad (und)' },
  { value: 'libra', label: 'Libra (lb)' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'gramo', label: 'Gramo (g)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'onza', label: 'Onza (oz)' },
  { value: 'galon', label: 'Galón (gal)' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'pote', label: 'Pote' },
  { value: 'caja', label: 'Caja' },
  { value: 'saco', label: 'Saco' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'lata', label: 'Lata' }
]

export default function Inventory() {
  const { theme } = useTheme() || {}
  const isDark = theme === 'dark'
  const {
    products = [],
    addProduct,
    updateProduct,
    deleteProduct,
    supplyItems = [],
    addSupplyItem,
    updateSupplyItem,
    deleteSupplyItem,
    productRecipes = [],
    saveProductRecipe,
    getEstimatedStock
  } = useInventory() || {}
  const { settings = {} } = useSettings() || {}
  const { addExpense } = useFinance() || {}

  // Tabs State
  const [activeTab, setActiveTab] = useState('products')

  // Product Inventory Search & Modal
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [formData, setFormData] = useState({
    nombre: '', precio: '', stock_actual: '', stock_minimo: '', categoria: '', image_url: '', inventory_mode: 'finished'
  })
  const [recipeItems, setRecipeItems] = useState([])
  const [blendConfig, setBlendConfig] = useState({
    cup_supply_id: '',
    cup_capacity: 16,
    fixed_supplies: [],
    flavor_ids: []
  })

  // Supply Items Modal & Adjustment
  const [supplySearchTerm, setSupplySearchTerm] = useState('')
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false)
  const [editingSupplyItem, setEditingSupplyItem] = useState(null)
  const [supplyFormData, setSupplyFormData] = useState({
    nombre: '',
    unidad: 'unidad',
    stock_actual: 0,
    stock_minimo: 1,
    stock_actual_empaque: 0,
    stock_minimo_empaque: 1,
    precio_unitario: 0,  // stored as per-unit cost in DB
    precio_empaque: 0,   // what the user actually enters (price per package/unit shown)
    pack_large_unit: 'unidad',
    pack_large_ratio: 1,
    pack_medium_unit: '',
    pack_medium_ratio: 1,
    hasPackagingConfig: false,
    ubicacion: ''
  })
  const [supplyErrorMsg, setSupplyErrorMsg] = useState('')
  const [supplyActiveTab, setSupplyActiveTab] = useState('general') // 'general' | 'packaging'

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustingSupplyItem, setAdjustingSupplyItem] = useState(null)
  const [adjustNewStock, setAdjustNewStock] = useState('')

  // Stock Entry Modal (Ingreso de Mercancía)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [entryTarget, setEntryTarget] = useState(null) // { type: 'product' | 'supply', item }
  const [entryQty, setEntryQty] = useState('')
  const [entryUnitPrice, setEntryUnitPrice] = useState('')
  const [entryTotalCost, setEntryTotalCost] = useState('')
  const [entryRecordExpense, setEntryRecordExpense] = useState(true)
  const [entryCategory, setEntryCategory] = useState('Insumos')
  const [entryUnitType, setEntryUnitType] = useState('base') // 'base' | 'medium' | 'large'

  const DEFAULT_CATEGORIES = ['Bebida', 'Comida Rápida', 'Repostería', 'Pan'];
  const [customCategories, setCustomCategories] = useState([]);
  const [deletedCategories, setDeletedCategories] = useState(() => {
    return JSON.parse(localStorage.getItem('ordenpos_deleted_categories') || '[]');
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const availableCategories = [...new Set([...DEFAULT_CATEGORIES, ...(products || []).map(p => p?.categoria || 'Sin Categoría'), ...customCategories])]
    .filter(c => !deletedCategories.includes(c) && c !== 'Sin Categoría');

  const [customUnits, setCustomUnits] = useState(() => {
    return JSON.parse(localStorage.getItem('ordenpos_custom_units') || '[]');
  });

  const [deletedUnits, setDeletedUnits] = useState(() => {
    return JSON.parse(localStorage.getItem('ordenpos_deleted_units') || '[]');
  });

  const [isCreatingUnit, setIsCreatingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  // Unificamos las unidades disponibles (defecto + personalizadas + en uso)
  const availableUnits = (() => {
    const supplyUnits = (supplyItems || []).map(s => s.unidad).filter(Boolean);
    const allUnitsMap = new Map();
    
    DEFAULT_UNITS.forEach(u => {
      if (!deletedUnits.includes(u.value)) {
        allUnitsMap.set(u.value, u.label);
      }
    });
    
    customUnits.forEach(u => {
      allUnitsMap.set(u.value, u.label);
    });
    
    supplyUnits.forEach(u => {
      if (!allUnitsMap.has(u)) {
        allUnitsMap.set(u, u.charAt(0).toUpperCase() + u.slice(1));
      }
    });

    return Array.from(allUnitsMap.entries()).map(([value, label]) => ({ value, label }));
  })();

  const handleCreateUnit = () => {
    const newUnit = newUnitName.trim();
    if (newUnit) {
      const value = newUnit.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
      const label = newUnit.charAt(0).toUpperCase() + newUnit.slice(1);
      
      // Si estaba eliminada, la restauramos
      if (deletedUnits.includes(value)) {
        const newDeleted = deletedUnits.filter(u => u !== value);
        setDeletedUnits(newDeleted);
        localStorage.setItem('ordenpos_deleted_units', JSON.stringify(newDeleted));
      }

      setCustomUnits(prev => {
        if (!prev.some(u => u.value === value)) {
          const updated = [...prev, { value, label }];
          localStorage.setItem('ordenpos_custom_units', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });

      setSupplyFormData(prev => ({ ...prev, unidad: value }));
      setIsCreatingUnit(false);
      setNewUnitName('');
    }
  };

  const handleDeleteUnit = (unitToDelete) => {
    const inUse = (supplyItems || []).some(s => s.unidad === unitToDelete);
    if (inUse) {
      const confirmDelete = window.confirm(
        `La unidad "${unitToDelete}" está siendo usada por algunos insumos. Si la eliminas, esos insumos cambiarán a "Unidad (unidad)". ¿Deseas continuar?`
      );
      if (!confirmDelete) return;

      // Actualizar los insumos en uso
      const suppliesToUpdate = (supplyItems || []).filter(s => s.unidad === unitToDelete);
      suppliesToUpdate.forEach(s => {
        updateSupplyItem(s.id, { ...s, unidad: 'unidad' });
      });
    }

    const isDefault = DEFAULT_UNITS.some(u => u.value === unitToDelete);
    if (isDefault) {
      const newDeleted = [...deletedUnits, unitToDelete];
      setDeletedUnits(newDeleted);
      localStorage.setItem('ordenpos_deleted_units', JSON.stringify(newDeleted));
    }

    setCustomUnits(prev => {
      const updated = prev.filter(u => u.value !== unitToDelete);
      localStorage.setItem('ordenpos_custom_units', JSON.stringify(updated));
      return updated;
    });

    if (supplyFormData.unidad === unitToDelete) {
      setSupplyFormData(prev => ({ ...prev, unidad: 'unidad' }));
    }
  };

  const [autoImage, setAutoImage] = useState(null)
  const [customImage, setCustomImage] = useState(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      const name = formData.nombre?.toLowerCase() || '';
      const cat = formData.categoria?.toLowerCase() || '';

      let detectedImg = null;
      if (cat.includes('bebida')) {
        if (name.includes('coca') || name.includes('pepsi') || name.includes('gaseosa')) {
          detectedImg = '/assets/soda_bottle.png';
        } else if (name.includes('granizado') || name.includes('frappe')) {
          detectedImg = '/assets/slushie_cup.png';
        }
      } else if (cat.includes('panadería') || cat.includes('panaderia') || cat.includes('postre')) {
        if (name.includes('pan') || name.includes('croissant') || name.includes('bono')) {
          detectedImg = '/assets/bakery_item.png';
        }
      }
      setAutoImage(detectedImg);
    }, 500);
    return () => clearTimeout(handler);
  }, [formData.nombre, formData.categoria])

  useEffect(() => {
    if (!customImage) {
      setFormData(prev => ({ ...prev, image_url: autoImage || '' }));
    }
  }, [autoImage, customImage])

  // Ajustar precio unitario y costo total en Entrada de Mercancía según la unidad elegida
  useEffect(() => {
    if (entryTarget && entryTarget.type === 'supply') {
      const item = entryTarget.item
      const basePrice = item.precio_unitario || 0
      let multiplier = 1
      if (entryUnitType === 'medium') {
        multiplier = parseFloat(item.pack_medium_ratio) || 1
      } else if (entryUnitType === 'large') {
        multiplier = parseFloat(item.pack_large_ratio) || 1
      }
      const adjustedPrice = basePrice * multiplier
      setEntryUnitPrice(adjustedPrice || '')
      
      const qty = parseFloat(entryQty) || 0
      if (qty > 0 && adjustedPrice > 0) {
        setEntryTotalCost((qty * adjustedPrice).toFixed(0))
      } else {
        setEntryTotalCost('')
      }
    }
  }, [entryUnitType])

  const formatStockWithPackages = (stockVal, item) => {
    const stock = Number(stockVal || 0)
    if (!item.pack_large_unit && !item.pack_medium_unit) {
      return `${stock} ${item.unidad || 'und'}`
    }

    const parts = []
    let tempStock = stock

    const getPlural = (unit, qty) => {
      if (qty === 1 || !unit) return unit
      if (['a', 'e', 'o'].includes(unit.slice(-1).toLowerCase())) {
        return unit + 's'
      }
      return unit
    }

    // Empaque Grande
    if (item.pack_large_unit && item.pack_large_ratio && Number(item.pack_large_ratio) > 1) {
      const largeRatio = Number(item.pack_large_ratio)
      const largeQty = Math.floor(tempStock / largeRatio)
      if (largeQty > 0) {
        parts.push(`${largeQty} ${getPlural(item.pack_large_unit, largeQty)}`)
        tempStock = tempStock % largeRatio
      }
    }

    // Empaque Mediano
    if (item.pack_medium_unit && item.pack_medium_ratio && Number(item.pack_medium_ratio) > 1) {
      const mediumRatio = Number(item.pack_medium_ratio)
      const mediumQty = Math.floor(tempStock / mediumRatio)
      if (mediumQty > 0) {
        parts.push(`${mediumQty} ${getPlural(item.pack_medium_unit, mediumQty)}`)
        tempStock = tempStock % mediumRatio
      }
    }

    // Unidades sueltas (unidad base)
    if (tempStock > 0 || parts.length === 0) {
      const displayStock = Number(tempStock.toFixed(2))
      parts.push(`${displayStock} ${getPlural(item.unidad || 'und', displayStock)}`)
    }

    return parts.join(' - ')
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Comprimir la imagen a formato WebP con 80% de calidad
          const dataUrl = canvas.toDataURL('image/webp', 0.8);

          setCustomImage(dataUrl);
          setFormData(prev => ({ ...prev, image_url: dataUrl }));
        };
        img.src = reader.result;
      }
      reader.readAsDataURL(file);
    }
  }

  const handleDeleteCategory = (catToDelete) => {
    // Update products
    const productsToUpdate = (products || []).filter(p => p.categoria === catToDelete);
    productsToUpdate.forEach(p => {
      updateProduct(p.id, { ...p, categoria: 'Sin Categoría' });
    });

    // Save deletion
    const newDeleted = [...deletedCategories, catToDelete];
    setDeletedCategories(newDeleted);
    localStorage.setItem('ordenpos_deleted_categories', JSON.stringify(newDeleted));

    setCustomCategories(prev => prev.filter(c => c !== catToDelete));
    if (formData.categoria === catToDelete) {
      setFormData({ ...formData, categoria: '' });
    }
  }

  const handleCreateCategory = () => {
    const newCat = newCategoryName.trim();
    if (newCat) {
      // Si estaba eliminada, restaurarla
      if (deletedCategories.includes(newCat)) {
        const newDeleted = deletedCategories.filter(c => c !== newCat);
        setDeletedCategories(newDeleted);
        localStorage.setItem('ordenpos_deleted_categories', JSON.stringify(newDeleted));
      }

      setCustomCategories(prev => {
        if (!prev.includes(newCat)) return [...prev, newCat];
        return prev;
      });
      setFormData(prev => ({ ...prev, categoria: newCat }));
      setIsCreatingCategory(false);
      setNewCategoryName('');
    }
  };

  const filteredProducts = (products || []).filter(p => {
    const nombre = p?.nombre || ''
    const categoria = p?.categoria || ''
    return nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoria.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const location = useLocation()

  useEffect(() => {
    if (location.state?.editProductId && (products || []).length > 0) {
      const productToEdit = (products || []).find(p => p.id === location.state.editProductId)
      if (productToEdit) {
        setEditingProduct(productToEdit)
        setFormData(productToEdit)
        setCustomImage(productToEdit.image_url?.startsWith('data:image') ? productToEdit.image_url : null)
        setIsModalOpen(true)
        // Clear the state so it doesn't reopen on refresh
        window.history.replaceState({}, document.title)
      }
    }
  }, [location.state, products])

  const openModal = (product = null) => {
    setErrorMsg('')
    if (product) {
      setEditingProduct(product)
      setFormData({
        ...product,
        nombre: product.nombre || '',
        categoria: product.categoria || '',
        image_url: product.image_url || '',
        inventory_mode: product.inventory_mode || 'finished',
        stock_actual: product.stock_actual || 0,
        stock_minimo: product.stock_minimo || 10,
      })
      // Load recipe items
      const existing = (productRecipes || []).filter(r => r.product_id === product.id)
      setRecipeItems(existing.map(r => ({ supply_item_id: r.supply_item_id, cantidad: Number(r.cantidad) })))
      
      // Load blend config
      if (product.inventory_mode === 'blend' && product.blend_config) {
        setBlendConfig({
          cup_supply_id: product.blend_config.cup_supply_id || '',
          cup_capacity: Number(product.blend_config.cup_capacity) || 16,
          fixed_supplies: Array.isArray(product.blend_config.fixed_supplies) ? product.blend_config.fixed_supplies : [],
          flavor_ids: Array.isArray(product.blend_config.flavor_ids) ? product.blend_config.flavor_ids : []
        })
      } else {
        const defaultCup = supplyItems.find(s => s.nombre.toLowerCase().includes('vaso') || s.nombre.toLowerCase().includes('copa'))?.id || supplyItems[0]?.id || ''
        setBlendConfig({
          cup_supply_id: defaultCup,
          cup_capacity: 16,
          fixed_supplies: [],
          flavor_ids: []
        })
      }
      
      setCustomImage(product.image_url?.startsWith('data:image') ? product.image_url : null)
    } else {
      setEditingProduct(null)
      setFormData({
        nombre: '',
        precio: '',
        stock_actual: '',
        stock_minimo: settings?.globalMinStock || 10,
        categoria: availableCategories[0] || 'Sin Categoría',
        inventory_mode: 'finished',
        image_url: '',
      })
      setRecipeItems([])
      const defaultCup = supplyItems.find(s => s.nombre.toLowerCase().includes('vaso') || s.nombre.toLowerCase().includes('copa'))?.id || supplyItems[0]?.id || ''
      setBlendConfig({
        cup_supply_id: defaultCup,
        cup_capacity: 16,
        fixed_supplies: [],
        flavor_ids: []
      })
      setCustomImage(null)
    }
    setIsCreatingCategory(false)
    setIsModalOpen(true)
  }

  const handleDuplicateProduct = (product) => {
    setErrorMsg('')
    setEditingProduct(null)
    setFormData({
      ...product,
      nombre: product.nombre ? `Copia de ${product.nombre}` : 'Copia de Producto',
      stock_actual: product.inventory_mode === 'finished' ? (product.stock_actual || 0) : '',
      stock_minimo: product.stock_minimo || 10,
      image_url: product.image_url || '',
      inventory_mode: product.inventory_mode || 'finished',
      categoria: product.categoria || (availableCategories[0] || 'Sin Categoría'),
    })
    // Copy recipe if recipe mode
    const existing = (productRecipes || []).filter(r => r.product_id === product.id)
    setRecipeItems(existing.map(r => ({ supply_item_id: r.supply_item_id, cantidad: Number(r.cantidad) })))
    // Copy blend config if blend mode
    if (product.inventory_mode === 'blend' && product.blend_config) {
      setBlendConfig({
        cup_supply_id: product.blend_config.cup_supply_id || '',
        cup_capacity: Number(product.blend_config.cup_capacity) || 16,
        fixed_supplies: Array.isArray(product.blend_config.fixed_supplies) ? [...product.blend_config.fixed_supplies] : [],
        flavor_ids: Array.isArray(product.blend_config.flavor_ids) ? [...product.blend_config.flavor_ids] : []
      })
    } else {
      const defaultCup = supplyItems.find(s => s.nombre.toLowerCase().includes('vaso') || s.nombre.toLowerCase().includes('copa'))?.id || supplyItems[0]?.id || ''
      setBlendConfig({ cup_supply_id: defaultCup, cup_capacity: 16, fixed_supplies: [], flavor_ids: [] })
    }
    setCustomImage(product.image_url?.startsWith('data:image') ? product.image_url : null)
    setIsCreatingCategory(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setBlendConfig({
      cup_supply_id: '',
      cup_capacity: 16,
      fixed_supplies: [],
      flavor_ids: []
    })
    setErrorMsg('')
  }

  const openSupplyModal = (item = null) => {
    setSupplyErrorMsg('')
    if (item) {
      setEditingSupplyItem(item)
      // Backward-compatible loading: map either large or medium pack to pack_large fields
      const packUnit = item.pack_large_unit || item.pack_medium_unit || 'unidad'
      const packRatio = item.pack_large_unit
        ? (item.pack_large_ratio || 1)
        : (item.pack_medium_unit ? (item.pack_medium_ratio || 1) : 1)
      const ratio = parseFloat(packRatio) || 1
      const precioEmpaque = (item.precio_unitario || 0) * ratio
      const stockActualEmpaque = (item.stock_actual || 0) / ratio
      const stockMinimoEmpaque = (item.stock_minimo || 0) / ratio
      setSupplyFormData({
        nombre: item.nombre || '',
        unidad: item.unidad || 'unidad',
        stock_actual: item.stock_actual !== undefined ? item.stock_actual : 0,
        stock_minimo: item.stock_minimo !== undefined ? item.stock_minimo : 1,
        stock_actual_empaque: stockActualEmpaque,
        stock_minimo_empaque: stockMinimoEmpaque,
        precio_unitario: item.precio_unitario !== undefined ? item.precio_unitario : 0,
        precio_empaque: precioEmpaque,
        pack_large_unit: packUnit,
        pack_large_ratio: ratio,
        pack_medium_unit: '',
        pack_medium_ratio: 1,
        hasPackagingConfig: true,
        ubicacion: item.ubicacion || ''
      })
    } else {
      setEditingSupplyItem(null)
      setSupplyFormData({
        nombre: '',
        unidad: 'unidad',
        stock_actual: 0,
        stock_minimo: 1,
        stock_actual_empaque: 0,
        stock_minimo_empaque: 1,
        precio_unitario: 0,
        precio_empaque: 0,
        pack_large_unit: 'unidad',
        pack_large_ratio: 1,
        pack_medium_unit: '',
        pack_medium_ratio: 1,
        hasPackagingConfig: false,
        ubicacion: ''
      })
    }
    setIsSupplyModalOpen(true)
  }

  const handleDuplicateSupply = (item) => {
    setSupplyErrorMsg('')
    setEditingSupplyItem(null)
    // Backward-compatible loading: map either large or medium pack to pack_large fields
    const packUnit = item.pack_large_unit || item.pack_medium_unit || 'unidad'
    const packRatio = item.pack_large_unit
      ? (item.pack_large_ratio || 1)
      : (item.pack_medium_unit ? (item.pack_medium_ratio || 1) : 1)
    const ratio = parseFloat(packRatio) || 1
    const precioEmpaque = (item.precio_unitario || 0) * ratio
    const stockActualEmpaque = (item.stock_actual || 0) / ratio
    const stockMinimoEmpaque = (item.stock_minimo || 0) / ratio
    setSupplyFormData({
      nombre: item.nombre ? `Copia de ${item.nombre}` : 'Copia de Insumo',
      unidad: item.unidad || 'unidad',
      stock_actual: item.stock_actual !== undefined ? item.stock_actual : 0,
      stock_minimo: item.stock_minimo !== undefined ? item.stock_minimo : 1,
      stock_actual_empaque: stockActualEmpaque,
      stock_minimo_empaque: stockMinimoEmpaque,
      precio_unitario: item.precio_unitario !== undefined ? item.precio_unitario : 0,
      precio_empaque: precioEmpaque,
      pack_large_unit: packUnit,
      pack_large_ratio: ratio,
      pack_medium_unit: '',
      pack_medium_ratio: 1,
      hasPackagingConfig: true,
      ubicacion: item.ubicacion || ''
    })
    setIsSupplyModalOpen(true)
  }

  const openAdjustModal = (item) => {
    setAdjustingSupplyItem(item)
    setAdjustNewStock(item.stock_actual)
    setIsAdjustModalOpen(true)
  }

  const openEntryModal = (type, item) => {
    setEntryTarget({ type, item })
    setEntryQty('')
    // Default to package presentation: prefer medium (bolsa/paquete), then large (saco/caja),
    // only fall back to base (litro/unidad) if no packaging is configured.
    const defaultUnitType = type === 'supply' && item.pack_medium_unit
      ? 'medium'
      : type === 'supply' && item.pack_large_unit
        ? 'large'
        : 'base'
    setEntryUnitType(defaultUnitType)
    // Set default price based on chosen unit type
    let defaultPrice = 0
    if (type === 'supply') {
      if (defaultUnitType === 'medium') {
        defaultPrice = (item.precio_unitario || 0) * (parseFloat(item.pack_medium_ratio) || 1)
      } else if (defaultUnitType === 'large') {
        defaultPrice = (item.precio_unitario || 0) * (parseFloat(item.pack_large_ratio) || 1)
      } else {
        defaultPrice = item.precio_unitario || 0
      }
    }
    setEntryUnitPrice(defaultPrice || '')
    setEntryTotalCost('')
    setEntryRecordExpense(type === 'supply')
    setEntryCategory(type === 'supply' ? 'Insumos' : 'Otros')
    setIsEntryModalOpen(true)
  }

  const handleStockEntrySubmit = async (e) => {
    e.preventDefault()
    const qty = parseFloat(entryQty)
    if (isNaN(qty) || qty <= 0) {
      alert('Ingresa una cantidad válida mayor a 0.')
      return
    }
    try {
      let baseQty = qty
      let ratioMultiplier = 1
      if (entryTarget.type === 'supply') {
        const s = entryTarget.item
        if (entryUnitType === 'medium' && s.pack_medium_ratio) {
          ratioMultiplier = parseFloat(s.pack_medium_ratio) || 1
        } else if (entryUnitType === 'large' && s.pack_large_ratio) {
          ratioMultiplier = parseFloat(s.pack_large_ratio) || 1
        }
        baseQty = qty * ratioMultiplier
      }

      if (entryTarget.type === 'product') {
        const p = entryTarget.item
        await updateProduct(p.id, { stock_actual: (p.stock_actual || 0) + qty })
      } else {
        const s = entryTarget.item
        await updateSupplyItem(s.id, { stock_actual: (s.stock_actual || 0) + baseQty })
      }

      if (entryRecordExpense) {
        const totalCost = parseFloat(entryTotalCost) || 0
        if (totalCost > 0) {
          const item = entryTarget.item
          const name = item.nombre
          const displayUnit = entryTarget.type === 'supply'
            ? (entryUnitType === 'medium' ? (item.pack_medium_unit || 'paquete') : entryUnitType === 'large' ? (item.pack_large_unit || 'caja') : (item.unidad || 'und'))
            : 'und'
          const description = `Compra de Insumo: ${qty} ${displayUnit} de ${name}`
          
          await addExpense({
            description,
            amount: totalCost,
            category: entryCategory,
            date: new Date().toISOString()
          })
        }
      }

      setIsEntryModalOpen(false)
      setEntryTarget(null)
      setEntryQty('')
      setEntryUnitPrice('')
      setEntryTotalCost('')
    } catch (err) {
      console.error(err)
      alert('Error al registrar la entrada. Inténtalo de nuevo.')
    }
  }

  const handleAddRecipeItem = () => {
    const unused = supplyItems.find(s => !recipeItems.some(ri => ri.supply_item_id === s.id))
    const defaultId = unused ? unused.id : (supplyItems[0]?.id || '')
    if (!defaultId) {
      alert("Primero debes crear insumos en la sección de Bodega.")
      return
    }
    setRecipeItems(prev => [...prev, { supply_item_id: defaultId, cantidad: 1 }])
  }

  const handleRemoveRecipeItem = (index) => {
    setRecipeItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleRecipeItemChange = (index, field, value) => {
    setRecipeItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleAddBlendFixedSupply = () => {
    const unused = supplyItems.find(s => s.id !== blendConfig.cup_supply_id && !blendConfig.fixed_supplies.some(fs => fs.supply_item_id === s.id))
    const defaultId = unused ? unused.id : (supplyItems[0]?.id || '')
    if (!defaultId) {
      alert("Primero debes crear insumos en la sección de Bodega.")
      return
    }
    setBlendConfig(prev => ({
      ...prev,
      fixed_supplies: [...prev.fixed_supplies, { supply_item_id: defaultId, cantidad: 1 }]
    }))
  }

  const handleRemoveBlendFixedSupply = (index) => {
    setBlendConfig(prev => ({
      ...prev,
      fixed_supplies: prev.fixed_supplies.filter((_, i) => i !== index)
    }))
  }

  const handleBlendFixedSupplyChange = (index, field, value) => {
    setBlendConfig(prev => ({
      ...prev,
      fixed_supplies: prev.fixed_supplies.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  const handleBlendFlavorToggle = (flavorId) => {
    setBlendConfig(prev => {
      const exists = prev.flavor_ids.includes(flavorId)
      return {
        ...prev,
        flavor_ids: exists 
          ? prev.flavor_ids.filter(id => id !== flavorId) 
          : [...prev.flavor_ids, flavorId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setErrorMsg('')

      const finalImage = formData.image_url || autoImage || ''
      const finalCategoria = formData.categoria || 'Sin Categoría'
      const finalNombre = formData.nombre || 'Producto'
      
      const isFinished = formData.inventory_mode === 'finished' || !formData.inventory_mode
      const isRecipe = formData.inventory_mode === 'recipe'
      const isBlend = formData.inventory_mode === 'blend'
      const isUnlimited = formData.inventory_mode === 'unlimited'

      if (isBlend && (!blendConfig.cup_supply_id || blendConfig.flavor_ids.length === 0)) {
        setErrorMsg("Para el modo combinado debes configurar el vaso/envase y al menos un sabor disponible.")
        return
      }

      const productData = {
        ...formData,
        nombre: finalNombre,
        categoria: finalCategoria,
        image_url: finalImage,
        precio: parseFloat(formData.precio) || 0,
        stock_actual: isFinished ? (parseInt(formData.stock_actual) || 0) : 0,
        stock_minimo: isUnlimited ? 0 : (parseInt(formData.stock_minimo) || 0),
        inventory_mode: formData.inventory_mode || 'finished',
        is_customizable: false,
        max_selections: 1,
        blend_config: isBlend ? {
          cup_supply_id: blendConfig.cup_supply_id || null,
          cup_capacity: parseFloat(blendConfig.cup_capacity) || 16,
          fixed_supplies: blendConfig.fixed_supplies.filter(fs => fs.supply_item_id && fs.cantidad > 0),
          flavor_ids: blendConfig.flavor_ids
        } : null
      }

      if (isNaN(productData.stock_minimo)) {
        productData.stock_minimo = settings?.globalMinStock || 10
      }

      let savedProduct;
      if (editingProduct) {
        savedProduct = await updateProduct(editingProduct.id, productData)
      } else {
        savedProduct = await addProduct(productData)
      }

      // Guardar receta si el modo es recipe
      if (savedProduct && savedProduct.id) {
        if (isRecipe) {
          const cleanRecipeItems = recipeItems.filter(r => r.supply_item_id && r.cantidad > 0)
          await saveProductRecipe(savedProduct.id, cleanRecipeItems)
        } else {
          // Si cambió de receta a otro modo, eliminar la receta existente
          await saveProductRecipe(savedProduct.id, [])
        }
      }

      closeModal()
    } catch (error) {
      console.error("Error al guardar el producto en Inventory.jsx:", error)
      setErrorMsg(error?.message || "Ocurrió un error al guardar en Supabase. Verifica los datos y vuelve a intentar.")
    }
  }

  const handleSupplySubmit = async (e) => {
    e.preventDefault()
    try {
      setSupplyErrorMsg('')
      if (!supplyFormData.nombre?.trim()) {
        setSupplyErrorMsg('El nombre del insumo es obligatorio.')
        return
      }

      // Determine the ratio used for price calculation
      const packRatio = parseFloat(supplyFormData.pack_large_ratio) || 1
      
      // precio_empaque is what the user entered (price per package/box)
      // precio_unitario stored in DB = precio_empaque / packRatio (per base unit)
      const precioEmpaque = parseFloat(supplyFormData.precio_empaque) || 0
      const precioUnitario = packRatio > 1 ? precioEmpaque / packRatio : precioEmpaque
      
      // stock in base units = stock_empaques * packRatio
      const stockActual = (parseFloat(supplyFormData.stock_actual_empaque) || 0) * packRatio
      const stockMinimo = (parseFloat(supplyFormData.stock_minimo_empaque) || 0) * packRatio

      const itemData = {
        nombre: supplyFormData.nombre,
        unidad: supplyFormData.unidad,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        precio_unitario: precioUnitario,
        pack_large_unit: supplyFormData.pack_large_unit || 'unidad',
        pack_large_ratio: packRatio,
        pack_medium_unit: null,
        pack_medium_ratio: 1,
        ubicacion: supplyFormData.ubicacion?.trim() || null
      }
      if (editingSupplyItem) {
        await updateSupplyItem(editingSupplyItem.id, itemData)
      } else {
        await addSupplyItem(itemData)
      }
      setIsSupplyModalOpen(false)
      setEditingSupplyItem(null)
    } catch (err) {
      console.error("Error al guardar insumo:", err)
      setSupplyErrorMsg(err?.message || "Error al guardar el insumo. Verifica los datos.")
    }
  }

  const handleAdjustSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!adjustingSupplyItem) return
      const newStockValue = parseFloat(adjustNewStock)
      if (isNaN(newStockValue) || newStockValue < 0) {
        alert("Por favor ingrese un valor de stock válido y mayor o igual a 0.")
        return
      }
      await updateSupplyItem(adjustingSupplyItem.id, { stock_actual: newStockValue })
      setIsAdjustModalOpen(false)
      setAdjustingSupplyItem(null)
      setAdjustNewStock('')
    } catch (err) {
      console.error(err)
      alert("Error al realizar el ajuste manual.")
    }
  }

  // --- Drag & Drop order for supplies ---
  const [supplyOrder, setSupplyOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ordenpos_supply_order') || '[]') } catch { return [] }
  })
  const dragSupplyId = useRef(null)
  const dragOverSupplyId = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)

  // Apply custom order: sort supplyItems by stored order, then append any new items at the end
  const orderedSupplies = (() => {
    const all = supplyItems || []
    if (supplyOrder.length === 0) return all
    const orderMap = {}
    supplyOrder.forEach((id, idx) => { orderMap[id] = idx })
    return [...all].sort((a, b) => {
      const ia = orderMap[a.id] ?? 999999
      const ib = orderMap[b.id] ?? 999999
      return ia - ib
    })
  })()

  const filteredSupplies = orderedSupplies.filter(s =>
    (s.nombre || '').toLowerCase().includes(supplySearchTerm.toLowerCase())
  )

  const handleSupplyDragStart = (e, id) => {
    dragSupplyId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleSupplyDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverSupplyId.current = id
    setDragOverId(id)
  }

  const handleSupplyDrop = (e, id) => {
    e.preventDefault()
    const fromId = dragSupplyId.current
    const toId = id
    if (!fromId || fromId === toId) { setDragOverId(null); return }
    // Build new ordered list based on current visible order
    const currentIds = orderedSupplies.map(s => s.id)
    const fromIdx = currentIds.indexOf(fromId)
    const toIdx = currentIds.indexOf(toId)
    if (fromIdx === -1 || toIdx === -1) { setDragOverId(null); return }
    const newIds = [...currentIds]
    newIds.splice(fromIdx, 1)
    newIds.splice(toIdx, 0, fromId)
    setSupplyOrder(newIds)
    localStorage.setItem('ordenpos_supply_order', JSON.stringify(newIds))
    dragSupplyId.current = null
    dragOverSupplyId.current = null
    setDragOverId(null)
  }

  const handleSupplyDragEnd = () => {
    dragSupplyId.current = null
    dragOverSupplyId.current = null
    setDragOverId(null)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Tabs de Navegación */}
      <div className="flex gap-4 border-b pb-2 border-gray-200 dark:border-dark-border">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-display font-bold text-sm uppercase tracking-wider transition-all border-b-2
            ${activeTab === 'products'
              ? 'border-gold-500 text-gold-500 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          📦 Catálogo de Productos
        </button>
        <button
          onClick={() => setActiveTab('supplies')}
          className={`px-4 py-2 font-display font-bold text-sm uppercase tracking-wider transition-all border-b-2
            ${activeTab === 'supplies'
              ? 'border-gold-500 text-gold-500 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          🧪 Bodega / Insumos
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Header Actions - Productos */}
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-3xl shadow-soft-lg
            ${isDark ? 'bg-dark-surface border border-dark-border' : 'bg-white border border-light-border'}`}>

            <div className="relative w-full md:w-96">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none
                ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all duration-200
                  focus:border-gold-500 focus:shadow-gold-sm
                  ${isDark ? 'bg-dark-card border-dark-border text-white placeholder-gray-600'
                    : 'bg-light-surface border-light-border text-gray-900 placeholder-gray-400'}`}
              />
            </div>

            <button
              onClick={() => openModal()}
              className="px-6 py-3 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center gap-2
              bg-gold-gradient text-dark-bg shadow-gold-md hover:shadow-gold-lg
              hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 whitespace-nowrap"
            >
              <Plus size={18} />
              Nuevo Producto
            </button>
          </div>

          {/* Inventory Table - Productos */}
          <div className={`rounded-3xl overflow-hidden shadow-soft-lg border
            ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wider
                    ${isDark ? 'border-dark-border bg-dark-card text-gray-400' : 'border-light-border bg-light-surface text-gray-500'}`}>
                    <th className="px-6 py-4 font-semibold">Producto</th>
                    <th className="px-6 py-4 font-semibold">Categoría</th>
                    <th className="px-6 py-4 font-semibold text-right">Precio</th>
                    <th className="px-6 py-4 font-semibold text-center">Stock Actual</th>
                    <th className="px-6 py-4 font-semibold text-center">Estado</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={`px-6 py-8 text-center text-sm font-medium
                        ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No se encontraron productos.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const currentMinStock = product.stock_minimo !== undefined && product.stock_minimo !== null
                        ? product.stock_minimo
                        : (settings?.globalMinStock || 10)

                      const isRecipe = product.inventory_mode === 'recipe'
                      const isBlend = product.inventory_mode === 'blend'
                      const isUnlimited = product.inventory_mode === 'unlimited'

                      const estimatedStock = (isRecipe || isBlend) && getEstimatedStock ? getEstimatedStock(product.id) : null
                      const displayStock = (isRecipe || isBlend)
                        ? (estimatedStock !== null ? estimatedStock : 0)
                        : (product.stock_actual ?? 0)

                      const isLowStock = !isUnlimited && (displayStock <= currentMinStock)

                      return (
                        <tr key={product.id} className={`border-b last:border-0 transition-colors duration-200 hover:bg-gold-500/5
                          ${isDark ? 'border-dark-border text-gray-300' : 'border-light-border text-gray-700'}`}>
                          <td className={`px-6 py-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {product.nombre}
                            {isRecipe && (
                              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-500 border border-gold-500/20">
                                Receta
                              </span>
                            )}
                            {isBlend && (
                              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                Combinado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">{product.categoria}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold">
                            ${Number(product.precio).toLocaleString('es-CO')}
                          </td>
                          <td className={`px-6 py-4 text-center font-bold font-display text-base
                            ${isUnlimited ? 'text-gray-500' : isLowStock ? 'text-red-500' : (isDark ? 'text-gold-400' : 'text-gold-600')}`}>
                            {isUnlimited ? (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                                Ilimitado
                              </span>
                            ) : (isRecipe || isBlend) ? (
                              <span title={isRecipe ? "Stock estimado en base a insumos de receta" : "Stock estimado en base a insumos de combinado"}>
                                ~{displayStock} <span className="text-[10px] font-sans font-normal opacity-75">unds est.</span>
                              </span>
                            ) : (
                              displayStock
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              {isUnlimited ? (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border
                                  ${isDark ? 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                                    : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                  Sin Límite
                                </span>
                              ) : isLowStock ? (
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                                  ${isDark ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                                    : 'bg-gold-50 border-gold-200 text-gold-700'}`}>
                                  <AlertTriangle size={14} />
                                  Stock Bajo
                                </span>
                              ) : (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border
                                  ${isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                  Óptimo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              {!isUnlimited && !isRecipe && (
                                <button
                                  onClick={() => openEntryModal('product', product)}
                                  title="Registrar entrada de mercancía"
                                  className={`p-2 rounded-xl transition-all
                                    ${isDark ? 'hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400'
                                      : 'hover:bg-emerald-50 text-gray-500 hover:text-emerald-600'}`}>
                                  <PackagePlus size={18} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDuplicateProduct(product)}
                                title="Copiar/Duplicar producto"
                                className={`p-2 rounded-xl transition-all
                                  ${isDark ? 'hover:bg-blue-500/10 text-gray-400 hover:text-blue-400'
                                    : 'hover:bg-blue-50 text-gray-500 hover:text-blue-500'}`}
                              >
                                <Copy size={18} />
                              </button>
                              <button onClick={() => openModal(product)} className={`p-2 rounded-xl transition-all
                                ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white'
                                  : 'hover:bg-light-surface text-gray-500 hover:text-gray-900'}`}>
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => deleteProduct(product.id)} className={`p-2 rounded-xl transition-all
                                ${isDark ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-400'
                                  : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}>
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Header Actions - Insumos */}
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-3xl shadow-soft-lg
            ${isDark ? 'bg-dark-surface border border-dark-border' : 'bg-white border border-light-border'}`}>

            <div className="relative w-full md:w-96">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none
                ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Buscar insumos..."
                value={supplySearchTerm}
                onChange={(e) => setSupplySearchTerm(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all duration-200
                  focus:border-gold-500 focus:shadow-gold-sm
                  ${isDark ? 'bg-dark-card border-dark-border text-white placeholder-gray-600'
                    : 'bg-light-surface border-light-border text-gray-900 placeholder-gray-400'}`}
              />
            </div>

            <button
              onClick={() => openSupplyModal()}
              className="px-6 py-3 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center gap-2
              bg-gold-gradient text-dark-bg shadow-gold-md hover:shadow-gold-lg
              hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 whitespace-nowrap"
            >
              <Plus size={18} />
              Nuevo Insumo
            </button>
          </div>

          {/* Table - Insumos */}
          <div className={`rounded-3xl overflow-hidden shadow-soft-lg border
            ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wider
                    ${isDark ? 'border-dark-border bg-dark-card text-gray-400' : 'border-light-border bg-light-surface text-gray-500'}`}>
                    <th className="pl-3 pr-1 py-4 w-8"></th>
                    <th className="px-6 py-4 font-semibold">Insumo</th>
                    <th className="px-6 py-4 font-semibold text-center">Unidad</th>
                    <th className="px-6 py-4 font-semibold text-right">Precio Unitario</th>
                    <th className="px-6 py-4 font-semibold text-center">Stock Actual</th>
                    <th className="px-6 py-4 font-semibold text-center">Stock Mínimo</th>
                    <th className="px-6 py-4 font-semibold text-center">Ubicación</th>
                    <th className="px-6 py-4 font-semibold text-center">Estado</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupplies.length === 0 ? (
                    <tr>
                      <td colSpan="9" className={`px-6 py-8 text-center text-sm font-medium
                        ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        No se encontraron insumos en bodega.
                      </td>
                    </tr>
                  ) : (
                    filteredSupplies.map((item) => {
                      const isLowStock = Number(item.stock_actual) <= Number(item.stock_minimo)
                      const isDragOver = dragOverId === item.id
                      return (
                        <tr
                          key={item.id}
                          onDragOver={(e) => handleSupplyDragOver(e, item.id)}
                          onDrop={(e) => handleSupplyDrop(e, item.id)}
                          onDragEnd={handleSupplyDragEnd}
                          className={`border-b last:border-0 transition-colors duration-200 hover:bg-gold-500/5
                            ${isDragOver ? (isDark ? 'border-t-2 border-t-gold-400 bg-gold-500/10' : 'border-t-2 border-t-gold-500 bg-gold-50') : ''}
                            ${isDark ? 'border-dark-border text-gray-300' : 'border-light-border text-gray-700'}`}>
                          {/* Drag Handle — solo desde aquí se puede arrastrar */}
                          <td className="pl-3 pr-1 py-4 w-8">
                            <span
                              draggable
                              onDragStart={(e) => handleSupplyDragStart(e, item.id)}
                              title="Arrastra para reordenar"
                              className={`flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity
                                ${isDark ? 'text-gray-500 hover:text-gold-400' : 'text-gray-300 hover:text-gold-500'}`}
                              style={{ opacity: 0.45 }}
                            >
                              <GripVertical size={18} />
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {item.nombre}
                          </td>
                          <td className="px-6 py-4 text-sm text-center capitalize">{item.unidad}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold">
                            {/* Show price per package if packaging configured, else per base unit */}
                            {(() => {
                              const ratio = (item.pack_medium_unit && (item.pack_medium_ratio || 1) > 1)
                                ? parseFloat(item.pack_medium_ratio)
                                : (item.pack_large_unit && (item.pack_large_ratio || 1) > 1)
                                  ? parseFloat(item.pack_large_ratio)
                                  : 1
                              const packUnit = (item.pack_medium_unit && (item.pack_medium_ratio || 1) > 1)
                                ? item.pack_medium_unit
                                : (item.pack_large_unit && (item.pack_large_ratio || 1) > 1)
                                  ? item.pack_large_unit
                                  : item.unidad
                              const precioMostrar = (item.precio_unitario || 0) * ratio
                              return (
                                <div className="flex flex-col items-end">
                                  <span>${Number(precioMostrar).toLocaleString('es-CO')}</span>
                                  {ratio > 1 && (
                                    <span className="text-[10px] opacity-50 font-normal">
                                      por {packUnit}
                                    </span>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`font-bold font-display text-base tracking-tight
                                ${isLowStock ? 'text-red-500' : (isDark ? 'text-gold-400' : 'text-gold-600')}`}>
                                {formatStockWithPackages(item.stock_actual, item)}
                              </span>
                              {(item.pack_large_unit || item.pack_medium_unit) && (
                                <span className={`text-[10px] opacity-60 font-semibold mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Total: {item.stock_actual} {item.unidad}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`font-semibold text-sm tracking-tight ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {formatStockWithPackages(item.stock_minimo, item)}
                              </span>
                              {(item.pack_large_unit || item.pack_medium_unit) && (
                                <span className={`text-[10px] opacity-60 font-semibold mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Total: {item.stock_minimo} {item.unidad}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-center font-medium">
                            {item.ubicacion ? (
                              <span className={isDark ? 'text-gray-300 font-semibold' : 'text-gray-700 font-semibold'}>
                                {item.ubicacion}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-650">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              {isLowStock ? (
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                                  ${isDark ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                                    : 'bg-gold-50 border-gold-200 text-gold-700'}`}>
                                  <AlertTriangle size={14} />
                                  Bajo
                                </span>
                              ) : (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border
                                  ${isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                  Óptimo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEntryModal('supply', item)}
                                title="Registrar entrada de mercancía"
                                className={`p-2 rounded-xl transition-all
                                  ${isDark ? 'hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400'
                                    : 'hover:bg-emerald-50 text-gray-500 hover:text-emerald-600'}`}
                              >
                                <PackagePlus size={18} />
                              </button>
                              <button
                                onClick={() => handleDuplicateSupply(item)}
                                title="Copiar/Duplicar insumo"
                                className={`p-2 rounded-xl transition-all
                                  ${isDark ? 'hover:bg-blue-500/10 text-gray-400 hover:text-blue-400'
                                    : 'hover:bg-blue-50 text-gray-500 hover:text-blue-500'}`}
                              >
                                <Copy size={18} />
                              </button>
                              <button onClick={() => openSupplyModal(item)} className={`p-2 rounded-xl transition-all
                                ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white'
                                  : 'hover:bg-light-surface text-gray-500 hover:text-gray-900'}`}>
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => deleteSupplyItem(item.id)} className={`p-2 rounded-xl transition-all
                                ${isDark ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-400'
                                  : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}>
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal - Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className={`relative w-full max-w-4xl p-8 rounded-3xl shadow-2xl animate-slide-in-up border max-h-[90vh] overflow-y-auto
            ${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-light-border'}`}>

            <button onClick={closeModal} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-10
              ${isDark ? 'hover:bg-dark-card text-gray-400' : 'hover:bg-light-surface text-gray-500'}`}>
              <X size={20} />
            </button>

            <h2 className={`font-display font-bold text-2xl mb-6
              ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-3">
                <AlertTriangle size={20} />
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              <div className="md:col-span-3">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nombre</label>
                    <input required type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                      ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Precio ($)</label>
                      <input required type="number" step="0.01" min="0" value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })}
                        className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                        ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Categoría</label>
                      {isCreatingCategory ? (
                        <div className="relative w-full">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Nombre categoría..."
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateCategory();
                              } else if (e.key === 'Escape') {
                                setIsCreatingCategory(false);
                                setFormData(prev => ({ ...prev, categoria: availableCategories[0] || 'Sin Categoría' }));
                                setNewCategoryName('');
                              }
                            }}
                            className={`w-full px-4 py-3 pr-12 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                            ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                          />
                          {newCategoryName.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={handleCreateCategory}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gold-gradient text-black rounded-lg hover:scale-105 active:scale-95 transition-all shadow-sm"
                            >
                              <Check size={16} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center w-full">
                          <select
                            required
                            value={formData.categoria}
                            onChange={e => {
                              if (e.target.value === '__NEW__') {
                                setIsCreatingCategory(true);
                                setFormData({ ...formData, categoria: '' });
                              } else {
                                setFormData({ ...formData, categoria: e.target.value });
                              }
                            }}
                            className={`flex-1 min-w-0 px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500 cursor-pointer appearance-none
                            ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                          >
                            <option value="" disabled>Seleccione una categoría</option>
                            {availableCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="__NEW__" className="font-bold text-gold-500">+ Crear nueva categoría</option>
                          </select>

                          {formData.categoria && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteCategory(formData.categoria);
                              }}
                              className={`p-3 rounded-xl transition-colors shrink-0 flex items-center justify-center
                                ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                              title="Eliminar categoría seleccionada"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tipo de Inventario */}
                  <div className="space-y-2">
                    <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tipo de inventario</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { mode: 'finished', icon: '📦', title: 'Stock fijo', desc: 'Tengo el producto listo. Se descuenta al vender.' },
                        { mode: 'recipe', icon: '🧪', title: 'Por receta', desc: 'Lo preparo al momento. Se descuentan insumos.' },
                        { mode: 'blend', icon: '🍹', title: 'Combinado', desc: 'Bebida combinada. El cliente elige sabores.' },
                        { mode: 'unlimited', icon: '♾️', title: 'Sin inventario', desc: 'Servicio o producto ilimitado.' }
                      ].map(opt => (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => setFormData({ ...formData, inventory_mode: opt.mode })}
                          className={`p-3 rounded-2xl border-2 text-left flex flex-col gap-1 transition-all
                            ${formData.inventory_mode === opt.mode
                              ? 'border-gold-500 bg-gold-500/10'
                              : isDark ? 'border-dark-border bg-dark-card hover:border-gray-700' : 'border-light-border bg-light-surface hover:border-gray-300'}`}
                        >
                          <span className="text-lg">{opt.icon}</span>
                          <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{opt.title}</span>
                          <span className={`text-[10px] leading-tight ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stock Form fields based on inventory_mode */}
                  {(formData.inventory_mode === 'finished' || !formData.inventory_mode) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stock Actual</label>
                        <input required type="number" min="0" value={formData.stock_actual} onChange={e => setFormData({ ...formData, stock_actual: e.target.value })}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                          ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stock Mínimo</label>
                        <input required type="number" min="0" value={formData.stock_minimo} onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                          ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                      </div>
                    </div>
                  )}

                  {formData.inventory_mode === 'recipe' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 opacity-80">
                        <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stock Estimado</label>
                        <input readOnly type="text" value={`~${editingProduct ? (getEstimatedStock ? (getEstimatedStock(editingProduct.id) ?? 0) : 0) : 0} (Calculado)`}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 cursor-not-allowed
                          ${isDark ? 'bg-dark-card/40 border-dark-border text-gray-400' : 'bg-light-surface/50 border-light-border text-gray-500'}`} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stock Mínimo</label>
                        <input required type="number" min="0" value={formData.stock_minimo} onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                          ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                      </div>
                    </div>
                  )}

                  {formData.inventory_mode === 'blend' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 opacity-80">
                        <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stock Estimado</label>
                        <input readOnly type="text" value={`~${editingProduct ? (getEstimatedStock ? (getEstimatedStock(editingProduct.id) ?? 0) : 0) : 0} (Calculado)`}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 cursor-not-allowed
                          ${isDark ? 'bg-dark-card/40 border-dark-border text-gray-400' : 'bg-light-surface/50 border-light-border text-gray-500'}`} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stock Mínimo</label>
                        <input required type="number" min="0" value={formData.stock_minimo} onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                          ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`} />
                      </div>
                    </div>
                  )}

                  {/* Receta Builder for Recipe mode */}
                  {formData.inventory_mode === 'recipe' && (
                    <div className="space-y-3 p-4 rounded-2xl border-2 border-dashed border-gold-500/20 bg-gold-500/5">
                      <div className="flex justify-between items-center">
                        <label className={`text-xs font-bold uppercase ${isDark ? 'text-gold-400' : 'text-gold-700'}`}>Ingredientes de la Receta</label>
                        <button
                          type="button"
                          onClick={handleAddRecipeItem}
                          className="px-3 py-1.5 bg-gold-gradient text-black text-xs font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
                        >
                          <Plus size={14} /> Agregar
                        </button>
                      </div>

                      {recipeItems.length === 0 ? (
                        <p className={`text-xs text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No has configurado ingredientes para este producto. Agrega insumos para calcular el stock estimado.</p>
                      ) : (
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {recipeItems.map((item, idx) => {
                            const supply = supplyItems.find(s => s.id === item.supply_item_id)
                            return (
                              <div key={idx} className="flex gap-2 items-center">
                                <select
                                  value={item.supply_item_id}
                                  onChange={e => handleRecipeItemChange(idx, 'supply_item_id', e.target.value)}
                                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium outline-none border-2 focus:border-gold-500
                                    ${isDark ? 'bg-dark-card border-dark-border text-white font-semibold' : 'bg-light-surface border-light-border text-gray-900'}`}
                                >
                                  {supplyItems.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre} ({s.unidad})</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  required
                                  value={item.cantidad}
                                  placeholder="Cant."
                                  onChange={e => handleRecipeItemChange(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                                  className={`w-24 px-3 py-2 rounded-xl text-xs font-medium outline-none border-2 focus:border-gold-500
                                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                                />
                                <span className={`text-xs font-bold w-12 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {supply ? supply.unidad : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecipeItem(idx)}
                                  className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Combinado Config for Blend mode */}
                  {formData.inventory_mode === 'blend' && (
                    <div className="space-y-4">
                      {/* Vaso y Capacidad */}
                      <div className="p-4 rounded-2xl border-2 border-dashed border-gold-500/20 bg-gold-500/5 space-y-4 text-left">
                        <h4 className="text-xs font-bold uppercase text-gold-500 flex items-center gap-1.5">
                          🥤 Vaso / Envase Base
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Seleccionar Vaso/Envase</label>
                            <select
                              value={blendConfig.cup_supply_id}
                              onChange={e => setBlendConfig(prev => ({ ...prev, cup_supply_id: e.target.value }))}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border-2 focus:border-gold-500 cursor-pointer
                                ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                            >
                              <option value="">-- Seleccionar --</option>
                              {supplyItems.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre} ({s.unidad})</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Capacidad del Vaso (oz)</label>
                            <input
                              type="number"
                              min="1"
                              step="0.1"
                              value={blendConfig.cup_capacity}
                              onChange={e => setBlendConfig(prev => ({ ...prev, cup_capacity: parseFloat(e.target.value) || 0 }))}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border-2 focus:border-gold-500
                                ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Insumos Fijos */}
                      <div className="p-4 rounded-2xl border-2 border-dashed border-gold-500/20 bg-gold-500/5 space-y-4 text-left">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase text-gold-500 flex items-center gap-1.5">
                            ➕ Insumos Fijos Adicionales
                          </h4>
                          <button
                            type="button"
                            onClick={handleAddBlendFixedSupply}
                            className="px-2.5 py-1 bg-gold-gradient text-black text-[10px] font-bold rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
                          >
                            <Plus size={12} /> Agregar Fijo
                          </button>
                        </div>
                        {blendConfig.fixed_supplies.length === 0 ? (
                          <p className={`text-[11px] text-center py-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            No hay insumos fijos adicionales configurados (ej: pitillo, tapa).
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                            {blendConfig.fixed_supplies.map((item, idx) => {
                              const supply = supplyItems.find(s => s.id === item.supply_item_id)
                              return (
                                <div key={idx} className="flex gap-2 items-center">
                                  <select
                                    value={item.supply_item_id}
                                    onChange={e => handleBlendFixedSupplyChange(idx, 'supply_item_id', e.target.value)}
                                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium outline-none border-2 focus:border-gold-500
                                      ${isDark ? 'bg-dark-card border-dark-border text-white font-semibold' : 'bg-light-surface border-light-border text-gray-900'}`}
                                  >
                                    {supplyItems.map(s => (
                                      <option key={s.id} value={s.id}>{s.nombre} ({s.unidad})</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    required
                                    value={item.cantidad}
                                    placeholder="Cant."
                                    onChange={e => handleBlendFixedSupplyChange(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-3 py-2 rounded-xl text-xs font-medium outline-none border-2 focus:border-gold-500
                                      ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                                  />
                                  <span className={`text-xs font-bold w-12 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {supply ? supply.unidad : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBlendFixedSupply(idx)}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Sabores líquidos */}
                      <div className="p-4 rounded-2xl border-2 border-dashed border-gold-500/20 bg-gold-500/5 space-y-3 text-left">
                        <h4 className="text-xs font-bold uppercase text-gold-500 flex items-center gap-1.5">
                          🍹 Sabores Seleccionables (Líquidos en Bodega)
                        </h4>
                        <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                          Elige los insumos (medidos en litros) de bodega que se podrán mezclar para este producto.
                        </p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {supplyItems
                            .filter(s => s.id !== blendConfig.cup_supply_id)
                            .map(s => {
                              const isChecked = blendConfig.flavor_ids.includes(s.id)
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => handleBlendFlavorToggle(s.id)}
                                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]
                                    ${isChecked 
                                      ? 'border-gold-500 bg-gold-500/10 text-gold-500 font-bold' 
                                      : isDark ? 'border-dark-border bg-dark-card text-gray-400 hover:text-white' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900'}`}
                                >
                                  <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border text-[9px] font-bold
                                    ${isChecked ? 'border-gold-500 bg-gold-500 text-black' : 'border-gray-400'}`}>
                                    {isChecked && '✓'}
                                  </span>
                                  <span className="text-[10px] font-semibold truncate leading-tight flex-1">{s.nombre}</span>
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full py-4 mt-6 rounded-2xl font-bold text-sm tracking-wider uppercase
                    bg-gold-gradient text-dark-bg shadow-gold-md hover:shadow-gold-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {editingProduct ? 'Guardar Cambios' : 'Añadir Producto'}
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 flex flex-col gap-4">
                <div className={`flex flex-col items-center justify-center p-6 rounded-3xl border text-center relative overflow-hidden min-h-[250px]
                  ${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-gray-200'}`}>

                  {autoImage && !customImage && (
                    <span className="absolute top-3 right-3 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-gold-500/20 text-gold-500 border border-gold-500/30 shadow-sm">
                      Reconocimiento Automático: Activo
                    </span>
                  )}

                  {(customImage || autoImage) ? (
                    <img src={customImage || autoImage} alt="Preview" className="w-40 h-40 object-cover rounded-2xl shadow-lg mb-6 border border-white/10" />
                  ) : (
                    <div className={`w-40 h-40 rounded-2xl flex items-center justify-center mb-6 border-2 border-dashed
                      ${isDark ? 'bg-dark-bg border-dark-border text-gray-600' : 'bg-white border-gray-300 text-gray-400'}`}>
                      <span className="text-xs font-bold uppercase">Sin imagen</span>
                    </div>
                  )}

                  <label className={`cursor-pointer px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center w-full gap-2
                    ${isDark ? 'bg-dark-surface text-gray-300 hover:bg-gold-500/10 hover:text-gold-400 hover:border-gold-500/30 border border-dark-border'
                      : 'bg-white text-gray-700 hover:bg-gold-50 hover:text-gold-600 hover:border-gold-300 border border-gray-300 shadow-sm'}`}>
                    <span>Cargar Imagen Personalizada</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>

                  {customImage && (
                    <button type="button" onClick={() => { setCustomImage(null); setFormData(p => ({ ...p, image_url: autoImage || '' })) }}
                      className="mt-3 text-[10px] uppercase font-bold text-red-500 hover:text-red-400 transition-colors">
                      Remover imagen manual
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Insumo CRUD */}
      {isSupplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSupplyModalOpen(false)} />
          <div className={`relative w-full max-w-md rounded-3xl shadow-2xl animate-slide-in-up border flex flex-col max-h-[88vh]
            ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`}>

            <div className="px-6 pt-6 pb-2 shrink-0">
              <button onClick={() => setIsSupplyModalOpen(false)} className={`absolute top-6 right-6 p-2 rounded-full transition-colors
                ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white' : 'hover:bg-light-surface text-gray-500 hover:text-gray-900'}`}>
                <X size={18} />
              </button>

              <h3 className="font-display font-bold text-xl">
                {editingSupplyItem ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h3>
            </div>

            {/* Unified Form Body */}
            <div className="overflow-y-auto flex-1 px-6 pb-2 pt-2">

              {supplyErrorMsg && (
                <div className="mt-2 mb-3 p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                  <AlertTriangle size={16} />
                  {supplyErrorMsg}
                </div>
              )}

              <form id="supply-form" onSubmit={handleSupplySubmit} className="space-y-4 pb-1">
                <div className="space-y-4 animate-fade-in text-left">
                  {/* 1. Nombre */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">Nombre del insumo</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Harina de trigo, Salsa rosada..."
                      value={supplyFormData.nombre}
                      onChange={e => setSupplyFormData({ ...supplyFormData, nombre: e.target.value })}
                      className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                        ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">Escribe un nombre descriptivo y claro.</p>
                  </div>

                  {/* 2. Presentación de Compra y Unidad Base */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">¿Cómo lo compras? (Empaque)</label>
                      <input
                        required
                        type="text"
                        placeholder="Ej: bolsa, caja, pote, saco..."
                        value={supplyFormData.pack_large_unit}
                        onChange={e => setSupplyFormData({ ...supplyFormData, pack_large_unit: e.target.value })}
                        className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                          ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                      />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">Ej: bolsa, caja, pote, und.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">Unidad de Medida Base</label>
                      {isCreatingUnit ? (
                        <div className="relative w-full">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Ej: litro, kg, gr, und..."
                            value={newUnitName}
                            onChange={e => setNewUnitName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateUnit();
                              } else if (e.key === 'Escape') {
                                setIsCreatingUnit(false);
                                setSupplyFormData(prev => ({ ...prev, unidad: availableUnits[0]?.value || 'unidad' }));
                                setNewUnitName('');
                              }
                            }}
                            className={`w-full px-4 py-3 pr-12 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                            ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                          />
                          {newUnitName.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={handleCreateUnit}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gold-gradient text-black rounded-lg hover:scale-105 active:scale-95 transition-all shadow-sm"
                            >
                              <Check size={16} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center w-full">
                          <select
                            required
                            value={supplyFormData.unidad}
                            onChange={e => {
                              if (e.target.value === '__NEW__') {
                                setIsCreatingUnit(true);
                                setSupplyFormData({ ...supplyFormData, unidad: '' });
                              } else {
                                setSupplyFormData({ ...supplyFormData, unidad: e.target.value });
                              }
                            }}
                            className={`flex-1 min-w-0 px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 focus:border-gold-500 cursor-pointer appearance-none
                              ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                          >
                            <option value="" disabled>Seleccione una unidad</option>
                            {availableUnits.map(u => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                            <option value="__NEW__" className="font-bold text-gold-500">+ Crear nueva unidad</option>
                          </select>

                          {supplyFormData.unidad && supplyFormData.unidad !== 'unidad' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteUnit(supplyFormData.unidad);
                              }}
                              className={`p-3 rounded-xl transition-colors shrink-0 flex items-center justify-center
                                ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                              title="Eliminar unidad seleccionada"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">Ej: litro, kg, gramo, und.</p>
                    </div>
                  </div>

                  {/* 3. Contenido de cada Empaque (Frase interactiva) */}
                  <div className="p-3.5 rounded-2xl bg-black/10 dark:bg-black/20 border border-gray-200/10 dark:border-dark-border/20 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gold-500 block">
                      📏 Contenido por Empaque
                    </label>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 flex-wrap">
                      <span>1</span>
                      <span className="px-2 py-1 bg-gold-500/10 text-gold-500 rounded border border-gold-500/20 max-w-[120px] truncate">
                        {supplyFormData.pack_large_unit || 'unidad'}
                      </span>
                      <span>contiene</span>
                      <input
                        required
                        type="number"
                        min="0.0001"
                        step="any"
                        placeholder="Ej: 10"
                        value={supplyFormData.pack_large_ratio}
                        onChange={e => setSupplyFormData({ ...supplyFormData, pack_large_ratio: e.target.value })}
                        className={`w-20 px-2 py-1.5 rounded-lg text-xs font-semibold outline-none border transition focus:border-gold-500 text-center
                          ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                      />
                      <span className="text-gold-500 font-bold">
                        {supplyFormData.unidad || 'unidad'}(s)
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 italic">
                      Ejemplo: Si compras una bolsa que trae 3 litros de insumo, pon 3. Si se vende por unidad suelta, pon 1.
                    </p>
                  </div>

                  {/* 4. Precio de Compra por Empaque */}
                  {(() => {
                    const ratio = parseFloat(supplyFormData.pack_large_ratio) || 1
                    const packUnit = supplyFormData.pack_large_unit || 'unidad'
                    const precioUnitCalc = ratio > 1
                      ? ((parseFloat(supplyFormData.precio_empaque) || 0) / ratio)
                      : null
                    return (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          Precio de Compra por {packUnit || 'unidad'} ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-bold">$</span>
                          <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ej: 15000"
                            value={supplyFormData.precio_empaque}
                            onChange={e => setSupplyFormData({ ...supplyFormData, precio_empaque: e.target.value })}
                            className={`w-full pl-8 pr-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                              ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                          ¿Cuánto pagas por 1 {packUnit || 'unidad'}? {precioUnitCalc > 0 && ratio > 1 && <span className="text-gold-500 font-bold">(≈ ${Number(precioUnitCalc.toFixed(2)).toLocaleString('es-CO')} por {supplyFormData.unidad || 'unidad'})</span>}
                        </p>
                      </div>
                    )
                  })()}

                  {/* 5. Stock Actual y Mínimo (Ingresados en Empaques) */}
                  {(() => {
                    const packUnit = supplyFormData.pack_large_unit || 'unidad'
                    const ratio = parseFloat(supplyFormData.pack_large_ratio) || 1
                    const stockActualCalc = (parseFloat(supplyFormData.stock_actual_empaque) || 0) * ratio
                    const stockMinimoCalc = (parseFloat(supplyFormData.stock_minimo_empaque) || 0) * ratio
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">Stock Actual (en {packUnit || 'und'})</label>
                          <div className="relative">
                            <input
                              required
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              value={supplyFormData.stock_actual_empaque}
                              onChange={e => setSupplyFormData({ ...supplyFormData, stock_actual_empaque: e.target.value })}
                              className={`w-full pr-12 pl-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                                ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-semibold truncate max-w-[32px]">
                              {packUnit || 'und'}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                            Equivale a: <span className="font-bold text-gold-500">{Number(stockActualCalc.toFixed(2))} {supplyFormData.unidad || 'unidad'}(s)</span>.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">Stock Mínimo (en {packUnit || 'und'})</label>
                          <div className="relative">
                            <input
                              required
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="1"
                              value={supplyFormData.stock_minimo_empaque}
                              onChange={e => setSupplyFormData({ ...supplyFormData, stock_minimo_empaque: e.target.value })}
                              className={`w-full pr-12 pl-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                                ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-semibold truncate max-w-[32px]">
                              {packUnit || 'und'}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                            Alerta a las: <span className="font-bold text-gold-500">{Number(stockMinimoCalc.toFixed(2))} {supplyFormData.unidad || 'unidad'}(s)</span>.
                          </p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* 6. Ubicación */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">Ubicación (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: Nevera principal, Estante 2, Cajón mostrador..."
                      value={supplyFormData.ubicacion || ''}
                      onChange={e => setSupplyFormData({ ...supplyFormData, ubicacion: e.target.value })}
                      className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-gold-500
                        ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">Indica dónde se almacena físicamente este insumo.</p>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer sticky con el botón de envío */}
            <div className={`px-6 pb-6 pt-4 shrink-0 border-t ${isDark ? 'border-dark-border/40' : 'border-gray-100'}`}>
              <button
                type="submit"
                form="supply-form"
                className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase bg-gold-gradient text-dark-bg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-gold-md"
              >
                {editingSupplyItem ? 'Guardar Cambios' : 'Crear Insumo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Ajuste Manual Rápido */}
      {isAdjustModalOpen && adjustingSupplyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAdjustModalOpen(false)} />
          <div className={`relative w-full max-w-sm p-6 rounded-3xl shadow-2xl animate-slide-in-up border
            ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`}>

            <button onClick={() => setIsAdjustModalOpen(false)} className={`absolute top-6 right-6 p-2 rounded-full transition-colors
              ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white' : 'hover:bg-light-surface text-gray-500 hover:text-gray-900'}`}>
              <X size={18} />
            </button>

            <h3 className="font-display font-bold text-lg mb-2">Ajuste de Stock Físico</h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Corrige directamente el inventario actual para <span className="font-bold text-gold-500">{adjustingSupplyItem.nombre}</span>.
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase opacity-70">Nuevo Stock ({adjustingSupplyItem.unidad})</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  value={adjustNewStock}
                  onChange={e => setAdjustNewStock(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 focus:border-gold-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors
                    ${isDark ? 'bg-dark-card hover:bg-dark-surface text-gray-400' : 'bg-gray-100 hover:bg-gray-250 text-gray-600'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase bg-gold-gradient text-dark-bg hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  Confirmar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Ingreso de Mercancía (Stock Entry) */}
      {isEntryModalOpen && entryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEntryModalOpen(false)} />
          <div className={`relative w-full max-w-sm p-6 rounded-3xl shadow-2xl animate-slide-in-up border
            ${isDark ? 'bg-dark-surface border-dark-border text-white' : 'bg-white border-light-border text-gray-900'}`}>

            <button onClick={() => setIsEntryModalOpen(false)} className={`absolute top-5 right-5 p-2 rounded-full transition-colors
              ${isDark ? 'hover:bg-dark-card text-gray-400 hover:text-white' : 'hover:bg-light-surface text-gray-500 hover:text-gray-900'}`}>
              <X size={18} />
            </button>

            {/* Header with icon */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <PackagePlus size={20} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg leading-tight">Registrar Entrada</h3>
                <p className={`text-xs font-medium truncate max-w-[200px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {entryTarget.item.nombre}
                </p>
              </div>
            </div>

            {/* Current stock preview */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-2xl mb-5
              ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-light-surface border border-light-border'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stock actual</span>
              <span className={`font-display font-extrabold text-lg ${isDark ? 'text-gold-400' : 'text-gold-600'} text-right`}>
                {entryTarget.type === 'supply'
                  ? formatStockWithPackages(entryTarget.item.stock_actual, entryTarget.item)
                  : `${entryTarget.item.stock_actual ?? 0} und`}
              </span>
            </div>

            <form onSubmit={handleStockEntrySubmit} className="space-y-4">
              {entryTarget.type === 'supply' && (entryTarget.item.pack_medium_unit || entryTarget.item.pack_large_unit) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">Presentación a ingresar</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEntryUnitType('base')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border
                        ${entryUnitType === 'base'
                          ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                          : isDark ? 'border-dark-border bg-dark-card text-gray-400 hover:text-white' : 'border-light-border bg-light-surface text-gray-600 hover:text-gray-900'}`}
                    >
                      {entryTarget.item.unidad || 'Unidad'}
                    </button>
                    {entryTarget.item.pack_medium_unit && (
                      <button
                        type="button"
                        onClick={() => setEntryUnitType('medium')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border
                          ${entryUnitType === 'medium'
                            ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                            : isDark ? 'border-dark-border bg-dark-card text-gray-400 hover:text-white' : 'border-light-border bg-light-surface text-gray-600 hover:text-gray-900'}`}
                      >
                        {entryTarget.item.pack_medium_unit} ({entryTarget.item.pack_medium_ratio})
                      </button>
                    )}
                    {entryTarget.item.pack_large_unit && (
                      <button
                        type="button"
                        onClick={() => setEntryUnitType('large')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border
                          ${entryUnitType === 'large'
                            ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                            : isDark ? 'border-dark-border bg-dark-card text-gray-400 hover:text-white' : 'border-light-border bg-light-surface text-gray-600 hover:text-gray-900'}`}
                      >
                        {entryTarget.item.pack_large_unit} ({entryTarget.item.pack_large_ratio})
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                  Cantidad a ingresar (en {
                    entryTarget.type === 'supply'
                      ? (entryUnitType === 'medium' ? entryTarget.item.pack_medium_unit : entryUnitType === 'large' ? entryTarget.item.pack_large_unit : (entryTarget.item.unidad || 'unidades'))
                      : 'unidades'
                  })
                </label>
                <input
                  required
                  autoFocus
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej: 10"
                  value={entryQty}
                  onChange={e => {
                    const val = e.target.value
                    setEntryQty(val)
                    const qty = parseFloat(val) || 0
                    const uPrice = parseFloat(entryUnitPrice) || 0
                    if (qty > 0 && uPrice > 0) {
                      setEntryTotalCost((qty * uPrice).toFixed(0))
                    } else {
                      setEntryTotalCost('')
                    }
                  }}
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-emerald-500
                    ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                />
              </div>

              {/* Toggle to record expense */}
              <div className="flex items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="recordExpenseCheckbox"
                  checked={entryRecordExpense}
                  onChange={e => setEntryRecordExpense(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-dark-border cursor-pointer"
                />
                <label htmlFor="recordExpenseCheckbox" className="text-xs font-bold uppercase opacity-85 select-none cursor-pointer">
                  ¿Registrar gasto en Finanzas?
                </label>
              </div>

              {/* Cost settings - collapsed if unchecked */}
              {entryRecordExpense && (
                <div className="space-y-3 p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 animate-fade-in text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase opacity-75">Costo Unitario ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej: 1500"
                        value={entryUnitPrice}
                        onChange={e => {
                          const val = e.target.value
                          setEntryUnitPrice(val)
                          const qty = parseFloat(entryQty) || 0
                          const uPrice = parseFloat(val) || 0
                          if (qty > 0 && uPrice > 0) {
                            setEntryTotalCost((qty * uPrice).toFixed(0))
                          } else {
                            setEntryTotalCost('')
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none border transition-all focus:border-emerald-500
                          ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase opacity-75">Costo Total ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej: 15000"
                        value={entryTotalCost}
                        onChange={e => {
                          const val = e.target.value
                          setEntryTotalCost(val)
                          const qty = parseFloat(entryQty) || 0
                          const total = parseFloat(val) || 0
                          if (qty > 0 && total > 0) {
                            setEntryUnitPrice((total / qty).toFixed(2))
                          } else {
                            setEntryUnitPrice('')
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none border transition-all focus:border-emerald-500
                          ${isDark ? 'bg-dark-card border-dark-border text-white' : 'bg-light-surface border-light-border text-gray-900'}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase opacity-75">Categoría de Gasto</label>
                    <select
                      value={entryCategory}
                      onChange={e => setEntryCategory(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none border transition-all focus:border-emerald-500 cursor-pointer
                        ${isDark ? 'bg-dark-card border-dark-border text-white font-semibold' : 'bg-light-surface border-light-border text-gray-900'}`}
                    >
                      <option value="Insumos">Insumos</option>
                      <option value="Servicios">Servicios</option>
                      <option value="Arriendo">Arriendo</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>
              )}

              {/* New total preview */}
              {entryQty && !isNaN(parseFloat(entryQty)) && parseFloat(entryQty) > 0 && (() => {
                const qtyVal = parseFloat(entryQty)
                let baseQty = qtyVal
                if (entryTarget.type === 'supply') {
                  const s = entryTarget.item
                  if (entryUnitType === 'medium' && s.pack_medium_ratio) {
                    baseQty = qtyVal * (parseFloat(s.pack_medium_ratio) || 1)
                  } else if (entryUnitType === 'large' && s.pack_large_ratio) {
                    baseQty = qtyVal * (parseFloat(s.pack_large_ratio) || 1)
                  }
                }
                const newTotal = (entryTarget.item.stock_actual || 0) + baseQty
                return (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Nuevo total</span>
                    <span className="font-display font-extrabold text-lg text-emerald-500 text-right">
                      {entryTarget.type === 'supply'
                        ? formatStockWithPackages(newTotal, entryTarget.item)
                        : `${newTotal} und`}
                    </span>
                  </div>
                )
              })()}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase transition-colors
                    ${isDark ? 'bg-dark-card hover:bg-dark-surface text-gray-400' : 'bg-gray-100 hover:bg-gray-250 text-gray-600'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl text-xs font-bold uppercase bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <PackagePlus size={15} />
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
