'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Search, Loader2, Info } from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';

interface AuditLog {
  id: string;
  fecha: string;
  usuario: string;
  modulo: string;
  accion: string;
  detalles: string;
}

export default function AuditoriaPage() {
  const { usuario } = useGlobal();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets?range=Auditoria!A:F');
      if (res.ok) {
        const json = await res.json();
        // Invertimos el arreglo para que el más reciente salga arriba
        setLogs((json.data || []).reverse());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de seguridad doble: solo si el usuario tiene el permiso de "ver-auditoria"
  // Si no, aunque traten de acceder a la URL, se bloquea (adicional a la capa superior).
  if (!usuario?.permisos.includes('ver-auditoria') && usuario?.username !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full">
          <ShieldAlert className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-gray-400">No tienes permisos para ver la Bitácora de Auditoría. Contacta al administrador si crees que esto es un error.</p>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => 
    log.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.modulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.detalles?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (accion: string) => {
    const act = (accion || '').toUpperCase();
    if (act === 'ELIMINAR' || act === 'MERMA') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (act === 'CREAR' || act === 'ENTRADA') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (act === 'EDITAR' || act === 'AJUSTE') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (act === 'CIERRE' || act === 'APERTURA') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-gray-800 text-gray-300 border-gray-700';
  };

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-500" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-white">Bitácora de Auditoría</h1>
            <p className="text-gray-400 mt-1 text-sm">Registro inmutable de actividades críticas del sistema.</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 shadow-sm mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por usuario, módulo o detalles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-950/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Fecha y Hora</th>
                <th className="p-4 font-medium">Usuario</th>
                <th className="p-4 font-medium">Módulo</th>
                <th className="p-4 font-medium">Acción</th>
                <th className="p-4 font-medium w-full">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Cargando bitácora de auditoría...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                    <Info size={32} className="mb-2 opacity-50" />
                    No hay registros de auditoría encontrados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 text-gray-400 font-mono text-xs">{log.fecha}</td>
                    <td className="p-4 font-medium text-white">@{log.usuario}</td>
                    <td className="p-4 text-gray-400">{log.modulo}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getActionColor(log.accion)}`}>
                        {(log.accion || 'ACCIÓN').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300 break-all whitespace-normal">{log.detalles}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
