# Instrucciones de Despliegue - Dashboard SIAPOAS

Este proyecto consta de dos partes: **Cliente (Frontend)** y **Servidor (Backend)**.

## Requisitos Previos
1. **Node.js**: version 18 o superior.
2. **SQL Server**: la base `SIAPOAS` debe estar restaurada y accesible.
3. **Terminal**: PowerShell o CMD.

## Paso 1: Configuracion de Base de Datos
1. Crear `server/.env` a partir de `server/.env.example`.
2. Ajustar credenciales:
   ```env
   DB_USER=sa
   DB_PASSWORD=tu_password_real
   DB_SERVER=localhost
   DB_DATABASE=SIAPOAS
   PORT=3000
   ```

## Paso 2: Instalacion y Ejecucion del Servidor (Backend)
1. Abrir terminal en `server`:
   ```powershell
   cd server
   ```
2. Instalar dependencias:
   ```powershell
   npm install
   ```
3. Iniciar servidor:
   ```powershell
   npm run dev
   ```
4. Verificar:
   - API: `http://localhost:3000`
   - Health: `http://localhost:3000/api/health`

## Paso 3: Instalacion y Ejecucion del Cliente (Frontend)
1. Abrir otra terminal en `client`:
   ```powershell
   cd client
   ```
2. Instalar dependencias:
   ```powershell
   npm install
   ```
3. Iniciar app:
   ```powershell
   npm run dev
   ```
4. Abrir navegador en `http://localhost:5173`.

## Solucion de Problemas
- **Error de conexion a BD**: validar servicio SQL Server, usuario/password del `.env` y TCP/IP habilitado.
- **Puerto ocupado**: si el puerto 3000 esta en uso, cambiar `PORT` en `server/.env`.

## Identidad visual
- Colores: `client/tailwind.config.js`.
- Fuentes: Montserrat y Cairo (Google Fonts).
- Logo: en el sidebar del cliente.
