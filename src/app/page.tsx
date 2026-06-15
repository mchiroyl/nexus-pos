'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, PackageOpen, TrendingUp, AlertCircle, Loader2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useGlobal } from '@/context/GlobalContext';

export default function Dashboard() {
  const { empresa, usuario } = useGlobal();
  const router = useRouter();
  const [ventas, setVentas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resVentas, resProd] = await Promise.all([
          fetch('/api/sheets?range=Ventas!A:G'),
          fetch('/api/sheets?range=Productos!A:M')
        ]);
        
        if (resVentas.ok) {
          const jsonVentas = await resVentas.json();
          setVentas(jsonVentas.data || []);
        }
        if (resProd.ok) {
          const jsonProd = await resProd.json();
          setProductos(jsonProd.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    if (usuario && !usuario.permisos.includes('ver-panel')) {
      if (usuario.permisos.includes('aperturar-caja')) {
        router.push('/turno');
      } else if (usuario.permisos.includes('ver-ventas')) {
        router.push('/ventas');
      }
      return;
    }

    fetchData();
  }, [usuario, router]);

  if (usuario && !usuario.permisos.includes('ver-panel')) {
    return null; // Prevents rendering the dashboard briefly before redirect
  }

  // Procesamiento de datos
  const hoyStr = new Date().toLocaleDateString();
  
  // Métricas
  const ventasHoy = ventas.filter(v => {
    if (!v.fecha) return false;
    return v.fecha.includes(hoyStr); 
  });
  const totalHoy = ventasHoy.reduce((acc, v) => acc + parseFloat(v.total || '0'), 0);
  const transaccionesHoy = ventasHoy.length;
  
  const prodStockBajo = productos.filter(p => {
    if (p.estado !== 'Activo') return false;
    const stock = parseFloat(p.stock || '0');
    const minimo = parseFloat(p.stock_minimo || '0');
    return stock <= minimo;
  });

  const prodPorVencer = productos.filter(p => {
    if (p.estado !== 'Activo' || !p.fecha_vencimiento) return false;
    const expDate = new Date(p.fecha_vencimiento);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  });

  // Datos para gráfico de ventas (últimos 7 días)
  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString();
  });

  const dataVentas = last7Days.map(dateStr => {
    const daySales = ventas.filter(v => v.fecha && v.fecha.includes(dateStr));
    const total = daySales.reduce((acc, v) => acc + parseFloat(v.total || '0'), 0);
    return {
      name: dateStr.substring(0, 5), // formato corto para el eje x
      total: total
    };
  });

  // Datos para gráfico de stock bajo
  const dataStock = prodStockBajo
    .sort((a, b) => parseFloat(a.stock || '0') - parseFloat(b.stock || '0'))
    .slice(0, 5)
    .map(p => ({
      name: p.nombre,
      stock: parseFloat(p.stock || '0')
    }));

  const ultimasVentas = [...ventas].reverse().slice(0, 5);

  return (
    <main className="p-4 md:p-8 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar h-full">
      <header className="mb-8 md:hidden">
        <h1 className="text-2xl font-bold text-emerald-400">Panel de Control</h1>
      </header>

      <h2 className="text-2xl font-bold mb-6 hidden md:block text-white">Resumen de Hoy</h2>
      
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Ventas de Hoy</p>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><DollarSign size={16} /></div>
          </div>
          {loading ? <Loader2 className="animate-spin text-gray-500" size={24}/> : (
            <p className="text-2xl font-bold text-white">{empresa.moneda}{totalHoy.toFixed(2)}</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-sm hover:border-amber-500/30 transition-all">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Stock Crítico</p>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><AlertCircle size={16} /></div>
          </div>
          {loading ? <Loader2 className="animate-spin text-gray-500" size={24}/> : (
            <p className="text-2xl font-bold text-white">{prodStockBajo.length}</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-sm hover:border-blue-500/30 transition-all">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Transacciones</p>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><PackageOpen size={16} /></div>
          </div>
          {loading ? <Loader2 className="animate-spin text-gray-500" size={24}/> : (
            <p className="text-2xl font-bold text-white">{transaccionesHoy}</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-sm hover:border-red-500/30 transition-all">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Por Vencer</p>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><Clock size={16} /></div>
          </div>
          {loading ? <Loader2 className="animate-spin text-gray-500" size={24}/> : (
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-white">{prodPorVencer.length}</p>
              {prodPorVencer.length > 0 && <span className="text-xs text-red-400 mb-1 font-medium">¡Requiere Atención!</span>}
            </div>
          )}
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Gráfico de Ventas */}
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-200">Ventas (Últimos 7 días)</h3>
          <div className="h-64">
            {loading ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataVentas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${empresa.moneda}${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${empresa.moneda}${value}`, 'Total']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico de Stock */}
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-200">Top 5 - Stock Crítico</h3>
          <div className="h-64">
            {loading ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-amber-500" size={32}/></div>
            ) : dataStock.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500">Todo el inventario está sano</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataStock} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: '#1f2937' }}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }}
                    itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${value} unid.`, 'Stock Actual']}
                  />
                  <Bar dataKey="stock" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {dataStock.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.stock === 0 ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
      
      {/* Tabla de Movimientos Recientes */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Últimas Transacciones</h3>
        <div className="bg-gray-900 rounded-2xl overflow-x-auto border border-gray-800 shadow-sm">
          {loading ? (
             <div className="flex justify-center items-center h-48">
               <Loader2 className="animate-spin text-emerald-500" size={32} />
             </div>
          ) : ultimasVentas.length === 0 ? (
             <div className="flex justify-center items-center h-48 text-gray-500">
               Aún no hay ventas registradas
             </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-gray-950/50 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="p-4 font-medium">ID Venta</th>
                  <th className="p-4 font-medium">Fecha</th>
                  <th className="p-4 font-medium">Cliente</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {ultimasVentas.map(v => (
                  <tr key={v.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-medium text-emerald-400">{v.id}</td>
                    <td className="p-4 text-gray-300">{v.fecha}</td>
                    <td className="p-4 text-gray-300">{v.cliente_id}</td>
                    <td className="p-4 font-bold text-white">{empresa.moneda}{parseFloat(v.total || '0').toFixed(2)}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs">{v.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tabla de Vencimientos */}
      {prodPorVencer.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
            <AlertCircle size={20} /> Productos Próximos a Vencer o Vencidos
          </h3>
          <div className="bg-gray-900 rounded-2xl overflow-x-auto border border-red-500/30 shadow-sm">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-red-500/10 text-red-300 border-b border-red-500/20">
                <tr>
                  <th className="p-4 font-medium">Código</th>
                  <th className="p-4 font-medium">Producto</th>
                  <th className="p-4 font-medium">Fecha Venc.</th>
                  <th className="p-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {prodPorVencer.map(p => {
                  const expDate = new Date(p.fecha_vencimiento);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const diffTime = expDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 font-mono text-gray-400">{p.codigo}</td>
                      <td className="p-4 font-medium text-white">{p.nombre}</td>
                      <td className="p-4 font-bold text-red-400">{p.fecha_vencimiento}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${diffDays < 0 ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-400'}`}>
                          {diffDays < 0 ? 'VENCIDO' : `En ${diffDays} días`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
