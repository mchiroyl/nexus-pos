# Sistema de Punto de Venta (POS) - Next.js & Google Sheets 🛒

Este es un sistema de Punto de Venta (POS) moderno, rápido y seguro, construido con una arquitectura "Serverless" y utilizando **Google Sheets como Base de Datos**. Ha sido diseñado con una interfaz **Glassmorphism oscura** orientada a la experiencia de usuario (UX) tanto en escritorio como en dispositivos móviles.

---

## 🚀 Tecnologías Utilizadas

- **Frontend / Framework:** [Next.js](https://nextjs.org/) (React)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) (diseño responsivo y oscuro)
- **Base de Datos:** Google Sheets API (a través de la librería `googleapis`)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)

---

## 🏗️ Diagrama de Procesos y Arquitectura

```mermaid
graph TD
    %% Entidades de Usuario
    User[Usuario / Cajero / Admin]
    
    %% Frontera del Frontend (Next.js App)
    subgraph Frontend [Next.js Frontend App]
        UI[Interfaz Gráfica / Componentes]
        Context[Global Context API]
        UI -->|Interacción| Context
    end

    %% Frontera del Backend (Next.js API Routes)
    subgraph Backend [Next.js API Routes]
        API["/api/sheets"]
        Auth[Google Auth Client]
        API -->|Firma peticiones| Auth
    end

    %% Base de Datos
    subgraph Database [Google Cloud & Sheets]
        GCP[Google Cloud IAM]
        Sheets[(Google Sheets)]
    end

    %% Flujo de datos
    User -->|Inicia sesión, Vende, Cierra turno| UI
    Context -->|HTTP GET/POST/PUT/DELETE| API
    Auth -->|Autenticación por Service Account| GCP
    API -->|Google Sheets API| Sheets
```

---

## ⚙️ Variables de Entorno Requeridas (`.env.local`)

Para que el sistema se comunique con tu base de datos en Google Sheets, necesitas crear un archivo llamado **`.env.local`** en la raíz del proyecto (`pos-frontend/.env.local`). 

Debe contener exactamente estas 3 variables:

```env
# El ID largo que aparece en la URL de tu Google Sheet
# Ejemplo: https://docs.google.com/spreadsheets/d/AQUI_VA_EL_ID/edit
GOOGLE_SPREADSHEET_ID="tu_id_de_google_sheets_aqui"

# El correo de la "Service Account" (Cuenta de Servicio) de Google Cloud
# Debe tener permisos de EDITOR en el Google Sheet
GOOGLE_CLIENT_EMAIL="tu-cuenta@tu-proyecto.iam.gserviceaccount.com"

# La clave privada de la Service Account (con todo y los bloques BEGIN y END)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n"
```

> [!WARNING]
> Nunca compartas tu `.env.local` ni subas tu `GOOGLE_PRIVATE_KEY` a repositorios públicos como GitHub. Este archivo ya está protegido en el `.gitignore`.

---

## 📖 Manual de Instalación Técnica

1. **Requisitos Previos:**
   - Instalar [Node.js](https://nodejs.org/) (versión 18 o superior).
   - Crear un Proyecto en Google Cloud Console.
   - Habilitar la **Google Sheets API**.
   - Crear una *Service Account*, generar una clave JSON, y darle acceso de Editor a tu hoja de cálculo.

2. **Clonar e Instalar:**
   ```bash
   git clone <tu-repositorio>
   cd Punto-de-Venta-main/pos-frontend
   npm install
   ```

3. **Configurar el Entorno:**
   - Crea el archivo `.env.local` con las credenciales (explicado arriba).

4. **Levantar el Servidor de Desarrollo:**
   ```bash
   npm run dev
   ```
   - Abre `http://localhost:3000` en tu navegador.

5. **Estructura de Carpetas:**
   - `/src/app`: Contiene todas las páginas (rutas) de la aplicación.
   - `/src/app/api/sheets`: El "Backend" que se conecta a Google Sheets.
   - `/src/components`: Componentes reutilizables (Modales, Topbar, Menú Lateral).
   - `/src/context`: Almacena el estado global de la sesión del usuario.

---

## 📘 Manual de Usuario

El sistema está dividido en módulos accesibles según el rol del usuario (Admin, Supervisor, Cajero, etc).

### 1. Inicio de Sesión
- Al ingresar a la URL, te pedirá tus credenciales. 
- Ingresa el usuario y contraseña que estén registrados en la pestaña `Usuarios` de tu Excel.

### 2. Apertura y Cierre de Caja (`/turno`)
- Antes de poder vender, el cajero **DEBE** aperturar una caja registrando su "Fondo Inicial" (el dinero con el que empieza el día).
- Al finalizar el día, debe "Cerrar Turno", ingresando cuánto dinero hay físicamente en la caja para que el sistema calcule si hay descuadres (sobrantes o faltantes).

### 3. Panel de Control (Dashboard)
- Visible para administradores. Muestra gráficos de ventas de los últimos 7 días.
- Tiene alertas automáticas para:
  - **Stock Crítico:** Productos que llegaron a su límite mínimo.
  - **Caducidades:** Productos que vencen en los próximos 30 días o ya están vencidos.

### 4. Módulo de Ventas (`/ventas`)
- Aquí es donde opera el cajero. Puede buscar productos por código o nombre, o seleccionarlos de la lista.
- El sistema advertirá si el producto que intentan vender ya está caducado.
- Al procesar la venta, se descontará automáticamente del Inventario y se registrará en el Kardex.

### 5. Gestión de Caducidades (Vencimientos)
- Al crear o editar un producto, puedes ingresarle una **Fecha de Vencimiento** (opcional).
- Si no tiene fecha, el sistema asumirá que el producto no caduca.
- El sistema te enviará notificaciones mediante la campanita 🔔 en la esquina superior derecha cuando un producto necesite tu atención.

### 6. Auditoría (`/auditoria`)
- Cualquier acción sensible (iniciar sesión, crear productos, hacer ventas, editar precios, hacer ajustes por merma) queda grabada de por vida en la pestaña Auditoría con la fecha, hora y el nombre del empleado que lo hizo.

### 7. Restablecimiento (Factory Reset)
- Accesible desde "Configuración de Empresa" por el **admin**.
- Permite limpiar todas las tablas transaccionales (Ventas, Kardex, Turnos, Cajas, Auditoría) para empezar un negocio desde cero, sin borrar los usuarios ni los roles.

---

## 👨‍💻 Créditos y Soporte

**Desarrollado y Diseñado por:** Ingeniero Marvin Chiroy Lopreto
Para reportes de fallos, vulnerabilidades de seguridad, o soporte técnico, por favor contactar a:
📧 **mchiroyl.dev@gmail.com**

> Desarrollado con ♥ para optimizar la gestión comercial.
