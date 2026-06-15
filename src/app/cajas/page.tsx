'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Store, Loader2 } from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';

interface Caja {
  rowNumber?: number;
  id: string;
  nombre: string;
  estado: string;
}

export default function CajasPage() {
  const { empresa } = useGlobal();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Caja>>({ estado: 'Activo' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCajas();
  }, []);

  const fetchCajas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets?range=Cajas!A:D');
      if (res.ok) {
        const json = await res.json();
        const formattedData = (json.data || []).map((item: any, index: number) => ({
          ...item,
          rowNumber: index + 2 // Fila 1 son encabezados
        }));
        setCajas(formattedData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (caja?: Caja) => {
    if (caja) {
      setFormData(caja);
      setIsEditing(true);
    } else {
      setFormData({ estado: 'Activo' });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (isEditing && formData.rowNumber) {
        const values = [formData.id, formData.nombre, formData.estado];
        await fetch('/api/sheets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: `Cajas!A${formData.rowNumber}:C${formData.rowNumber}`, values })
        });
      } else {
        const newId = `CAJ-${Date.now().toString().slice(-4)}`;
        const values = [newId, formData.nombre, formData.estado];
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Cajas!A:C', values })
        });
      }
      setIsModalOpen(false);
      fetchCajas();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rowNumber: number) => {
    if (!confirm('¿Estás seguro de eliminar esta caja?')) return;
    try {
      await fetch('/api/sheets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Cajas', row: rowNumber })
      });
      fetchCajas();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Store className="text-emerald-400" /> Cajas (Estaciones)
          </h1>
          <p className="text-gray-400 text-sm">Administra las cajas físicas de tu negocio</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Nueva Caja
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-gray-400 text-sm">
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Nombre de Caja</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <Loader2 className="animate-spin text-emerald-500 mx-auto" size={32} />
                  </td>
                </tr>
              ) : cajas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    No hay cajas registradas. Crea tu "Caja Principal" para empezar.
                  </td>
                </tr>
              ) : (
                cajas.map((caja) => (
                  <tr key={caja.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 text-gray-400 text-sm">{caja.id}</td>
                    <td className="p-4 font-medium text-white">{caja.nombre}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        caja.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {caja.estado}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(caja)}
                          className="p-2 text-gray-400 hover:text-blue-400 bg-gray-950 rounded-lg transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(caja.rowNumber!)}
                          className="p-2 text-gray-400 hover:text-red-400 bg-gray-950 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-6">
              {isEditing ? 'Editar Caja' : 'Nueva Caja'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre de la Caja</label>
                <input 
                  required
                  type="text" 
                  value={formData.nombre || ''}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Ej. Caja Principal, Caja 2..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Estado</label>
                <select 
                  value={formData.estado}
                  onChange={e => setFormData({...formData, estado: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-800">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex justify-center items-center"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
