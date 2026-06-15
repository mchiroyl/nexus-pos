'use client';

import { useEffect, useState } from 'react';
import { Box, Search, Loader2 } from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  presentacion_id: string;
}

interface KardexRow {
  id: string;
  fecha: string;
  producto_id: string;
  transaccion: string;
  entrada: string;
  salida: string;
  saldo: string;
  costo_unitario: string;
  costo_total: string;
}

export default function InventarioPage() {
  const { empresa } = useGlobal();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [presentaciones, setPresentaciones] = useState<any[]>([]);
  const [kardexData, setKardexData] = useState<KardexRow[]>([]);
  const [filteredKardex, setFilteredKardex] = useState<KardexRow[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingKardex, setLoadingKardex] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resPres, resKardex] = await Promise.all([
        fetch('/api/sheets?range=Productos!A:L'),
        fetch('/api/sheets?range=Presentaciones!A:D'),
        fetch('/api/sheets?range=Kardex!A:I')
      ]);

      if (resProd.ok) {
        const json = await resProd.json();
        setProductos(json.data || []);
      }
      if (resPres.ok) {
        const json = await resPres.json();
        setPresentaciones(json.data || []);
      }
      if (resKardex.ok) {
        const json = await resKardex.json();
        setKardexData(json.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!selectedProduct) {
      setFilteredKardex([]);
      return;
    }
    setLoadingKardex(true);
    setTimeout(() => {
      const data = kardexData.filter(k => k.producto_id === selectedProduct);
      setFilteredKardex(data);
      setLoadingKardex(false);
    }, 500);
  };

  const getPresName = (id: string) => presentaciones.find(p => p.id === id)?.nombre || '';

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 mb-8">
        <Box className="text-emerald-400" size={32} />
        <h1 className="text-3xl font-bold text-white">Kardex de Productos</h1>
      </div>

      {/* Buscador Superior */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">Seleccione un Producto</label>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-gray-500" size={20} />
            <select 
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 appearance-none"
            >
              <option value="">Seleccionar...</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  Código: {p.codigo} - {p.nombre} {p.presentacion_id ? `- Presentación: ${getPresName(p.presentacion_id)}` : ''}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleSearch}
            disabled={!selectedProduct || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center min-w-[120px]"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Tabla Kardex */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-sm">
        <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex items-center gap-2">
          <Box size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-300">Tabla kardex del producto</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-4 font-medium">Fecha y Hora</th>
                <th className="p-4 font-medium">Transacción</th>
                <th className="p-4 font-medium text-center">Entrada</th>
                <th className="p-4 font-medium text-center">Salida</th>
                <th className="p-4 font-medium text-center">Saldo</th>
                <th className="p-4 font-medium text-right">Costo unitario</th>
                <th className="p-4 font-medium text-right">Costo total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading || loadingKardex ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Cargando datos...
                  </td>
                </tr>
              ) : !selectedProduct ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <Search className="mx-auto mb-3 opacity-20" size={48} />
                    Seleccione un producto y presione Buscar para ver su historial.
                  </td>
                </tr>
              ) : filteredKardex.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No hay movimientos registrados en el Kardex para este producto.
                  </td>
                </tr>
              ) : (
                filteredKardex.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 text-gray-300">{row.fecha}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider ${
                        row.transaccion === 'COMPRA' || row.transaccion === 'APERTURA' 
                          ? 'bg-blue-500/10 text-blue-400' 
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {row.transaccion}
                      </span>
                    </td>
                    <td className="p-4 text-center font-medium text-blue-400">
                      {row.entrada !== '0' ? row.entrada : ''}
                    </td>
                    <td className="p-4 text-center font-medium text-emerald-400">
                      {row.salida !== '0' ? row.salida : ''}
                    </td>
                    <td className="p-4 text-center font-bold text-white bg-gray-800/30">
                      {row.saldo}
                    </td>
                    <td className="p-4 text-right text-gray-300">
                      {empresa.moneda}{parseFloat(row.costo_unitario || '0').toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-gray-300">
                      {empresa.moneda}{parseFloat(row.costo_total || '0').toFixed(2)}
                    </td>
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
