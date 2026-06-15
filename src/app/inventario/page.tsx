'use client';

import { useState, useEffect } from 'react';
import { Box, Save, Search, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  imagen_url: string;
  categoria_id: string;
  marca_id: string;
  presentacion_id: string;
  stock: string;
  stock_minimo: string;
  precio_compra: string;
  precio_venta: string;
  estado: string;
}

export default function AjustesInventario() {
  const { usuario, empresa } = useGlobal();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(-1);
  const [tipoAjuste, setTipoAjuste] = useState<'ENTRADA' | 'SALIDA'>('SALIDA');
  const [cantidad, setCantidad] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/sheets?range=Productos!A:L');
      if (res.ok) {
        const json = await res.json();
        // Filtramos para asegurar que no haya productos vacios y esten activos
        setProductos(json.data.filter((p: any) => p.id && p.estado === 'Activo') || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (selectedProductIndex === -1) {
      setError('Por favor seleccione un producto.');
      return;
    }

    const qty = parseInt(cantidad);
    if (isNaN(qty) || qty <= 0) {
      setError('La cantidad debe ser un número entero mayor a 0.');
      return;
    }

    if (!motivo.trim()) {
      setError('Debe proporcionar un motivo para el ajuste.');
      return;
    }

    const producto = productos[selectedProductIndex];
    const stockActual = parseFloat(producto.stock || '0');
    const costoUnitario = parseFloat(producto.precio_compra || '0');

    if (tipoAjuste === 'SALIDA' && qty > stockActual) {
      setError(`No hay suficiente stock. El stock actual es ${stockActual} y quieres retirar ${qty}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevoStock = tipoAjuste === 'ENTRADA' ? stockActual + qty : stockActual - qty;
      const costoTotal = qty * costoUnitario;
      const idKardex = `KAR-${Math.floor(Math.random() * 1000000)}`;
      const fecha = new Date().toLocaleString();

      // 1. Guardar en Kardex
      const kardexRow = [
        idKardex,
        fecha,
        producto.id,
        tipoAjuste === 'ENTRADA' ? 'AJUSTE' : 'MERMA',
        tipoAjuste === 'ENTRADA' ? qty.toString() : '0',
        tipoAjuste === 'SALIDA' ? qty.toString() : '0',
        nuevoStock.toString(),
        costoUnitario.toString(),
        costoTotal.toString()
      ];

      const resKardex = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Kardex!A:I', values: kardexRow })
      });

      if (!resKardex.ok) throw new Error('Error al registrar en Kardex');

      // 2. Actualizar Stock en Productos
      // Calculamos la fila real en Excel (Asumiendo que la fila 1 son headers y los productos empiezan en la 2)
      // Ojo: index en el array no corresponde exactamente a la fila en excel si hay eliminados o inactivos filtrados.
      // Así que buscamos el index original haciendo otro fetch rapidito de todo.
      
      const resTodos = await fetch('/api/sheets?range=Productos!A:L');
      const jsonTodos = await resTodos.json();
      const todosLosProductos = jsonTodos.data;
      
      const realIndex = todosLosProductos.findIndex((p: any) => p.id === producto.id);
      
      if (realIndex === -1) throw new Error('Producto no encontrado en la base de datos principal.');

      const rowInExcel = realIndex + 2; // +1 por el index base 0, +1 por los headers = +2

      const productoActualizadoRow = [
        producto.id,
        producto.codigo,
        producto.nombre,
        producto.imagen_url || '',
        producto.categoria_id,
        producto.marca_id,
        producto.presentacion_id,
        nuevoStock.toString(),
        producto.stock_minimo,
        producto.precio_compra,
        producto.precio_venta,
        producto.estado
      ];

      const resUpdateProd = await fetch('/api/sheets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: `Productos!A${rowInExcel}:L${rowInExcel}`, values: productoActualizadoRow })
      });

      if (!resUpdateProd.ok) throw new Error('Error al actualizar el stock en Productos');

      const logValues = [
        `AUD-${Date.now().toString().slice(-6)}`,
        fecha,
        usuario?.username || 'Sistema',
        'Inventario',
        tipoAjuste === 'ENTRADA' ? 'ENTRADA' : 'MERMA',
        `Ajustó el stock de ${producto.nombre}: ${tipoAjuste} de ${qty} unidades. Motivo: ${motivo}`
      ];
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Auditoria!A:F', values: logValues })
      });

      // Éxito
      setSuccess(true);
      setCantidad('');
      setMotivo('');
      setSelectedProductIndex(-1);
      
      // Refrescar lista de productos
      await fetchProductos();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error desconocido al realizar el ajuste.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = selectedProductIndex !== -1 ? productos[selectedProductIndex] : null;

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500 max-w-4xl mx-auto overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-center gap-3 mb-8">
        <Box className="text-amber-400" size={32} />
        <div>
          <h1 className="text-3xl font-bold text-white">Ajustes de Inventario</h1>
          <p className="text-gray-400 mt-1 text-sm">Realiza ingresos manuales o registra mermas / daños físicos.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm">
        
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
            <CheckCircle2 size={24} />
            <p className="font-medium">El ajuste de inventario se ha guardado correctamente.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertTriangle size={24} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleAjuste} className="space-y-6">
          
          {/* Selección de Producto */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">1. Seleccione el Producto</label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
              <select 
                value={selectedProductIndex}
                onChange={(e) => setSelectedProductIndex(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 appearance-none"
                disabled={loadingData || isSubmitting}
              >
                <option value={-1}>
                  {loadingData ? 'Cargando productos...' : 'Buscar producto por nombre o código...'}
                </option>
                {productos.map((p, idx) => (
                  <option key={p.id} value={idx}>
                    {p.codigo} - {p.nombre} (Stock actual: {p.stock || '0'})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Info del producto seleccionado */}
            {selectedProduct && (
              <div className="mt-3 p-4 bg-gray-950 rounded-xl border border-gray-800 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400">Stock Físico Registrado</p>
                  <p className="text-xl font-bold text-white">{selectedProduct.stock || '0'} unidades</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Costo Unitario</p>
                  <p className="text-xl font-bold text-gray-300">{empresa.moneda}{parseFloat(selectedProduct.precio_compra || '0').toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo de Ajuste */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">2. Tipo de Movimiento</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoAjuste('ENTRADA')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    tipoAjuste === 'ENTRADA' 
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                      : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                  }`}
                >
                  <ArrowUpCircle size={28} className="mb-2" />
                  <span className="font-bold text-sm">ENTRADA (Ajuste)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjuste('SALIDA')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    tipoAjuste === 'SALIDA' 
                      ? 'bg-red-500/10 border-red-500 text-red-400' 
                      : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                  }`}
                >
                  <ArrowDownCircle size={28} className="mb-2" />
                  <span className="font-bold text-sm">SALIDA (Merma)</span>
                </button>
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">3. Cantidad a Ajustar</label>
              <div className="relative">
                <input 
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="Ej. 2"
                  disabled={isSubmitting}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xl focus:outline-none focus:border-amber-500"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                  unidades
                </div>
              </div>

              {/* Proyección visual */}
              {selectedProduct && cantidad && !isNaN(parseInt(cantidad)) && (
                <p className="text-sm mt-3 flex items-center gap-2">
                  <span className="text-gray-400">Proyección:</span> 
                  <span className="text-gray-500 line-through">{selectedProduct.stock || '0'}</span> 
                  <span>→</span>
                  <span className={`font-bold ${tipoAjuste === 'ENTRADA' ? 'text-blue-400' : 'text-red-400'}`}>
                    {tipoAjuste === 'ENTRADA' 
                      ? parseFloat(selectedProduct.stock || '0') + parseInt(cantidad)
                      : parseFloat(selectedProduct.stock || '0') - parseInt(cantidad)
                    }
                  </span>
                  <span className="text-gray-400 text-xs ml-1">unidades en total</span>
                </p>
              )}
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">4. Motivo / Observación</label>
            <input 
              type="text" 
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={tipoAjuste === 'ENTRADA' ? "Ej. Conteo físico, ingreso sin factura..." : "Ej. Producto vencido, botella quebrada..."}
              disabled={isSubmitting}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Botón de Submit */}
          <div className="pt-4 border-t border-gray-800">
            <button 
              type="submit"
              disabled={isSubmitting || !selectedProduct || !cantidad || !motivo}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:hover:bg-amber-600 text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-amber-900/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Procesando Ajuste...</span>
                </>
              ) : (
                <>
                  <Save size={24} />
                  <span>Confirmar Ajuste de Inventario</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
