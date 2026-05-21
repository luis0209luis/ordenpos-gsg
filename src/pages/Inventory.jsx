import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme, useSettings } from '../context/AppContext'
import { useInventory } from '../context/InventoryContext'
import { Plus, Edit2, Trash2, AlertTriangle, Search, X, Check } from 'lucide-react'

export default function Inventory() {
  const { theme } = useTheme() || {}
  const isDark = theme === 'dark'
  const { products = [], addProduct, updateProduct, deleteProduct } = useInventory() || {}
  const { settings = {} } = useSettings() || {}

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    nombre: '', precio: '', stock_actual: '', stock_minimo: '', categoria: '', image_url: ''
  })

  const DEFAULT_CATEGORIES = ['Bebida', 'Comida Rápida', 'Repostería', 'Pan'];
  const [customCategories, setCustomCategories] = useState([]);
  const [deletedCategories, setDeletedCategories] = useState(() => {
    return JSON.parse(localStorage.getItem('ordenpos_deleted_categories') || '[]');
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const availableCategories = [...new Set([...DEFAULT_CATEGORIES, ...(products || []).map(p => p?.categoria || 'Sin Categoría'), ...customCategories])]
    .filter(c => !deletedCategories.includes(c) && c !== 'Sin Categoría');

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
        image_url: product.image_url || ''
      })
      setCustomImage(product.image_url?.startsWith('data:image') ? product.image_url : null)
    } else {
      setEditingProduct(null)
      setFormData({
        nombre: '',
        precio: '',
        stock_actual: '',
        stock_minimo: settings?.globalMinStock || 10,
        categoria: availableCategories[0] || 'Sin Categoría',
        image_url: ''
      })
      setCustomImage(null)
    }
    setIsCreatingCategory(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setErrorMsg('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setErrorMsg('')

      const finalImage = formData.image_url || autoImage || ''
      const finalCategoria = formData.categoria || 'Sin Categoría'
      const finalNombre = formData.nombre || 'Producto'

      const productData = {
        ...formData,
        nombre: finalNombre,
        categoria: finalCategoria,
        image_url: finalImage,
        precio: parseFloat(formData.precio) || 0,
        stock_actual: parseInt(formData.stock_actual) || 0,
        stock_minimo: parseInt(formData.stock_minimo),
      }

      if (isNaN(productData.stock_minimo)) {
        productData.stock_minimo = settings?.globalMinStock || 10
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData)
      } else {
        await addProduct(productData)
      }

      // Solo se cierra el modal si la promesa se resolvió correctamente sin arrojar error
      closeModal()
    } catch (error) {
      console.error("Error al guardar el producto en Inventory.jsx:", error)
      setErrorMsg(error?.message || "Ocurrió un error al guardar en Supabase. Verifica los datos y vuelve a intentar.")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header Actions */}
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

      {/* Inventory Table */}
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
                    : settings.globalMinStock
                  const isLowStock = product.stock_actual <= currentMinStock
                  return (
                    <tr key={product.id} className={`border-b last:border-0 transition-colors duration-200 hover:bg-gold-500/5
                      ${isDark ? 'border-dark-border text-gray-300' : 'border-light-border text-gray-700'}`}>
                      <td className={`px-6 py-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {product.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm">{product.categoria}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold">
                        ${Number(product.precio).toLocaleString('es-CO')}
                      </td>
                      <td className={`px-6 py-4 text-center font-bold font-display text-lg
                        ${isLowStock ? 'text-red-500' : (isDark ? 'text-gold-400' : 'text-gold-600')}`}>
                        {product.stock_actual}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {isLowStock ? (
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className={`relative w-full max-w-4xl p-8 rounded-3xl shadow-2xl animate-slide-in-up border
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
    </div>
  )
}
