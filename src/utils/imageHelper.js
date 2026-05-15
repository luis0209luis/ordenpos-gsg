export function getSmartImage(productName = '', userImageUrl = null) {
  // 1. Prioridad: Imagen real subida por el usuario
  if (userImageUrl) return { url: userImageUrl, isReference: false, isFallback: false }

  const name = productName.toLowerCase()

  // 2. Mapeo de palabras clave (Orden de Prioridad Estricto para evitar colisiones)
  // Las coincidencias más específicas (ej: Matcha, Salchipapa, Croissant) van primero.
  const dictionary = [
    {
      keywords: ['matcha'],
      url: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=300&q=80' // Té verde / Matcha
    },
    {
      keywords: ['salchipapa', 'salchipapas'],
      url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=300&q=80' // Loaded fries (Papas con queso/carnes)
    },
    {
      keywords: ['desgranado', 'maiz', 'maíz', 'choclo'],
      url: 'https://images.unsplash.com/photo-1599818815124-7df84e1b7ec7?auto=format&fit=crop&w=300&q=80' // Elote / Maíz desgranado
    },
    {
      keywords: ['granizado', 'xdrinks', 'frappé', 'frappe', 'slush'],
      url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=300&q=80' // Granizado / Bebida fría de la casa
    },
    {
      keywords: ['cheesecake', 'tarta'],
      url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=300&q=80' // Repostería fina
    },
    {
      keywords: ['croissant', 'hojaldre'],
      url: 'https://images.unsplash.com/photo-1555507036-ab1f40ce88ca?auto=format&fit=crop&w=300&q=80' // Croissant forma de media luna
    },
    {
      keywords: ['burger', 'hamburguesa', 'perro', 'hot dog', 'papas', 'sandwich', 'sándwich'],
      url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80' // Comida rápida genérica
    },
    {
      keywords: ['pizza', 'pizzas'],
      url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80' // Pizza
    },
    {
      keywords: ['café', 'cafe', 'té', 'te'],
      url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=300&q=80' // Café genérico
    },
    {
      keywords: ['bebida', 'jugo', 'limonada', 'agua', 'soda', 'gaseosa'],
      url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80' // Bebida genérica refrescante
    },
    {
      keywords: ['pan', 'postre', 'pastel', 'torta', 'galleta'],
      url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80' // Panadería genérica
    }
  ]

  for (const category of dictionary) {
    if (category.keywords.some(keyword => name.includes(keyword))) {
      return { url: category.url, isReference: true, isFallback: false }
    }
  }

  // 3. Fallback: Logo de la marca o categoría no reconocida
  return { url: '/favicon.svg', isReference: true, isFallback: true }
}
