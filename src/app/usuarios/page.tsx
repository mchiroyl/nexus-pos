'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UserCog, Loader2 } from 'lucide-react';

interface Usuario {
  rowNumber?: number;
  id: string;
  empleado_id: string;
  username: string;
  email: string;
  password?: string;
  rol_id: string;
  estado: string;
}

export default function UsuariosPage() {
  const [items, setItems] = useState<Usuario[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ 
    id: '', empleado_id: '', username: '', email: '', password: '', confirmPassword: '', rol_id: '', estado: 'Activo' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUsu, resEmp, resRol] = await Promise.all([
        fetch('/api/sheets?range=Usuarios!A:G'),
        fetch('/api/sheets?range=Empleados!A:F'),
        fetch('/api/sheets?range=Roles!A:E')
      ]);

      if (resUsu.ok) {
        const json = await resUsu.json();
        const dataWithRow = (json.data || []).map((item: any, index: number) => ({
          ...item,
          rowNumber: index + 2
        }));
        setItems(dataWithRow);
      }
      
      if (resEmp.ok) {
        const json = await resEmp.json();
        setEmpleados((json.data || []).filter((e:any) => e.estado === 'Activo'));
      }
      
      if (resRol.ok) {
        const json = await resRol.json();
        setRoles((json.data || []).filter((r:any) => r.estado === 'Activo'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    
    setSaving(true);
    try {
      // In a real app we'd hash the password, here we just save it or leave it untouched if empty on edit
      let finalPass = formData.password;
      
      if (editingId && !formData.password) {
        // If editing and no new pass provided, keep the old one
        const oldItem = items.find(i => i.rowNumber === editingId);
        finalPass = oldItem?.password || '';
      }

      const values = [
        formData.id || `USU-${Date.now().toString().slice(-4)}`, 
        formData.empleado_id, formData.username, formData.email, finalPass, formData.rol_id, formData.estado
      ];

      if (editingId) {
        values[0] = formData.id;
        await fetch('/api/sheets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: `Usuarios!A${editingId}:G${editingId}`, values })
        });
      } else {
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Usuarios!A:G', values })
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

  const openEdit = (item: Usuario) => {
    setFormData({ 
      id: item.id, empleado_id: item.empleado_id || '', username: item.username || '', email: item.email || '',
      password: '', confirmPassword: '', // Blank out for security
      rol_id: item.rol_id || '', estado: item.estado 
    });
    setEditingId(item.rowNumber || null);
    setShowModal(true);
  };

  const toggleStatus = async (item: Usuario) => {
    if (!item.rowNumber) return;
    setLoading(true);
    const newStatus = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const values = [item.id, item.empleado_id, item.username, item.email, item.password, item.rol_id, newStatus];
    await fetch('/api/sheets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: `Usuarios!A${item.rowNumber}:G${item.rowNumber}`, values })
    });
    fetchData();
  };

  const resetForm = () => {
    setFormData({ id: '', empleado_id: '', username: '', email: '', password: '', confirmPassword: '', rol_id: '', estado: 'Activo' });
    setEditingId(null);
  };

  const getEmpName = (id: string) => {
    const emp = empleados.find(e => e.id === id);
    return emp ? `${emp.nombres} ${emp.apellidos}` : 'N/A';
  };
  
  const getRolName = (id: string) => roles.find(r => r.id === id)?.nombre || 'N/A';

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserCog className="text-emerald-400" /> Cuentas de Usuario
        </h1>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> <span className="hidden md:inline">Nuevo Usuario</span>
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-950/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Username</th>
                <th className="p-4 font-medium hidden md:table-cell">Email</th>
                <th className="p-4 font-medium">Empleado Asignado</th>
                <th className="p-4 font-medium">Rol</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Cargando usuarios...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-bold text-white">@{item.username}</td>
                    <td className="p-4 text-gray-400 hidden md:table-cell">{item.email}</td>
                    <td className="p-4 text-gray-300">{getEmpName(item.empleado_id)}</td>
                    <td className="p-4 text-gray-400">{getRolName(item.rol_id)}</td>
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
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Empleado Asignado</label>
                    <select 
                      required value={formData.empleado_id}
                      onChange={e => setFormData({...formData, empleado_id: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Seleccione un empleado...</option>
                      {empleados.map(e => <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de Usuario</label>
                    <input 
                      required type="text" value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                    <input 
                      type="email" value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña {editingId && '(Dejar vacío para no cambiar)'}</label>
                    <input 
                      type="password" value={formData.password}
                      required={!editingId}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Confirmar Contraseña</label>
                    <input 
                      type="password" value={formData.confirmPassword}
                      required={!editingId && !!formData.password}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Rol</label>
                    <select 
                      required value={formData.rol_id}
                      onChange={e => setFormData({...formData, rol_id: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Seleccione un rol...</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
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
