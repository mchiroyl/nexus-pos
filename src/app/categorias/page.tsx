'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag, Loader2 } from 'lucide-react';

interface Categoria {
  rowNumber?: number; // Para saber qué fila editar
  id: string;
  nombre: string;
  descripcion: string;
  estado: string;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form
  const [formData, setFormData] = useState({ id: '', nombre: '', descripcion: '', estado: 'Activo' });

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets?range=Categorias!A:D');
      if (res.ok) {
        const json = await res.json();
        // Guardamos el índice original de la fila sumando 2 (la fila 1 son headers)
        const dataWithRow = json.data.map((item: any, index: number) => ({
          ...item,
          rowNumber: index + 2
        }));
        setCategorias(dataWithRow);
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
      if (editingId) {
        // Update
        const values = [formData.id, formData.nombre, formData.descripcion, formData.estado];
        await fetch('/api/sheets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: `Categorias!A${editingId}:D${editingId}`, values })
        });
      } else {
        // Create - Generamos un ID simple si no tiene
        const newId = formData.id || `CAT-${Date.now().toString().slice(-6)}`;
        const values = [newId, formData.nombre, formData.descripcion, formData.estado];
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Categorias!A:D', values })
        });
      }
      setShowModal(false);
      resetForm();
      fetchCategorias();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (cat: Categoria) => {
    setFormData({ id: cat.id, nombre: cat.nombre, descripcion: cat.descripcion, estado: cat.estado });
    setEditingId(cat.rowNumber || null);
    setShowModal(true);
  };

  const toggleStatus = async (cat: Categoria) => {
    if (!cat.rowNumber) return;
    setLoading(true);
    const newStatus = cat.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const values = [cat.id, cat.nombre, cat.descripcion, newStatus];
    await fetch('/api/sheets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: `Categorias!A${cat.rowNumber}:D${cat.rowNumber}`, values })
    });
    fetchCategorias();
  };

  const resetForm = () => {
    setFormData({ id: '', nombre: '', descripcion: '', estado: 'Activo' });
    setEditingId(null);
  };

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Tag className="text-emerald-400" /> Categorías
        </h1>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> <span className="hidden md:inline">Nueva Categoría</span>
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-950/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Nombre</th>
                <th className="p-4 font-medium hidden md:table-cell">Descripción</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && categorias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Cargando categorías...
                  </td>
                </tr>
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No hay categorías registradas.
                  </td>
                </tr>
              ) : (
                categorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-medium text-gray-300">{cat.id}</td>
                    <td className="p-4 text-white font-medium">{cat.nombre}</td>
                    <td className="p-4 text-gray-400 hidden md:table-cell">{cat.descripcion}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        cat.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {cat.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openEdit(cat)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => toggleStatus(cat)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
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

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                  <input 
                    required
                    type="text" 
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ej. Bebidas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                  <textarea 
                    value={formData.descripcion}
                    onChange={e => setFormData({...formData, descripcion: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Refrescos, jugos, etc."
                    rows={3}
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
