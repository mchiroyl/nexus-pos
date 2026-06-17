'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package, Loader2, AlertTriangle, Search } from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';

interface Producto {
  rowNumber?: number;
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
  fecha_vencimiento?: string;
}

export default function ProductosPage() {
  const { empresa, usuario } = useGlobal();
  const [items, setItems] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Catálogos para los dropdowns
  const [categorias, setCategorias] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [presentaciones, setPresentaciones] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ 
    id: '', codigo: '', nombre: '', imagen_url: '', 
    categoria_id: '', marca_id: '', presentacion_id: '', 
    stock: '0', stock_minimo: '5', precio_compra: '0', precio_venta: '0', estado: 'Activo', fecha_vencimiento: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargamos productos y catálogos en paralelo
      const [resProd, resCat, resMar, resPres] = await Promise.all([
        fetch('/api/sheets?range=Productos!A:M'),
        fetch('/api/sheets?range=Categorias!A:D'),
        fetch('/api/sheets?range=Marcas!A:D'),
        fetch('/api/sheets?range=Presentaciones!A:D')
      ]);

      if (resProd.ok) {
        const json = await resProd.json();
        const dataWithRow = (json.data || []).map((item: any, index: number) => ({
          ...item,
          rowNumber: index + 2
        }));
        setItems(dataWithRow);
      }
      
      if (resCat.ok) {
        const json = await resCat.json();
        setCategorias((json.data || []).filter((c:any) => c.estado === 'Activo'));
      }
      if (resMar.ok) {
        const json = await resMar.json();
        setMarcas((json.data || []).filter((m:any) => m.estado === 'Activo'));
      }
      if (resPres.ok) {
        const json = await resPres.json();
        setPresentaciones((json.data || []).filter((p:any) => p.estado === 'Activo'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const values = [
        formData.id || `PROD-${Date.now().toString().slice(-6)}`, 
        formData.codigo, formData.nombre, formData.imagen_url, 
        formData.categoria_id, formData.marca_id, formData.presentacion_id,
        formData.stock, formData.stock_minimo, formData.precio_compra, formData.precio_venta, formData.estado, formData.fecha_vencimiento
      ];

      if (editingId) {
        values[0] = formData.id; // Mantener ID original
        await fetch('/api/sheets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: `Productos!A${editingId}:M${editingId}`, values })
        });

        const logValues = [
          `AUD-${Date.now().toString().slice(-6)}`,
          new Date().toLocaleString(),
          usuario?.username || 'Sistema',
          'Productos',
          'EDITAR',
          `Editó el producto ${formData.nombre} (${formData.codigo})`
        ];
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Auditoria!A:F', values: logValues })
        });
      } else {
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Productos!A:M', values })
        });

        const logValues = [
          `AUD-${Date.now().toString().slice(-6)}`,
          new Date().toLocaleString(),
          usuario?.username || 'Sistema',
          'Productos',
          'CREAR',
          `Creó el producto ${formData.nombre} (${formData.codigo})`
        ];
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Auditoria!A:F', values: logValues })
        });
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: Producto) => {
    setFormData({ 
      id: item.id, codigo: item.codigo || '', nombre: item.nombre || '', imagen_url: item.imagen_url || '', 
      categoria_id: item.categoria_id || '', marca_id: item.marca_id || '', presentacion_id: item.presentacion_id || '', 
      stock: item.stock || '0', stock_minimo: item.stock_minimo || '0', 
      precio_compra: item.precio_compra || '0', precio_venta: item.precio_venta || '0', estado: item.estado, fecha_vencimiento: item.fecha_vencimiento || ''
    });
    setEditingId(item.rowNumber || null);
    setShowModal(true);
  };

  const toggleStatus = async (item: Producto) => {
    if (!item.rowNumber) return;
    setLoading(true);
    const newStatus = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const values = [
      item.id, item.codigo, item.nombre, item.imagen_url, 
      item.categoria_id, item.marca_id, item.presentacion_id, 
      item.stock, item.stock_minimo, item.precio_compra, item.precio_venta, newStatus, item.fecha_vencimiento || ''
    ];
    await fetch('/api/sheets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: `Productos!A${item.rowNumber}:M${item.rowNumber}`, values })
    });

    const logValues = [
      `AUD-${Date.now().toString().slice(-6)}`,
      new Date().toLocaleString(),
      usuario?.username || 'Sistema',
      'Productos',
      newStatus === 'Inactivo' ? 'ELIMINAR' : 'RESTAURAR',
      `${newStatus === 'Inactivo' ? 'Inactivó' : 'Restauró'} el producto ${item.nombre} (${item.codigo})`
    ];
    await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: 'Auditoria!A:F', values: logValues })
    });
    fetchData();
  };

  const resetForm = () => {
    setFormData({ 
      id: '', codigo: '', nombre: '', imagen_url: '', 
      categoria_id: '', marca_id: '', presentacion_id: '', 
      stock: '0', stock_minimo: '5', precio_compra: '0', precio_venta: '0', estado: 'Activo', fecha_vencimiento: ''
    });
    setEditingId(null);
  };

  const getCatName = (id: string) => categorias.find(c => c.id === id)?.nombre || 'N/A';

  const filteredItems = items.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysToExpire = (dateStr?: string) => {
    if (!dateStr) return null;
    const expDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="text-emerald-400" /> Productos e Inventario
        </h1>
        {usuario?.permisos.includes('crear-producto') && (
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> <span className="hidden md:inline">Nuevo Producto</span>
          </button>
        )}
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 mb-6 border border-gray-800 shadow-sm flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar producto por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-950/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Código</th>
                <th className="p-4 font-medium">Nombre del Producto</th>
                <th className="p-4 font-medium hidden md:table-cell">Categoría</th>
                <th className="p-4 font-medium text-right">Precio</th>
                <th className="p-4 font-medium text-center">Stock</th>
                <th className="p-4 font-medium text-center hidden md:table-cell">Vencimiento</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Cargando productos...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No se encontraron productos con esa búsqueda.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLowStock = parseFloat(item.stock) <= parseFloat(item.stock_minimo);
                  const daysToExpire = getDaysToExpire(item.fecha_vencimiento);
                  
                  let expColorClass = 'text-gray-400';
                  let expText = item.fecha_vencimiento || 'N/A';
                  
                  if (daysToExpire !== null) {
                    if (daysToExpire < 0) {
                      expColorClass = 'text-red-400 font-bold';
                      expText = '¡Vencido!';
                    } else if (daysToExpire <= 30) {
                      expColorClass = 'text-orange-400 font-bold';
                      expText = `En ${daysToExpire} días`;
                    }
                  }
                  
                  return (
                    <tr key={item.id} className={`hover:bg-gray-800/50 transition-colors ${item.estado === 'Inactivo' ? 'opacity-50' : ''}`}>
                      <td className="p-4 font-medium text-gray-400">{item.codigo}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {item.imagen_url ? (
                            <img src={item.imagen_url} alt={item.nombre} className="w-10 h-10 rounded-lg object-cover bg-gray-800" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500">
                              <Package size={20} />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{item.nombre}</span>
                            <span className="text-xs text-gray-500 hidden md:block">ID: {item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 hidden md:table-cell">
                        {getCatName(item.categoria_id)}
                      </td>
                      <td className="p-4 text-right text-emerald-400 font-medium">
                        {empresa.moneda}{parseFloat(item.precio_venta || '0').toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isLowStock ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-gray-800 text-gray-300'
                        }`}>
                          {isLowStock && <AlertTriangle size={12} />}
                          {item.stock}
                        </span>
                      </td>
                      <td className="p-4 text-center hidden md:table-cell">
                        {item.fecha_vencimiento ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">{item.fecha_vencimiento}</span>
                            <span className={`text-xs ${expColorClass}`}>{expText}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {usuario?.permisos.includes('editar-producto') && (
                          <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors">
                            <Pencil size={18} />
                          </button>
                        )}
                        {usuario?.permisos.includes('eliminar-producto') && (
                          <button onClick={() => toggleStatus(item)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-4 sm:items-center sm:pt-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Info General */}
                <div className="space-y-4 md:col-span-2 bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                  <h3 className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-2">Información Principal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Código de Barras / SKU <span className="text-xs text-gray-500 font-normal">(Opcional)</span>
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" value={formData.codigo}
                          onChange={e => setFormData({...formData, codigo: e.target.value})}
                          placeholder="Ej: 7501234567890"
                          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, codigo: `SKU-${Date.now().toString().slice(-6)}`})}
                          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-emerald-400 font-medium transition-colors whitespace-nowrap"
                        >
                          Auto
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Comercial</label>
                      <input 
                        required type="text" value={formData.nombre}
                        onChange={e => setFormData({...formData, nombre: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-1">URL de Imagen (Opcional)</label>
                      <input 
                        type="text" value={formData.imagen_url} placeholder="https://..."
                        onChange={e => setFormData({...formData, imagen_url: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Clasificación */}
                <div className="space-y-4 md:col-span-2 bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                  <h3 className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-2">Clasificación</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Categoría</label>
                      <select 
                        required value={formData.categoria_id}
                        onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 transition-colors"
                      >
                        <option value="">Seleccione...</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Marca</label>
                      <select 
                        value={formData.marca_id}
                        onChange={e => setFormData({...formData, marca_id: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 transition-colors"
                      >
                        <option value="">Ninguna</option>
                        {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Presentación</label>
                      <select 
                        value={formData.presentacion_id}
                        onChange={e => setFormData({...formData, presentacion_id: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 transition-colors"
                      >
                        <option value="">Ninguna</option>
                        {presentaciones.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Precios e Inventario */}
                <div className="space-y-4 md:col-span-2 bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                  <h3 className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-2">Precios e Inventario</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Precio Compra</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">{empresa.moneda}</span>
                        <input 
                          required type="number" step="0.01" min="0" value={formData.precio_compra}
                          onChange={e => setFormData({...formData, precio_compra: e.target.value})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 pl-7 text-white focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Precio Venta</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">{empresa.moneda}</span>
                        <input 
                          required type="number" step="0.01" min="0" value={formData.precio_venta}
                          onChange={e => setFormData({...formData, precio_venta: e.target.value})}
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 pl-7 text-emerald-400 font-bold focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Stock Actual</label>
                      <input 
                        required type="number" value={formData.stock}
                        onChange={e => setFormData({...formData, stock: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Stock Mínimo</label>
                      <input 
                        required type="number" value={formData.stock_minimo}
                        onChange={e => setFormData({...formData, stock_minimo: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-800/50">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                        Fecha de Vencimiento <span className="text-xs text-gray-500 font-normal">(Opcional)</span>
                      </label>
                      <input 
                        type="date" value={formData.fecha_vencimiento}
                        onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})}
                        onKeyDown={e => e.preventDefault()}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-emerald-500 transition-colors cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-lg font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
