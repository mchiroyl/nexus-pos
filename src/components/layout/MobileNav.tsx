'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Menu } from 'lucide-react';

import { useGlobal } from '@/context/GlobalContext';

const mobileNavItems = [
  { name: 'Panel', href: '/', icon: LayoutDashboard, requiredPermission: 'ver-panel' },
  { name: 'Ventas', href: '/ventas', icon: ShoppingCart, requiredPermission: 'ver-ventas' },
  { name: 'Stock', href: '/inventario', icon: Package, requiredPermission: 'ver-inventario' },
  { name: 'Más', href: '/menu', icon: Menu, requiredPermission: '' }, // 'Más' siempre se muestra
];

export default function MobileNav() {
  const pathname = usePathname();
  const { usuario } = useGlobal();

  return (
    <nav className="print:hidden md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 z-50 pb-safe">
      <div className="flex justify-around items-center p-2">
        {mobileNavItems.map((item) => {
          // Si require permiso, validar
          if (item.requiredPermission) {
            const hasPermission = usuario?.permisos.includes(item.requiredPermission) 
              || (usuario?.permisos.length === 0 && usuario?.username === 'admin');
            if (!hasPermission) return null;
          }

          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center p-2 min-w-[64px] transition-colors ${
                isActive ? 'text-emerald-400' : 'text-gray-400 hover:text-emerald-300'
              }`}
            >
              <Icon size={24} className="mb-1" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
