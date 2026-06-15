'use client';

import { useEffect, useState } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { Wallet, LogIn, LogOut, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Caja {
  id: string;
  nombre: string;
  estado: string;
}

export default function TurnoPage() {
  const { usuario, empresa, turnoActivo, refreshTurno } = useGlobal();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para Apertura
  const [selectedCaja, setSelectedCaja] = useState('');
  const [montoApertura, setMontoApertura] = useState('');

  // Estados para Cierre
  const [montoCierreReal, setMontoCierreReal] = useState('');
  const [ventasAcumuladas, setVentasAcumuladas] = useState(0);

  useEffect(() => {
    fetchCajas();
  }, []);

  useEffect(() => {
    if (turnoActivo) {
      calcularVentasDelTurno();
    }
  }, [turnoActivo]);

  const fetchCajas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets?range=Cajas!A:D');
      if (res.ok) {
        const json = await res.json();
        const activeCajas = (json.data || []).filter((c: any) => c.estado === 'Activo');
        setCajas(activeCajas);
        if (activeCajas.length > 0) setSelectedCaja(activeCajas[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calcularVentasDelTurno = async () => {
    if (!turnoActivo) return;
    try {
      const res = await fetch('/api/sheets?range=Ventas!A:H');
      if (res.ok) {
        const json = await res.json();
        const ventas = json.data || [];
        // Sumar las ventas cuyo turno_id sea igual al del turno activo
        const totalVentas = ventas
          .filter((v: any) => v.turno_id === turnoActivo.id && v.estado === 'Completada')
          .reduce((sum: number, v: any) => sum + parseFloat(v.total || '0'), 0);
        
        setVentasAcumuladas(totalVentas);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAbrirTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaja || !montoApertura || !usuario) return;
    setProcessing(true);

    try {
      setErrorMsg('');
      
      // Validar si la caja ya está en uso por otro cajero
      const resTurnos = await fetch('/api/sheets?range=Turnos!A:I');
      if (resTurnos.ok) {
        const jsonTurnos = await resTurnos.json();
        const turnos = jsonTurnos.data || [];
        const cajaEnUso = turnos.find((t: any) => t.caja_id === selectedCaja && t.estado === 'Abierto');
        
        if (cajaEnUso) {
          setErrorMsg('Esta caja ya está abierta por otro empleado. Selecciona otra caja o pide que cierren el turno actual.');
          setProcessing(false);
          return;
        }
      }

      const turnoId = `TUR-${Date.now().toString().slice(-6)}`;
      const fecha = new Date().toLocaleString();
      
      const values = [
        turnoId,
        selectedCaja,
        usuario.id,
        fecha,
        montoApertura,
        '', // fecha_cierre vacía
        '0', // monto_ventas
        '0', // monto_cierre_real
        'Abierto'
      ];

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Turnos!A:I', values })
      });

      const logValues = [
        `AUD-${Date.now().toString().slice(-6)}`,
        fecha,
        usuario.username || 'Sistema',
        'Caja',
        'APERTURA',
        `Aperturó caja con fondo de ${empresa?.moneda || 'Q'}${montoApertura}`
      ];
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Auditoria!A:F', values: logValues })
      });

      setSuccessMsg('Turno abierto exitosamente.');
      await refreshTurno();
      setMontoApertura('');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCerrarTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoActivo || !montoCierreReal) return;
    setProcessing(true);

    try {
      const fechaCierre = new Date().toLocaleString();
      const rowNum = turnoActivo.rowNumber;

      // Actualizar la fila entera del turno (columnas F a I)
      // En api/sheets PUT necesitamos mandar los valores a partir de cierta columna o hacer un UPDATE de toda la fila.
      // Vamos a actualizar toda la fila para que sea seguro
      const values = [
        turnoActivo.id,
        turnoActivo.caja_id,
        turnoActivo.usuario_id,
        turnoActivo.fecha_apertura,
        turnoActivo.monto_apertura,
        fechaCierre,
        ventasAcumuladas.toString(),
        montoCierreReal,
        'Cerrado'
      ];

      await fetch('/api/sheets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: `Turnos!A${rowNum}:I${rowNum}`, values })
      });

      const totalEsperado = parseFloat(turnoActivo.monto_apertura) + ventasAcumuladas;
      const diferencia = parseFloat(montoCierreReal) - totalEsperado;
      
      const logValues = [
        `AUD-${Date.now().toString().slice(-6)}`,
        fechaCierre,
        usuario?.username || 'Sistema',
        'Caja',
        'CIERRE',
        `Cerró caja. Declaró: ${empresa?.moneda || 'Q'}${montoCierreReal}, Diferencia: ${empresa?.moneda || 'Q'}${diferencia.toFixed(2)}`
      ];
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Auditoria!A:F', values: logValues })
      });

      setSuccessMsg('Turno cerrado (Arqueo) exitosamente.');
      await refreshTurno();
      setMontoCierreReal('');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500 mb-2" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
          <Wallet size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Turno de Caja</h1>
          <p className="text-gray-400 text-sm">Gestiona la apertura y cierre de tu sesión de ventas</p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={20} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-3 animate-in fade-in">
          <AlertTriangle size={20} />
          {errorMsg}
        </div>
      )}

      {!turnoActivo ? (
        // PANTALLA DE APERTURA
        <div className="max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4">
              <LogIn size={32} />
            </div>
            <h2 className="text-xl font-bold text-white text-center">Abrir Turno</h2>
            <p className="text-gray-400 text-sm text-center mt-1">Declara tu fondo inicial de caja</p>
          </div>

          <form onSubmit={handleAbrirTurno} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Seleccionar Caja</label>
              <select 
                required
                value={selectedCaja}
                onChange={e => setSelectedCaja(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-emerald-500 transition-colors"
              >
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Monto de Apertura (Fondo Inicial)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">{empresa?.moneda}</span>
                <input 
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoApertura}
                  onChange={e => setMontoApertura(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-8 pr-4 text-white focus:border-emerald-500 transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={18} /> Aperturar Caja</>}
            </button>
          </form>
        </div>
      ) : (
        // PANTALLA DE CIERRE (ARQUEO)
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Turno Abierto</h2>
                <p className="text-gray-400 text-sm">Inició el: {turnoActivo.fecha_apertura}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Fondo Inicial (Apertura)</span>
                <span className="text-white font-medium">{empresa?.moneda}{parseFloat(turnoActivo.monto_apertura).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Ventas del Turno</span>
                <span className="text-emerald-400 font-bold">+{empresa?.moneda}{ventasAcumuladas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-gray-800 mt-2">
                <span className="text-white font-bold text-lg">Total Esperado en Caja</span>
                <span className="text-white font-bold text-xl">{empresa?.moneda}{(parseFloat(turnoActivo.monto_apertura) + ventasAcumuladas).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center mb-4">
                <LogOut size={32} />
              </div>
              <h2 className="text-xl font-bold text-white text-center">Cerrar Turno (Arqueo)</h2>
              <p className="text-gray-400 text-sm text-center mt-1">Ingresa el dinero físico para cuadrar</p>
            </div>

            <form onSubmit={handleCerrarTurno} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Dinero Real en Caja</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">{empresa?.moneda}</span>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoCierreReal}
                    onChange={e => setMontoCierreReal(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-8 pr-4 text-white focus:border-emerald-500 transition-colors text-lg font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {montoCierreReal && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  parseFloat(montoCierreReal) === (parseFloat(turnoActivo.monto_apertura) + ventasAcumuladas)
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : parseFloat(montoCierreReal) > (parseFloat(turnoActivo.monto_apertura) + ventasAcumuladas)
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">
                      {parseFloat(montoCierreReal) === (parseFloat(turnoActivo.monto_apertura) + ventasAcumuladas) && "¡Cuadre Perfecto!"}
                      {parseFloat(montoCierreReal) > (parseFloat(turnoActivo.monto_apertura) + ventasAcumuladas) && "Hay un Sobrante de Caja"}
                      {parseFloat(montoCierreReal) < (parseFloat(turnoActivo.monto_apertura) + ventasAcumuladas) && "Hay un Faltante de Caja"}
                    </p>
                    <p className="text-xs mt-1 opacity-80">
                      Diferencia: {empresa?.moneda}{Math.abs(parseFloat(montoCierreReal) - (parseFloat(turnoActivo.monto_apertura) + ventasAcumuladas)).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={processing}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
              >
                {processing ? <Loader2 className="animate-spin" size={20} /> : <><LogOut size={18} /> Confirmar Cierre</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
