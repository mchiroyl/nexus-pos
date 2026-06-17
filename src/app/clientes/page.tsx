'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Loader2 } from 'lucide-react';

interface Cliente {
  rowNumber?: number;
  id: string;
  documento: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  estado: string;
}

export default function ClientesPage() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ 
    id: '', documento: '', nombre: '', direccion: '', telefono: '', email: '', estado: 'Activo' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets?range=Clientes!A:G');
      if (res.ok) {
        const json = await res.json();
        const dataWithRow = json.data.map((item: any, index: number) => ({
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
        formData.id || `CLI-${Date.now().toString().slice(-6)}`, 
        formData.documento, formData.nombre, formData.direccion, 
        formData.telefono, formData.email, formData.estado
      ];

      if (editingId) {
        values[0] = formData.id; // Keep original ID on edit
        await fetch('/api/sheets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: `Clientes!A${editingId}:G${editingId}`, values })
        });
      } else {
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Clientes!A:G', values })
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

  const openEdit = (item: Cliente) => {
    setFormData({ 
      id: item.id, documento: item.documento || '', nombre: item.nombre || '', 
      direccion: item.direccion || '', telefono: item.telefono || '', 
      email: item.email || '', estado: item.estado 
    });
    setEditingId(item.rowNumber || null);
    setShowModal(true);
  };

  const toggleStatus = async (item: Cliente) => {
    if (!item.rowNumber) return;
    setLoading(true);
    const newStatus = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const values = [item.id, item.documento, item.nombre, item.direccion, item.telefono, item.email, newStatus];
    await fetch('/api/sheets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: `Clientes!A${item.rowNumber}:G${item.rowNumber}`, values })
    });
    fetchData();
  };

  const resetForm = () => {
    setFormData({ id: '', documento: '', nombre: '', direccion: '', telefono: '', email: '', estado: 'Activo' });
    setEditingId(null);
  };

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-emerald-400" /> Clientes
        </h1>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> <span className="hidden md:inline">Nuevo Cliente</span>
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-950/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">NIT / DPI</th>
                <th className="p-4 font-medium">Nombre</th>
                <th className="p-4 font-medium hidden md:table-cell">Teléfono</th>
                <th className="p-4 font-medium hidden lg:table-cell">Email</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Cargando clientes...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No hay clientes registrados.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-medium text-gray-300">{item.documento}</td>
                    <td className="p-4 text-white font-medium">{item.nombre}</td>
                    <td className="p-4 text-gray-400 hidden md:table-cell">{item.telefono}</td>
                    <td className="p-4 text-gray-400 hidden lg:table-cell">{item.email}</td>
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      NIT / DPI <span className="text-xs text-gray-500 font-normal">(Opcional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.documento}
                      placeholder="Ej: 1234567-8 ó 2345678901234"
                      onChange={e => setFormData({...formData, documento: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
                    <input 
                      required
                      type="text" 
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Dirección</label>
                    <input 
                      type="text" 
                      value={formData.direccion}
                      onChange={e => setFormData({...formData, direccion: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={formData.telefono}
                      onChange={e => setFormData({...formData, telefono: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
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
