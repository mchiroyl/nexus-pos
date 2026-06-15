'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle2, Loader2, User, Package } from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';

interface Producto {
  rowNumber: number;
  id: string;
  codigo: string;
  nombre: string;
  imagen_url?: string;
  precio_compra: string;
  stock: string;
}

interface Proveedor {
  id: string;
  razon_social: string;
}

interface CartItem extends Producto {
  cantidad: number;
  subtotal: number;
}

export default function ComprasPage() {
  const { empresa } = useGlobal();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resProv] = await Promise.all([
        fetch('/api/sheets?range=Productos!A:L'),
        fetch('/api/sheets?range=Proveedores!A:G')
      ]);

      if (resProd.ok) {
        const json = await resProd.json();
        const activeProds = (json.data || [])
          .map((item: any, index: number) => ({ ...item, rowNumber: index + 2 }))
          .filter((p: any) => p.estado === 'Activo');
        setProductos(activeProds);
      }
      
      if (resProv.ok) {
        const json = await resProv.json();
        const activeProvs = (json.data || []).filter((p: any) => p.estado === 'Activo');
        setProveedores(activeProvs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (prod: Producto) => {
    const existing = cart.find(item => item.id === prod.id);
    
    if (existing) {
      setCart(cart.map(item => 
        item.id === prod.id 
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * parseFloat(item.precio_compra || '0') }
          : item
      ));
    } else {
      setCart([...cart, { ...prod, cantidad: 1, subtotal: parseFloat(prod.precio_compra || '0') }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.cantidad + delta;
        if (newQ < 1) return item;
        return { ...item, cantidad: newQ, subtotal: newQ * parseFloat(item.precio_compra || '0') };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const processPurchase = async (shouldPrint: boolean) => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const compraId = `COM-${Date.now().toString().slice(-6)}`;
      const fecha = new Date().toLocaleString();
      const comprobante = `FAC-${Math.floor(Math.random() * 100000)}`; // En la vida real, lo ingresa el usuario

      // 1. Guardar Compra
      // headers: id, comprobante, fecha, proveedor_id, total, usuario, estado
      const compraValues = [compraId, comprobante, fecha, selectedProveedor || 'Varios', total.toString(), usuario?.username || 'Sistema', 'Completada'];
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Compras!A:G', values: compraValues })
      });

      // 2. Guardar Detalles, Actualizar Stock y Kardex
      for (const item of cart) {
        // Detalle Compra
        // headers: id, compra_id, producto_id, cantidad, precio_compra, subtotal
        const detalleId = `DCO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const detalleValues = [detalleId, compraId, item.id, item.cantidad.toString(), item.precio_compra, item.subtotal.toString()];
        
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Compras_Detalle!A:F', values: detalleValues })
        });

        // Aumentar Stock (La columna de Stock es la H)
        const prodDb = productos.find(p => p.id === item.id);
        if (prodDb) {
          const newStock = parseFloat(prodDb.stock || '0') + item.cantidad;
          await fetch('/api/sheets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ range: `Productos!H${item.rowNumber}`, values: [newStock.toString()] })
          });
          
          // Registrar en Kardex
          // headers: id, fecha, producto_id, transaccion, entrada, salida, saldo, costo_unitario, costo_total
          const kardexId = `KDX-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
          const kardexValues = [kardexId, fecha, item.id, 'COMPRA', item.cantidad.toString(), '0', newStock.toString(), item.precio_compra, item.subtotal.toString()];
          await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ range: 'Kardex!A:I', values: kardexValues })
          });
        }
      }

      setSuccessMsg(true);
      
      setTimeout(() => {
        if (shouldPrint) {
          window.print();
        }
        
        setCart([]);
        setSelectedProveedor('');
      }, 100);

      fetchData(); // Recargar productos para refrescar el stock
      setTimeout(() => setSuccessMsg(false), 4000);

    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading && productos.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500 mb-2" size={40} />
      </div>
    );
  }

  return (
    <div className="h-screen print:h-auto w-full relative">
      {/* Vista de Pantalla (Se oculta al imprimir) */}
      <main className="print:hidden flex flex-col lg:flex-row h-screen bg-gray-950 animate-in fade-in duration-500">
      
      {/* Panel Izquierdo: Catálogo de Productos */}
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingCart className="text-blue-400" size={28} />
          <h1 className="text-2xl font-bold text-white">Ingresar Compra</h1>
        </div>

        {/* Buscador */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar producto por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Lista de Productos */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex flex-col gap-3">
            {filteredProducts.map(prod => (
              <div 
                key={prod.id} 
                onClick={() => addToCart(prod)}
                className="bg-gray-900 border border-gray-800 hover:border-blue-500/50 rounded-xl p-3 cursor-pointer transition-all hover:bg-gray-800 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  {prod.imagen_url ? (
                    <img src={prod.imagen_url} alt={prod.nombre} className="w-14 h-14 object-cover rounded-lg bg-gray-950 border border-gray-800" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600">
                      <Package size={24} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-medium text-base mb-1">{prod.nombre}</h3>
                    <p className="text-gray-500 text-xs font-mono">{prod.codigo}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-blue-400 font-bold text-lg">{empresa.moneda}{parseFloat(prod.precio_compra || '0').toFixed(2)}</div>
                  <div className="text-xs px-2 py-1 bg-gray-950 rounded-lg text-gray-400 mt-1 inline-block border border-gray-800">
                    Stock: {prod.stock}
                  </div>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
                No se encontraron productos.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Derecho: Ticket de Ingreso */}
      <div className="w-full lg:w-[400px] bg-gray-900 border-l border-gray-800 flex flex-col h-full shadow-2xl z-10">
        
        {/* Header Compra */}
        <div className="p-5 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-lg font-bold text-white mb-3">Detalle de Ingreso</h2>
          <div className="relative">
            <User className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <select 
              value={selectedProveedor}
              onChange={(e) => setSelectedProveedor(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
            >
              <option value="">Seleccione Proveedor...</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.razon_social}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
              <ShoppingCart size={48} className="mb-4" />
              <p>Ningún producto seleccionado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.id} className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-white font-medium text-sm leading-tight pr-4">{item.nombre}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-blue-400 font-bold text-sm">{empresa.moneda}{item.precio_compra}</span>
                    
                    <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-1 border border-gray-800">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-gray-400 hover:text-white bg-gray-800 rounded-md">
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-sm font-medium w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-gray-400 hover:text-white bg-gray-800 rounded-md">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen y Guardar */}
        <div className="p-5 border-t border-gray-800 bg-gray-900">
          <div className="flex justify-between text-white font-bold text-2xl mb-6">
            <span>Costo Total</span>
            <span className="text-blue-400">{empresa.moneda}{total.toFixed(2)}</span>
          </div>

          {successMsg ? (
            <div className="w-full bg-blue-500/20 text-blue-400 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 border border-blue-500/30">
              <CheckCircle2 size={24} /> ¡Ingreso Exitoso!
            </div>
          ) : (
            <div className="flex gap-3">
              <button 
                onClick={() => processPurchase(false)}
                disabled={cart.length === 0 || processing || !selectedProveedor}
                className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" size={20} /> : 'Registrar'}
              </button>
              <button 
                onClick={() => processPurchase(true)}
                disabled={cart.length === 0 || processing || !selectedProveedor}
                className="flex-[2] bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:bg-gray-800 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" size={20} /> : 'Registrar e Imprimir'}
              </button>
            </div>
          )}
        </div>
      </div>
      </main>

      {/* Ticket para Imprimir (Oculto en pantalla, visible solo al imprimir) */}
      <div className="hidden print:block w-[80mm] p-4 text-black bg-white mx-auto font-mono text-sm" id="ticket-print">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold uppercase">{empresa.nombre}</h2>
          <p className="text-xs">{empresa.direccion}</p>
          <p className="text-xs">Tel: {empresa.telefono}</p>
          <div className="border-b border-dashed border-black my-2"></div>
          <p className="text-base font-bold">COMPROBANTE DE INGRESO</p>
          <p className="text-xs text-left mt-2">Fecha: {new Date().toLocaleString()}</p>
          <p className="text-xs text-left mb-2">Proveedor: {proveedores.find(p => p.id === selectedProveedor)?.razon_social || 'Varios'}</p>
        </div>
        
        <table className="w-full text-xs text-left mb-2">
          <thead>
            <tr className="border-b border-black">
              <th className="pb-1">Cant</th>
              <th className="pb-1">Prod</th>
              <th className="text-right pb-1">SubT</th>
            </tr>
          </thead>
          <tbody>
            {cart.map(item => (
              <tr key={item.id}>
                <td className="py-1 align-top">{item.cantidad}</td>
                <td className="py-1 pr-1 leading-tight">{item.nombre}</td>
                <td className="py-1 text-right align-top">{empresa.moneda}{item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="border-t border-dashed border-black mt-2 pt-2">
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL:</span>
            <span>{empresa.moneda}{total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="text-center mt-6 text-xs">
          <p>Documento interno de compra.</p>
        </div>
      </div>
    </div>
  );
}
