'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface EmpresaData {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  moneda: string;
}

export interface UsuarioSesion {
  id: string;
  username: string;
  empleado_id: string;
  empleado_nombre: string;
  rol_id: string;
  rol_nombre: string;
  permisos: string[];
}

export interface Turno {
  rowNumber: number;
  id: string;
  caja_id: string;
  usuario_id: string;
  fecha_apertura: string;
  monto_apertura: string;
  estado: string;
}

interface GlobalContextType {
  empresa: EmpresaData;
  loading: boolean;
  refreshEmpresa: () => void;
  usuario: UsuarioSesion | null;
  setUsuario: (user: UsuarioSesion | null) => void;
  loadingAuth: boolean;
  logout: () => void;
  turnoActivo: Turno | null;
  refreshTurno: () => Promise<void>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const defaultEmpresa: EmpresaData = {
  id: '1',
  nombre: 'Mi Empresa',
  direccion: 'Ciudad',
  telefono: '00000000',
  moneda: 'Q' // Moneda por defecto
};

const GlobalContext = createContext<GlobalContextType>({
  empresa: defaultEmpresa,
  loading: true,
  refreshEmpresa: () => {},
  usuario: null,
  setUsuario: () => {},
  loadingAuth: true,
  logout: () => {},
  turnoActivo: null,
  refreshTurno: async () => {},
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {}
});

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const [empresa, setEmpresa] = useState<EmpresaData>(defaultEmpresa);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchEmpresa = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets?range=Empresa!A:E');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          // Asumiendo que la fila 1 (después de headers) tiene los datos de la empresa
          const data = json.data[0];
          setEmpresa({
            id: data.id || '1',
            nombre: data.nombre || defaultEmpresa.nombre,
            direccion: data.direccion || defaultEmpresa.direccion,
            telefono: data.telefono || defaultEmpresa.telefono,
            moneda: data.moneda || defaultEmpresa.moneda
          });
        }
      }
    } catch (error) {
      console.error('Error fetching empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTurnoActivo = async (userId: string) => {
    try {
      const res = await fetch('/api/sheets?range=Turnos!A:I');
      if (res.ok) {
        const json = await res.json();
        const turnos = json.data || [];
        // Buscar un turno Abierto para el usuario actual
        const activeIndex = turnos.findIndex((t: any) => t.usuario_id === userId && t.estado === 'Abierto');
        if (activeIndex !== -1) {
          setTurnoActivo({ ...turnos[activeIndex], rowNumber: activeIndex + 2 });
        } else {
          setTurnoActivo(null);
        }
      }
    } catch (error) {
      console.error('Error fetching turno:', error);
    }
  };

  useEffect(() => {
    // Verificar si hay sesión activa en localStorage
    const storedSession = localStorage.getItem('pos_session');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setUsuario(parsed);
        fetchTurnoActivo(parsed.id);
      } catch (e) {
        console.error("Error parseando sesión", e);
      }
    }
    setLoadingAuth(false);
    fetchEmpresa();
  }, []);

  const refreshTurno = async () => {
    if (usuario) {
      await fetchTurnoActivo(usuario.id);
    }
  };

  const logout = () => {
    localStorage.removeItem('pos_session');
    setUsuario(null);
    setTurnoActivo(null);
  };

  return (
    <GlobalContext.Provider value={{ 
      empresa, loading, refreshEmpresa: fetchEmpresa, 
      usuario, setUsuario, loadingAuth, logout,
      turnoActivo, refreshTurno,
      mobileMenuOpen, setMobileMenuOpen
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => useContext(GlobalContext);
