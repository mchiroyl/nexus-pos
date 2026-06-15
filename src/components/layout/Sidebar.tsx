'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Building2,
  Box, 
  Tags, 
  Store,
  UserCog,
  Briefcase,
  LogOut,
  Wallet,
  ShieldAlert,
  ShoppingBag,
  PackageOpen,
  Archive,
  AlertTriangle,
  X
} from 'lucide-react';
import { useGlobal } from '@/context/GlobalContext';
import { useEffect } from 'react';

const navGroups = [
  {
    title: 'INICIO',
    items: [
      { name: 'Panel', href: '/', icon: LayoutDashboard, requiredPermission: 'ver-panel' },
      { name: 'Apertura / Cierre', href: '/turno', icon: Wallet, requiredPermission: 'aperturar-caja' },
    ]
  },
  {
    title: 'MÓDULOS',
    items: [
      { name: 'Ventas', href: '/ventas', icon: ShoppingCart, requiredPermission: 'ver-ventas' },
      { name: 'Compras', href: '/compras', icon: ShoppingBag, requiredPermission: 'ver-compras' },
      { name: 'Productos', href: '/productos', icon: Package, requiredPermission: 'ver-productos' },
      { name: 'Ajustes Inventario', href: '/inventario', icon: PackageOpen, requiredPermission: 'ver-inventario' },
      { name: 'Kardex', href: '/kardex', icon: Archive, requiredPermission: 'ver-kardex' },
      { name: 'Categorías', href: '/categorias', icon: Tags, requiredPermission: 'ver-categorias' },
      { name: 'Marcas', href: '/marcas', icon: Tags, requiredPermission: 'ver-marcas' },
      { name: 'Presentaciones', href: '/presentaciones', icon: Box, requiredPermission: 'ver-presentaciones' },
      { name: 'Clientes', href: '/clientes', icon: Users, requiredPermission: 'ver-clientes' },
      { name: 'Proveedores', href: '/proveedores', icon: Users, requiredPermission: 'ver-proveedores' },
      { name: 'Cajas', href: '/cajas', icon: Store, requiredPermission: 'ver-cajas' },
    ]
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      { name: 'Empresa', href: '/empresa', icon: Building2, requiredPermission: 'ver-empresa' },
      { name: 'Empleados', href: '/empleados', icon: Briefcase, requiredPermission: 'ver-empleados' },
      { name: 'Usuarios', href: '/usuarios', icon: UserCog, requiredPermission: 'ver-usuarios' },
      { name: 'Roles', href: '/roles', icon: UserCog, requiredPermission: 'ver-roles' },
      { name: 'Auditoría', href: '/auditoria', icon: ShieldAlert, requiredPermission: 'ver-auditoria' },
      { name: 'Restablecer', href: '/reset', icon: AlertTriangle, requiredPermission: 'admin-only' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { empresa, usuario, mobileMenuOpen, setMobileMenuOpen } = useGlobal();

  if (!usuario) return null;

  // Cerrar sidebar al cambiar de ruta en móvil
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  return (
    <>
      {/* Overlay Oscuro para Móvil */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 bg-gray-950 border-r border-gray-800 flex-col z-50 transition-transform duration-300 md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } flex`}>
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800 shrink-0">
          <h1 className="text-xl font-bold text-emerald-500 tracking-tight">{empresa?.nombre || 'Tienda Iliana'}</h1>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
      
        <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar py-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-bold text-gray-500 mb-3 px-4">{group.title}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  // Verificar si tiene permiso
                  const hasPermission = usuario?.username === 'admin'
                    || usuario?.permisos.includes(item.requiredPermission);

                  if (!hasPermission) return null;

                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                        isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
