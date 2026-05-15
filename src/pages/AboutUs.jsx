

export default function AboutUs() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-8">
      <h1 className="text-4xl font-bold text-gold-600 mb-6">Sobre nosotros</h1>
      <section className="max-w-3xl text-center">
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
          <strong>Gema System Group</strong> es una empresa líder en desarrollo de soluciones SaaS para el sector de puntos de venta (POS) y gestión empresarial.
        </p>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
          Nuestra misión es <em>poner en orden tu negocio</em> mediante herramientas intuitivas, seguras y altamente personalizables.
        </p>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Con años de experiencia en innovación tecnológica, ofrecemos módulos de inventario, finanzas, entregas y mucho más, siempre enfocados en la satisfacción del cliente.
        </p>
      </section>
    </div>
  );
}
