'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle2, Loader2, User, AlertTriangle, Package } from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';

interface Producto {
  rowNumber: number;
  id: string;
  codigo: string;
  nombre: string;
  imagen_url?: string;
  precio_venta: string;
  stock: string;
  fecha_vencimiento?: string;
}

interface Cliente {
  id: string;
  nombre: string;
}

interface CartItem extends Producto {
  cantidad: number;
  subtotal: number;
}

export default function VentasPage() {
  const { empresa, usuario, turnoActivo } = useGlobal();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [mobileTab, setMobileTab] = useState<'productos' | 'carrito'>('productos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resCli] = await Promise.all([
        fetch('/api/sheets?range=Productos!A:M'),
        fetch('/api/sheets?range=Clientes!A:G')
      ]);

      if (resProd.ok) {
        const json = await resProd.json();
        const activeProds = (json.data || [])
          .map((item: any, index: number) => ({ ...item, rowNumber: index + 2 }))
          .filter((p: any) => p.estado === 'Activo' && parseFloat(p.stock) > 0);
        setProductos(activeProds);
      }
      
      if (resCli.ok) {
        const json = await resCli.json();
        const activeClis = (json.data || []).filter((c: any) => c.estado === 'Activo');
        setClientes(activeClis);
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
    const stockAvailable = parseFloat(prod.stock);
    
    // Check expiration and warn
    let isExpired = false;
    if (prod.fecha_vencimiento) {
      const expDate = new Date(prod.fecha_vencimiento);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (expDate.getTime() < today.getTime()) {
        isExpired = true;
      }
    }

    if (isExpired) {
      if (!window.confirm(`¡CUIDADO! El producto "${prod.nombre}" ya está vencido (${prod.fecha_vencimiento}). ¿Estás seguro que deseas agregarlo a la venta?`)) {
        return;
      }
    }

    if (existing) {
      if (existing.cantidad >= stockAvailable) return; // No puede vender más del stock
      setCart(cart.map(item => 
        item.id === prod.id 
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * parseFloat(item.precio_venta) }
          : item
      ));
    } else {
      if (stockAvailable < 1) return;
      setCart([...cart, { ...prod, cantidad: 1, subtotal: parseFloat(prod.precio_venta) }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.cantidad + delta;
        if (newQ < 1) return item;
        const stockAvailable = parseFloat(productos.find(p => p.id === id)?.stock || '0');
        if (newQ > stockAvailable) return item;
        return { ...item, cantidad: newQ, subtotal: newQ * parseFloat(item.precio_venta) };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const processSale = async (shouldPrint: boolean) => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const ventaId = `VEN-${Date.now().toString().slice(-6)}`;
      const fecha = new Date().toLocaleString();
      const comprobante = `TKT-${Math.floor(Math.random() * 100000)}`;

      // 1. Guardar Venta (Columna H es el turno_id)
      const ventaValues = [ventaId, comprobante, fecha, selectedCliente || 'Consumidor Final', total.toString(), usuario?.username || 'Admin', 'Completada', turnoActivo?.id || ''];
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Ventas!A:H', values: ventaValues })
      });

      // 2. Guardar Detalles y 3. Actualizar Stock
      for (const item of cart) {
        // Detalle
        const detalleId = `DET-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const detalleValues = [detalleId, ventaId, item.id, item.cantidad.toString(), item.precio_venta, '0', item.subtotal.toString()];
        
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Ventas_Detalle!A:G', values: detalleValues })
        });

        // Descontar Stock (La columna de Stock es la H)
        const prodDb = productos.find(p => p.id === item.id);
        if (prodDb) {
          const newStock = parseFloat(prodDb.stock) - item.cantidad;
          await fetch('/api/sheets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ range: `Productos!H${item.rowNumber}`, values: [newStock.toString()] })
          });
          
          // Registrar en Kardex
          const kardexId = `KDX-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
          const kardexValues = [kardexId, fecha, item.id, 'VENTA', '0', item.cantidad.toString(), newStock.toString(), item.precio_venta, item.subtotal.toString()];
          await fetch('/api/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ range: 'Kardex!A:I', values: kardexValues })
          });
        }
      }

      setSuccessMsg(true);
      
      // Lanzar la impresión con los datos aún en pantalla
      setTimeout(() => {
        if (shouldPrint) {
          window.print();
        }
        
        // Limpiar el carrito DESPUÉS de imprimir o procesar
        setCart([]);
        setSelectedCliente('');
        setClientSearchTerm('');
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

  if (!turnoActivo) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-950 p-6 text-center">
        <div className="w-20 h-20 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Turno Cerrado</h2>
        <p className="text-gray-400 mb-8 max-w-md">Para poder registrar ventas y cobrarle a los clientes, necesitas aperturar un turno de caja primero declarando tu fondo inicial.</p>
        <a href="/turno" className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-8 rounded-xl transition-all">
          Ir a Aperturar Caja
        </a>
      </div>
    );
  }

  return (
    <div className="h-screen print:h-auto w-full relative">
      {/* Vista de Pantalla */}
      <main className="print:hidden flex flex-col h-screen bg-gray-950 animate-in fade-in duration-500">

        {/* TAB BAR: Solo visible en móvil */}
        <div className="flex lg:hidden border-b border-gray-800 bg-gray-900 shrink-0">
          <button
            onClick={() => setMobileTab('productos')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              mobileTab === 'productos'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-500'
            }`}
          >
            <Package size={16} /> Productos
          </button>
          <button
            onClick={() => setMobileTab('carrito')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors relative ${
              mobileTab === 'carrito'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-500'
            }`}
          >
            <ShoppingCart size={16} />
            Carrito
            {cart.length > 0 && (
              <span className="absolute top-2 right-[calc(50%-28px)] bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTENIDO: flex-row en desktop, tabs en móvil */}
        <div className="flex flex-1 overflow-hidden">

          {/* Panel Izquierdo: Catálogo de Productos */}
          <div className={`flex-1 flex flex-col p-4 md:p-6 overflow-hidden ${
            mobileTab === 'productos' ? 'flex' : 'hidden'
          } lg:flex`}>
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="text-emerald-400" size={24} />
              <h1 className="text-xl font-bold text-white">Nueva Venta</h1>
            </div>

            {/* Buscador */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-gray-500" size={20} />
              <input 
                type="text" 
                placeholder="Buscar producto por código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Lista de Productos */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex flex-col gap-3">
                {filteredProducts.map(prod => (
                  <div 
                    key={prod.id} 
                    onClick={() => { addToCart(prod); setMobileTab('carrito'); }}
                    className="bg-gray-900 border border-gray-800 hover:border-emerald-500/50 rounded-xl p-3 cursor-pointer transition-all hover:bg-gray-800 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      {prod.imagen_url ? (
                        <img src={prod.imagen_url} alt={prod.nombre} className="w-12 h-12 object-cover rounded-lg bg-gray-950 border border-gray-800" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600">
                          <Package size={20} />
                        </div>
                      )}
                      <div>
                        <h3 className="text-white font-medium text-sm mb-0.5">{prod.nombre}</h3>
                        <p className="text-gray-500 text-xs font-mono">{prod.codigo}</p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="text-emerald-400 font-bold">{empresa.moneda}{parseFloat(prod.precio_venta).toFixed(2)}</div>
                      <div className="flex flex-col items-end gap-1 mt-1">
                        <div className="text-xs px-2 py-0.5 bg-gray-950 rounded-lg text-gray-400 border border-gray-800">
                          Stock: {prod.stock}
                        </div>
                        {prod.fecha_vencimiento && (
                          <div className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${
                            new Date(prod.fecha_vencimiento).getTime() < new Date().setHours(0,0,0,0) 
                            ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                            : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          }`}>
                            Venc: {prod.fecha_vencimiento}
                          </div>
                        )}
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

          {/* Panel Derecho: Ticket / Carrito */}
          <div className={`w-full lg:w-[400px] bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl z-10 ${
            mobileTab === 'carrito' ? 'flex' : 'hidden'
          } lg:flex`}>
            
            {/* Header Ticket */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50">
              <h2 className="text-base font-bold text-white mb-3">Ticket de Compra</h2>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <input 
                  type="text"
                  placeholder="Buscar cliente (vacío = Consumidor Final)..."
                  value={clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    setIsClientDropdownOpen(true);
                    setSelectedCliente('');
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsClientDropdownOpen(false), 200)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                {isClientDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                    {'Consumidor Final'.toLowerCase().includes(clientSearchTerm.toLowerCase()) && (
                      <div 
                        className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-300"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedCliente('');
                          setClientSearchTerm('');
                          setIsClientDropdownOpen(false);
                        }}
                      >
                        Consumidor Final
                      </div>
                    )}
                    {clientes.filter(c => 
                      c.nombre.toLowerCase().includes(clientSearchTerm.toLowerCase()) &&
                      c.nombre.toLowerCase() !== 'consumidor final'
                    ).map(c => (
                      <div 
                        key={c.id} 
                        className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-white border-t border-gray-700/50"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedCliente(c.id);
                          setClientSearchTerm(c.nombre);
                          setIsClientDropdownOpen(false);
                        }}
                      >
                        {c.nombre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Items */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                  <ShoppingCart size={48} className="mb-4" />
                  <p>El carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-white font-medium text-sm leading-tight pr-4">{item.nombre}</span>
                          {item.fecha_vencimiento && new Date(item.fecha_vencimiento).getTime() < new Date().setHours(0,0,0,0) && (
                            <span className="text-[10px] text-red-500 font-bold mt-0.5">⚠️ VENCIDO</span>
                          )}
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-400">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-emerald-400 font-bold text-sm">{empresa.moneda}{item.precio_venta}</span>
                        
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

            {/* Resumen y Cobro */}
            <div className="p-4 border-t border-gray-800 bg-gray-900">
              <div className="flex justify-between text-gray-400 mb-1 text-sm">
                <span>Subtotal</span>
                <span>{empresa.moneda}{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 mb-3 text-sm">
                <span>Impuestos (0%)</span>
                <span>{empresa.moneda}0.00</span>
              </div>
              <div className="flex justify-between text-white font-bold text-xl mb-4">
                <span>Total</span>
                <span className="text-emerald-400">{empresa.moneda}{total.toFixed(2)}</span>
              </div>

              {successMsg ? (
                <div className="w-full bg-emerald-500/20 text-emerald-400 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 border border-emerald-500/30">
                  <CheckCircle2 size={24} /> ¡Venta Exitosa!
                </div>
              ) : (
                <div className="flex gap-3">
                  <button 
                    onClick={() => processSale(false)}
                    disabled={cart.length === 0 || processing}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="animate-spin" size={20} /> : 'Solo Cobrar'}
                  </button>
                  <button 
                    onClick={() => processSale(true)}
                    disabled={cart.length === 0 || processing}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:bg-gray-800 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="animate-spin" size={20} /> : 'Cobrar e Imprimir'}
                  </button>
                </div>
              )}
            </div>
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
          <p className="text-base font-bold">TICKET DE COMPRA</p>
          <p className="text-xs text-left mt-2">Fecha: {new Date().toLocaleString()}</p>
          <p className="text-xs text-left mb-2">Cliente: {clientes.find(c => c.id === selectedCliente)?.nombre || 'Consumidor Final'}</p>
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
          <p>¡Gracias por su compra!</p>
          <p>Vuelva pronto</p>
        </div>
      </div>
    </div>
  );
}
