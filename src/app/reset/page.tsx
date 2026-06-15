'use client';

import { useState } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { AlertTriangle, Loader2, RefreshCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const RANGES_TO_CLEAR = [
  'Ventas!A2:Z',
  'Ventas_Detalle!A2:Z',
  'Compras!A2:Z',
  'Compras_Detalle!A2:Z',
  'Kardex!A2:Z',
  'Auditoria!A2:Z',
  'Turnos!A2:Z',
  'Productos!A2:Z',
  'Clientes!A2:Z',
  'Proveedores!A2:Z',
  'Categorias!A2:Z',
  'Marcas!A2:Z',
  'Presentaciones!A2:Z',
  'Empleados!A2:Z',
  'Empresa!A2:Z',
  'Cajas!A2:Z'
  // Excluimos explícitamente: Usuarios y Roles
];

export default function ResetPage() {
  const { usuario, refreshTurno } = useGlobal();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: RANGES_TO_CLEAR.length });
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  // Solo el admin maestro puede ver esto
  if (!usuario || usuario.username !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in">
        <ShieldCheck size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
        <p className="text-gray-400 max-w-md">Esta es una zona de alta seguridad. Solo el administrador principal del sistema puede acceder a esta herramienta.</p>
      </div>
    );
  }

  const handleReset = async () => {
    if (confirmText.trim().toUpperCase() !== 'CONFIRMAR') return;
    
    setProcessing(true);
    setStatus('processing');
    setProgress({ current: 0, total: RANGES_TO_CLEAR.length });

    try {
      for (let i = 0; i < RANGES_TO_CLEAR.length; i++) {
        const range = RANGES_TO_CLEAR[i];
        
        await fetch(`/api/sheets?range=${range}`, {
          method: 'DELETE',
        });
        
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }

      // Sincronizar el estado global (turnos en memoria) con la BD recién vaciada
      await refreshTurno();

      setStatus('success');
      setConfirmText('');
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 md:p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-2xl bg-red-500/10 border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-red-500/5">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-red-500/20 bg-red-950/20 text-center">
          <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-500/30">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">Restablecimiento de Fábrica</h1>
          <p className="text-red-400 text-xs md:text-sm max-w-lg mx-auto">
            Esta acción eliminará de forma <strong>permanente</strong> todas las ventas, compras, productos y catálogos.
          </p>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 bg-gray-900">
          
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <RefreshCcw size={32} />
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">Sistema Restablecido</h2>
              <p className="text-gray-400 mb-8">Todas las tablas operativas han sido vaciadas exitosamente. El sistema está limpio y listo para producción.</p>
              <button 
                onClick={() => router.push('/')}
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-xl transition-all"
              >
                Volver al Panel de Inicio
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mb-5">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-500" size={18} /> Datos Protegidos
                </h3>
                <p className="text-xs text-gray-400 mb-1">
                  Las siguientes tablas <strong className="text-emerald-400">NO serán borradas</strong> para garantizar acceso:
                </p>
                <ul className="list-disc list-inside text-xs text-gray-500 font-mono mt-1">
                  <li>Usuarios (Cuentas de acceso)</li>
                  <li>Roles (Permisos)</li>
                </ul>
              </div>

              {status === 'error' && (
                <div className="bg-red-500/20 text-red-400 p-3 rounded-xl mb-4 border border-red-500/30 text-sm">
                  Hubo un error de conexión al intentar vaciar las tablas.
                </div>
              )}

              <div className="space-y-3 mb-5">
                <label className="block text-xs md:text-sm font-medium text-gray-300">
                  Para proceder, escribe la palabra <strong className="text-white bg-gray-800 px-2 py-0.5 rounded">CONFIRMAR</strong>:
                </label>
                <input 
                  type="text" 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={processing}
                  placeholder="CONFIRMAR"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors font-mono tracking-widest text-center uppercase"
                />
              </div>

              {processing && (
                <div className="mb-5">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Vaciando tablas...</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-red-500 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleReset}
                disabled={confirmText.trim().toUpperCase() !== 'CONFIRMAR' || processing}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                {processing ? (
                  <><Loader2 className="animate-spin" size={20} /> Procesando...</>
                ) : (
                  <><Trash2 size={20} /> Eliminar Todos los Datos</>
                )}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
