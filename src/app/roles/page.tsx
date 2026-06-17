'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Loader2 } from 'lucide-react';

interface Rol {
  rowNumber?: number;
  id: string;
  nombre: string;
  descripcion: string;
  permisos: string;
  estado: string;
}

const PERMISOS_DISPONIBLES = [
  'ver-panel',
  'ver-ventas', 'crear-venta',
  'ver-compras', 'crear-compra',
  'ver-productos', 'crear-producto', 'editar-producto', 'eliminar-producto',
  'ver-inventario',
  'ver-kardex',
  'ver-categorias', 'crear-categoria', 'editar-categoria', 'eliminar-categoria',
  'ver-marcas', 'crear-marca', 'editar-marca', 'eliminar-marca',
  'ver-presentaciones', 'crear-presentacion', 'editar-presentacion', 'eliminar-presentacion',
  'ver-clientes', 'crear-cliente', 'editar-cliente', 'eliminar-cliente',
  'ver-proveedores', 'crear-proveedor', 'editar-proveedor', 'eliminar-proveedor',
  'ver-cajas', 'aperturar-caja', 'cerrar-caja',
  'ver-empresa', 'editar-empresa',
  'ver-empleados', 'crear-empleado', 'editar-empleado', 'eliminar-empleado',
  'ver-usuarios', 'crear-usuario', 'editar-usuario', 'eliminar-usuario',
  'ver-roles', 'crear-rol', 'editar-rol', 'eliminar-rol',
];

export default function RolesPage() {
  const [items, setItems] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<{
    id: string; nombre: string; descripcion: string; permisos: string[]; estado: string;
  }>({ 
    id: '', nombre: '', descripcion: '', permisos: [], estado: 'Activo' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets?range=Roles!A:E');
      if (res.ok) {
        const json = await res.json();
        const dataWithRow = (json.data || []).map((item: any, index: number) => ({
          ...item,
          rowNumber: index + 2
        }));
        setItems(dataWithRow);
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
        formData.id || `ROL-${Date.now().toString().slice(-4)}`, 
        formData.nombre, formData.descripcion, formData.permisos.join(','), formData.estado
      ];

      if (editingId) {
        values[0] = formData.id;
        await fetch('/api/sheets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: `Roles!A${editingId}:E${editingId}`, values })
        });
      } else {
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Roles!A:E', values })
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

  const openEdit = (item: Rol) => {
    setFormData({ 
      id: item.id, nombre: item.nombre || '', descripcion: item.descripcion || '', 
      permisos: item.permisos ? item.permisos.split(',') : [],
      estado: item.estado 
    });
    setEditingId(item.rowNumber || null);
    setShowModal(true);
  };

  const toggleStatus = async (item: Rol) => {
    if (!item.rowNumber) return;
    setLoading(true);
    const newStatus = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const values = [item.id, item.nombre, item.descripcion, item.permisos, newStatus];
    await fetch('/api/sheets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: `Roles!A${item.rowNumber}:E${item.rowNumber}`, values })
    });
    fetchData();
  };

  const resetForm = () => {
    setFormData({ id: '', nombre: '', descripcion: '', permisos: [], estado: 'Activo' });
    setEditingId(null);
  };

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="text-emerald-400" /> Roles y Permisos
        </h1>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> <span className="hidden md:inline">Nuevo Rol</span>
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-950/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Nombre del Rol</th>
                <th className="p-4 font-medium">Descripción</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Cargando roles...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    No hay roles registrados.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-medium text-white">{item.nombre}</td>
                    <td className="p-4 text-gray-400">{item.descripcion}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => toggleStatus(item)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto pt-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                    <input 
                      required
                      type="text" 
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                    <select 
                      value={formData.estado}
                      onChange={e => setFormData({...formData, estado: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                    <input 
                      type="text" 
                      value={formData.descripcion}
                      onChange={e => setFormData({...formData, descripcion: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-400">Permisos para el rol</label>
                      <button 
                        type="button"
                        onClick={() => {
                          const allSelected = formData.permisos.length === PERMISOS_DISPONIBLES.length;
                          setFormData({...formData, permisos: allSelected ? [] : [...PERMISOS_DISPONIBLES]});
                        }}
                        className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                      >
                        {formData.permisos.length === PERMISOS_DISPONIBLES.length ? 'Desmarcar todos' : 'Marcar todos'}
                      </button>
                    </div>
                    <div className="h-48 overflow-y-auto bg-gray-950 border border-gray-800 rounded-lg p-3 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PERMISOS_DISPONIBLES.map(perm => (
                        <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-gray-900 p-1 rounded transition-colors">
                          <input 
                            type="checkbox" 
                            checked={formData.permisos.includes(perm)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, permisos: [...formData.permisos, perm] });
                              } else {
                                setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== perm) });
                              }
                            }}
                            className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-950" 
                          />
                          <span className="text-sm text-gray-300">{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
