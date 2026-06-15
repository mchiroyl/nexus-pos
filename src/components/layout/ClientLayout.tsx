'use client';

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { useGlobal } from "@/context/GlobalContext";
import { Loader2 } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, loadingAuth } = useGlobal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loadingAuth) {
      if (!usuario && pathname !== '/login') {
        router.push('/login');
      }
      if (usuario && pathname === '/login') {
        router.push('/');
      }
    }
  }, [usuario, pathname, mounted, loadingAuth, router]);

  // Evitar renderizado con parpadeos mientras se carga el auth
  if (!mounted || loadingAuth) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-950 text-emerald-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-gray-400 font-medium">Cargando sistema...</p>
      </div>
    );
  }

  // Si estamos en login, solo renderizamos el children (que es la pantalla de login) sin sidebars
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Si no hay usuario y no estamos en login, mostramos pantalla vacía para no revelar UI
  if (!usuario) {
    return null;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 md:pl-64 min-h-screen flex flex-col w-full">
        <Topbar />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </>
  );
}
