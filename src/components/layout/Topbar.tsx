'use client';

import { useState, useEffect, useRef } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { Search, Bell, Settings, ShieldAlert, LogOut, User, Menu, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Topbar() {
  const { usuario, logout, mobileMenuOpen, setMobileMenuOpen } = useGlobal();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cerrar dropdowns al hacer clic afuera
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Verificar stock mínimo
    const checkStock = async () => {
      try {
        const res = await fetch('/api/sheets?range=Productos!A:M');
        if (res.ok) {
          const json = await res.json();
          const items = (json.data || []).filter((p: any) => p.estado === 'Activo');
          
          const low = items.filter((p: any) => {
            const stock = parseFloat(p.stock || '0');
            const min = parseFloat(p.stock_minimo || '0');
            return stock <= min;
          });
          setLowStockItems(low);
          setLowStockCount(low.length);

          const expiring = items.filter((p: any) => {
            if (!p.fecha_vencimiento) return false;
            const expDate = new Date(p.fecha_vencimiento);
            const today = new Date();
            today.setHours(0,0,0,0);
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Guardamos la cantidad de días para renderizarla
            p.diffDays = diffDays;
            return diffDays <= 30;
          });
          setExpiringItems(expiring);
          setExpiringCount(expiring.length);
        }
      } catch (error) {
        console.error("Error al cargar notificaciones:", error);
      }
    };
    checkStock();
  }, []);

  if (!usuario) return null;

  const hasAuditoriaPerm = usuario.username === 'admin' || usuario.permisos.includes('ver-auditoria');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 lg:px-8 z-40 sticky top-0">
      
      {/* Lado Izquierdo */}
      <div className="flex items-center flex-1 gap-2">
        {/* Hamburger Menu (Móvil) */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Buscador Global (Escritorio) */}
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..."
            className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Herramientas (Lado Derecho) */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* Notificaciones */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Bell size={20} />
            {(lowStockCount > 0 || expiringCount > 0) && (
              <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900"></span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3 border-b border-gray-800 bg-gray-950/50">
                <h3 className="text-white font-medium text-sm">Notificaciones</h3>
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {(lowStockCount === 0 && expiringCount === 0) ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Sin notificaciones nuevas
                  </div>
                ) : (
                  <div className="p-2 flex flex-col gap-1">
                    {/* Alertas de Vencimiento */}
                    {expiringItems.map((item, idx) => (
                      <Link href="/productos" key={`exp-${idx}`} onClick={() => setNotifOpen(false)} className="block p-3 hover:bg-gray-800 rounded-lg transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.diffDays < 0 ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-400'}`}>
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-white text-sm leading-tight">Caducidad: {item.nombre}</p>
                            <p className={`text-xs mt-1 ${item.diffDays < 0 ? 'text-red-400' : 'text-orange-400'}`}>
                              {item.diffDays < 0 ? 'Vencido' : `Vence en ${item.diffDays} días`} ({item.fecha_vencimiento})
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}

                    {/* Alertas de Stock */}
                    {lowStockItems.map((item, idx) => (
                      <Link href="/productos" key={`stk-${idx}`} onClick={() => setNotifOpen(false)} className="block p-3 hover:bg-gray-800 rounded-lg transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                            <Bell size={16} />
                          </div>
                          <div>
                            <p className="text-white text-sm leading-tight">Stock bajo: {item.nombre}</p>
                            <p className="text-red-400 text-xs mt-1">Stock actual: {item.stock} (Mínimo: {item.stock_minimo})</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-800 hidden md:block"></div>

        {/* Perfil de Usuario */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1 pr-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
              {usuario.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-white leading-tight">{usuario.username}</p>
              <p className="text-xs text-gray-500 capitalize">{usuario.rol_nombre}</p>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-gray-800 md:hidden">
                <p className="text-sm font-medium text-white">{usuario.username}</p>
                <p className="text-xs text-gray-500 capitalize">{usuario.rol_nombre}</p>
              </div>
              
              <div className="p-2">
                <Link 
                  href="/perfil" 
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Settings size={16} /> Configurar perfil
                </Link>
              </div>
              
              <div className="p-2 border-t border-gray-800">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
