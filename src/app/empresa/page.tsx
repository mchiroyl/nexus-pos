'use client';

import { useEffect, useState } from 'react';
import { Save, Building2, MapPin, Phone, DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';

export default function EmpresaPage() {
  const { empresa, refreshEmpresa } = useGlobal();
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    moneda: ''
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setFormData({
      nombre: empresa.nombre,
      direccion: empresa.direccion,
      telefono: empresa.telefono,
      moneda: empresa.moneda
    });
  }, [empresa]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Guardar en la primera fila (Row 2, asumiendo Row 1 son headers)
      // Headers: id, nombre, direccion, telefono, moneda
      const values = ['1', formData.nombre, formData.direccion, formData.telefono, formData.moneda];
      
      await fetch('/api/sheets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Empresa!A2:E2', values })
      });

      setSuccess(true);
      refreshEmpresa(); // Actualizar el contexto global
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500 max-w-4xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <Building2 className="text-emerald-400" size={32} />
        <h1 className="text-3xl font-bold text-white">Configuración de Empresa</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Negocio</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 text-gray-500" size={20} />
              <input 
                type="text" 
                required
                value={formData.nombre}
                onChange={e => setFormData({...formData, nombre: e.target.value})}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Ej. Tienda Iliana"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Dirección</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-500" size={20} />
              <input 
                type="text" 
                required
                value={formData.direccion}
                onChange={e => setFormData({...formData, direccion: e.target.value})}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Ej. Zona 1, Guatemala"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-500" size={20} />
                <input 
                  type="text" 
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Ej. +502 1234 5678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Símbolo de Moneda</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 text-gray-500" size={20} />
                <input 
                  type="text" 
                  required
                  value={formData.moneda}
                  onChange={e => setFormData({...formData, moneda: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors font-bold"
                  placeholder="Ej. Q"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Este símbolo se usará en todo el sistema (Ventas, Productos, Dashboard).</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 flex justify-end">
            <button 
              type="submit"
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : success ? <CheckCircle2 size={20} /> : <Save size={20} />}
              {saving ? 'Guardando...' : success ? '¡Guardado!' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
