'use client';

import { useState } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { Settings, Save, Lock, Mail, User, ShieldCheck, Loader2 } from 'lucide-react';

export default function PerfilPage() {
  const { usuario, logout } = useGlobal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;

    if (password && password !== confirmPassword) {
      setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // Find the user row
      const res = await fetch('/api/sheets?range=Usuarios!A:H');
      if (res.ok) {
        const json = await res.json();
        const users = json.data || [];
        const userRowIndex = users.findIndex((u: any) => u.username === usuario.username);
        
        if (userRowIndex !== -1) {
          const rowNumber = userRowIndex + 2;
          
          // Guardar nueva info (columna F: email, columna G: password)
          // Solo actualizamos password si se escribió una nueva
          
          // Actualizamos email siempre
          await fetch('/api/sheets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ range: `Usuarios!F${rowNumber}`, values: [email] })
          });

          // Actualizamos password solo si hay
          if (password) {
            // Nota: En un sistema real la contraseña debe ir encriptada (bcrypt).
            // Aquí la encriptamos a base64 para enmascararla como lo hicimos en usuarios/page.tsx
            const hashedPassword = btoa(password); 
            await fetch('/api/sheets', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ range: `Usuarios!G${rowNumber}`, values: [hashedPassword] })
            });
          }

          setMessage({ text: '¡Perfil actualizado correctamente! Si cambiaste tu contraseña, deberás iniciar sesión nuevamente.', type: 'success' });
          
          if (password) {
            setTimeout(() => {
              logout();
            }, 3000);
          }
        } else {
          setMessage({ text: 'Error: Usuario no encontrado en la base de datos.', type: 'error' });
        }
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error de conexión. Intente nuevamente.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!usuario) return null;

  return (
    <div className="p-4 md:p-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-emerald-400" size={28} />
        <h1 className="text-2xl font-bold text-white">Configurar Perfil</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header decorativo */}
        <div className="h-32 bg-gradient-to-r from-emerald-900/40 to-gray-900 border-b border-gray-800 flex items-end px-8 pb-6">
          <div className="flex items-center gap-4 translate-y-10">
            <div className="w-24 h-24 rounded-full bg-gray-950 border-4 border-gray-900 text-emerald-500 flex items-center justify-center font-bold text-4xl shadow-xl">
              {usuario.username.charAt(0).toUpperCase()}
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-white leading-tight">@{usuario.username}</h2>
              <div className="flex items-center gap-2 text-emerald-400 mt-1">
                <ShieldCheck size={16} />
                <span className="text-sm font-medium capitalize">{usuario.rol_nombre}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="p-8 pt-16">
          
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Username (Read Only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <User size={16} /> Nombre de usuario
              </label>
              <input 
                type="text" 
                value={usuario.username}
                disabled
                className="w-full bg-gray-950/50 border border-gray-800/50 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-600">El nombre de usuario no puede cambiarse.</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Mail size={16} /> Correo electrónico <span className="text-emerald-500">*</span>
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@gmail.com"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="border-t border-gray-800 my-8"></div>

          <h3 className="text-lg font-medium text-white mb-6">Cambio de Contraseña</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Lock size={16} /> Nueva contraseña
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar en blanco para no cambiar"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Lock size={16} /> Confirmar nueva contraseña
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la nueva contraseña"
                disabled={!password}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
