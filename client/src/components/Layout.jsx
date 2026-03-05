import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, CheckSquare, Menu, X, Bell, User, Layers, Calendar, FileCheck, Users, BarChart3, Settings, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const { user, permissions, logout } = useAuth();

    // Verifica si el usuario tiene permiso 'ver' en un módulo
    const canView = (moduleKey) => {
        if (!moduleKey) return true; // sin restricción (ej. Dashboard)
        const modulPerms = permissions?.[moduleKey] || [];
        return modulPerms.includes('ver');
    };

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, moduleKey: 'dashboard' },
        { name: 'Planes De Mejoramiento', href: '/hallazgos', icon: ListTodo, moduleKey: 'hallazgos' },
        { name: 'Acciones', href: '/acciones', icon: CheckSquare, moduleKey: 'acciones' },
        { name: 'Calendario', href: '/acciones/calendario', icon: Calendar, moduleKey: 'acciones' },
        { name: 'Novedades', href: '/modulos/novedades', icon: FileCheck, moduleKey: 'novedades' },
        { name: 'Usuarios', href: '/modulos/usuarios', icon: Users, moduleKey: 'usuarios' },
        { name: 'Reportes', href: '/modulos/reportes', icon: BarChart3, moduleKey: 'reportes' },
        { name: 'Configuración', href: '/modulos/configuracion', icon: Settings, moduleKey: 'config' },
        { name: 'Permisos', href: '/modulos/permisos', icon: ShieldCheck, adminOnly: true },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">

            {/* SIDEBAR */}
            <aside
                className={
                    clsx(
                        "bg-white border-r-4 border-[#359946] transition-all duration-300 flex flex-col fixed md:relative z-20 h-full shadow-md",
                        isSidebarOpen ? "w-80" : "w-24"
                    )
                }
            >

                {/* HEADER INSTITUCIONAL */}

                < div className="bg-white px-8 py-6 flex items-center justify-between border-b border-gray-200" >

                    {
                        isSidebarOpen ? (
                            <div className="flex items-center flex-1" >


                                <img
                                    src="/logo.png"
                                    alt="Consejo Superior de la Judicatura"
                                    className="h-16 w-auto object-contain"
                                />

                            </div >
                        ) : (
                            <div className="flex justify-center w-full">
                                <img
                                    src="/logo.png"
                                    alt="Consejo Superior de la Judicatura"
                                    className="h-12 w-auto object-contain"
                                />
                            </div>
                        )}

                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="ml-4 text-[#1E3A6B] hover:opacity-70 transition"
                    >
                        {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>

                </div >

                {/* NAVEGACIÓN */}
                < nav className="flex-1 p-6 space-y-2" >

                    {
                        navigation.map((item) => {
                            const Icon = item.icon;
                            // Ocultar ítems de solo administrador si el usuario no lo es
                            if (item.adminOnly && user?.rol !== 'Administrador') return null;
                            // Ocultar ítems si el usuario no tiene permiso 'ver' en ese módulo
                            if (!canView(item.moduleKey)) return null;

                            const isActive = location.pathname === item.href ||
                                (item.href !== '/' && location.pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={clsx(
                                        "flex items-center gap-4 px-4 py-3 rounded-lg font-montserrat transition",
                                        isActive
                                            ? "bg-[#359946] text-white"
                                            : "text-gray-700 hover:bg-[#359946]/10 hover:text-[#359946]"
                                    )}
                                >
                                    <Icon size={22} />
                                    {isSidebarOpen && (
                                        <span className="font-semibold">
                                            {item.name}
                                        </span>
                                    )}
                                </Link>
                            );
                        })
                    }

                </nav >

                {/* USUARIO */}
                < div className="p-6 border-t border-gray-200" >
                    {
                        isSidebarOpen ? (
                            <div className="flex items-center justify-between" >
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-full bg-[#359946] text-white flex items-center justify-center">
                                        <User size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-sm font-bold text-[#1E3A6B] font-montserrat truncate w-32" title={user?.nombre || 'Usuario Local'}>
                                            {user?.nombre || 'Usuario Local'}
                                        </div>
                                        <div className="text-xs text-gray-500 font-cairo truncate" title={user?.rol || 'Asignado en BD'}>
                                            {user?.rol || 'Usuario del Sistema'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={logout}
                                    title="Cerrar Sesión"
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <div className="w-11 h-11 rounded-full bg-[#359946] text-white flex items-center justify-center">
                                    <User size={20} />
                                </div>
                            </div>
                        )}
                </div >
            </aside >

            {/* CONTENIDO */}
            < div className="flex-1 flex flex-col" >

                {/* HEADER SUPERIOR */}
                < header className="h-20 bg-white border-b-4 border-[#359946] flex items-center justify-between px-10" >

                    <div>
                        <h1 className="text-2xl font-black text-[#1E3A6B] font-montserrat">
                            {navigation.find((n) => location.pathname === n.href || (n.href !== '/' && location.pathname.startsWith(n.href)))?.name || 'Dashboard'}
                        </h1>
                        <p className="text-xs text-gray-500 font-cairo">
                            Consejo Superior de la Judicatura
                        </p>
                    </div>

                    <div className="flex items-center gap-6">

                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-xs font-bold text-[#359946] font-montserrat">
                                Vigencia {new Date().getFullYear()}
                            </span>
                            <span className="text-[10px] text-gray-500 font-cairo">
                                {new Date().toLocaleDateString('es-CO')}
                            </span>
                        </div>

                        <NotificationCenter />

                    </div>
                </header >

                <main className="flex-1 overflow-auto p-10 bg-gray-50">
                    {children}
                </main>

            </div >
        </div >
    );
};

export default Layout;
