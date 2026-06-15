'use client';

import { useState } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { useRouter } from 'next/navigation';
import { Store, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setUsuario, empresa } = useGlobal();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const [resUsu, resEmp, resRol] = await Promise.all([
        fetch('/api/sheets?range=Usuarios!A:G'),
        fetch('/api/sheets?range=Empleados!A:F'),
        fetch('/api/sheets?range=Roles!A:E')
      ]);

      if (!resUsu.ok || !resEmp.ok || !resRol.ok) {
        throw new Error("Error conectando a la base de datos");
      }

      const jsonUsu = await resUsu.json();
      const jsonEmp = await resEmp.json();
      const jsonRol = await resRol.json();

      const usuarios = jsonUsu.data || [];
      const empleados = jsonEmp.data || [];
      const roles = jsonRol.data || [];

      // Validar credenciales (limpiando el @ y en minúsculas)
      const cleanUsername = username.replace('@', '').toLowerCase();
      const user = usuarios.find((u: any) => 
        u.username.toLowerCase() === cleanUsername && 
        u.password === password &&
        u.estado === 'Activo'
      );

      if (!user) {
        setError('Usuario o contraseña incorrectos, o cuenta inactiva.');
        setLoading(false);
        return;
      }

      const empleado = empleados.find((e: any) => e.id === user.empleado_id);
      const rol = roles.find((r: any) => r.id === user.rol_id);

      if (!rol || rol.estado !== 'Activo') {
        setError('El rol asignado a este usuario está inactivo o no existe.');
        setLoading(false);
        return;
      }

      // Iniciar sesión
      const sessionData = {
        id: user.id,
        username: user.username,
        empleado_id: user.empleado_id,
        empleado_nombre: empleado ? `${empleado.nombres} ${empleado.apellidos}` : 'Admin',
        rol_id: user.rol_id,
        rol_nombre: rol.nombre,
        permisos: rol.permisos ? rol.permisos.split(',').map((p: string) => p.trim()) : []
      };

      setUsuario(sessionData);
      localStorage.setItem('pos_session', JSON.stringify(sessionData));
      
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">
            {empresa?.nombre || 'POS Next'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre de Usuario</label>
            <input 
              required
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="@usuario"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Contraseña</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} Sistema de Punto de Venta
        </div>
      </div>
    </div>
  );
}
