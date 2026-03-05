// client/src/pages/DashboardHome.jsx - VERSIÓN FINAL COMPLETA

import React, { useEffect, useState } from 'react';
import {
    fetchKPIs,
    fetchGraficas,
    fetchMetricasUsuarios,
    fetchRolesDisponibles,
    fetchEstadisticasPorRol,
    fetchAnalisisUsuarios
} from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    AlertCircle, CheckCircle2, ClipboardList, TrendingUp, Clock, AlertTriangle,
    Calendar, Target, Package, Activity, ArrowUpCircle, ArrowDownCircle,
    ChevronLeft, ChevronRight, Users, Building2, BarChart3,
    Zap, Award, Timer, UserCheck, Star, Trophy, Search, Filter, RefreshCw
} from 'lucide-react';

// KPI Card Mejorado
const KPICard = ({ title, value, subtitle, icon: Icon, trend, variant = 'default' }) => {
    const variants = {
        default: 'from-csj-azul to-blue-800',
        success: 'from-csj-verde to-green-600',
        info: 'from-csj-azul to-blue-800',
        warning: 'from-csj-amarillo to-yellow-500',
        danger: 'from-colombia-rojo to-red-700',
        purple: 'from-purple-500 to-purple-700',
    };

    const borderColors = {
        default: 'border-csj-azul',
        success: 'border-csj-verde',
        info: 'border-csj-azul',
        warning: 'border-csj-amarillo',
        danger: 'border-colombia-rojo',
        purple: 'border-purple-500',
    };

    return (
        <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${borderColors[variant]} hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-cairo font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                        {title}
                    </p>
                    <h3 className="text-4xl font-black text-gray-800 font-montserrat mt-2 mb-2">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="text-sm text-gray-600 font-cairo">
                            {subtitle}
                        </p>
                    )}
                    {trend !== undefined && trend !== null && (
                        <div className={`flex items-center gap-1 mt-3 text-xs font-bold font-cairo ${trend >= 0 ? 'text-csj-verde' : 'text-colombia-rojo'
                            }`}>
                            {trend >= 0 ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                            <span>{Math.abs(trend)}% vs mes anterior</span>
                        </div>
                    )}
                </div>
                <div className={`p-4 rounded-xl bg-gradient-to-br ${variants[variant]} shadow-lg transform transition-transform hover:scale-110`}>
                    <Icon size={32} className="text-white" />
                </div>
            </div>
        </div>
    );
};

// Mini Stat Card
const MiniStatCard = ({ label, value, icon: Icon, color = 'csj-azul', percentage }) => (
    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        <div
            className={`p-3 rounded-lg ${{
                'csj-azul': 'bg-csj-azul/10',
                'csj-verde': 'bg-csj-verde/10',
                'csj-amarillo': 'bg-csj-amarillo/10',
                'colombia-rojo': 'bg-colombia-rojo/10',
            }[color] || 'bg-csj-azul/10'
                }`}
        >
            <Icon
                size={20}
                className={
                    {
                        'csj-azul': 'text-csj-azul',
                        'csj-verde': 'text-csj-verde',
                        'csj-amarillo': 'text-csj-amarillo',
                        'colombia-rojo': 'text-colombia-rojo',
                    }[color] || 'text-csj-azul'
                }
            />
        </div>
        <div className="flex-1">
            <p className="text-xs text-gray-500 font-cairo font-medium uppercase">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-xl font-black text-gray-800 font-montserrat">{value}</p>
                {percentage !== undefined && (
                    <span className="text-xs font-bold text-gray-500">({percentage}%)</span>
                )}
            </div>
        </div>
    </div>
);

// Tooltip personalizado
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-csj-azul">
                <p className="font-bold text-csj-azul font-montserrat mb-2">{label}</p>
                {payload.map((entry) => (
                    <p key={entry.name || Math.random().toString()} className="text-sm font-cairo" style={{ color: entry.color }}>
                        {entry.name}: <span className="font-bold">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Botón de navegación
const PageButton = ({ active, children, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg font-cairo font-bold transition-all ${active
            ? 'bg-csj-azul text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
    >
        {children}
    </button>
);

const DashboardHome = () => {
    // Solo Admin y Control Interno pueden ver las páginas 4 (Usuarios) y 5 (Análisis)
    const { canView: canSeeUserPages } = usePermissions('usuarios');

    const [currentPage, setCurrentPage] = useState(1);
    const [kpis, setKpis] = useState({
        total_hallazgos: 0,
        hallazgos_sin_gestion: 0,
        total_acciones: 0,
        acciones_sin_gestion: 0,
        acciones_cerradas: 0,
        avance_global: 0,
        acciones_vencidas: 0,
        acciones_proximas: 0,
        acciones_en_tiempo: 0,
        entregables_totales: 0,
        entregables_completados: 0,
        procesos_afectados: 0,
        dependencias_involucradas: 0,
        promedio_cumplimiento: 0,
        tiempo_promedio_cierre: 0,
    });

    const [graficas, setGraficas] = useState({
        procesos: [],
        estados: [],
        top_dependencias: [],
        eficiencia_mensual: []
    });

    // Paginación para Gráfica de Procesos (Página 2)
    const [page2Page, setPage2Page] = useState(1);

    // Estados para Página 4 - Usuarios
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [estadisticasRoles, setEstadisticasRoles] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingUsuarios, setLoadingUsuarios] = useState(true);
    const [loadingRoles, setLoadingRoles] = useState(true);

    // Paginación y filtros para Página 4
    const [currentSubPage, setCurrentSubPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsuarios, setTotalUsuarios] = useState(0);

    const [selectedRol, setSelectedRol] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Estados para Página 5 - Análisis de Usuarios
    const [analisisUsuarios, setAnalisisUsuarios] = useState([]);
    const [loadingAnalisis, setLoadingAnalisis] = useState(true);
    const [analisisRolFilter, setAnalisisRolFilter] = useState('');
    const [analisisSearchInput, setAnalisisSearchInput] = useState('');
    const [analisisSearch, setAnalisisSearch] = useState('');

    // Filtros de Fecha (Default: Hoy)
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    const COLORS = {
        'Cerrada': '#359946',
        'En Tiempo': '#004182',
        'Próxima': '#FFCF61',
        'Vencida': '#D7281E',
    };

    // Cargar KPIs y gráficas
    useEffect(() => {
        const loadData = async () => {
            try {
                const [kpiData, graficasData] = await Promise.all([
                    fetchKPIs({ startDate, endDate }),
                    fetchGraficas({ startDate, endDate })
                ]);

                if (kpiData) setKpis(kpiData);
                if (graficasData) {
                    setGraficas(graficasData);
                    setPage2Page(1); // Reset page on data load
                }
            } catch (error) {
                console.error("Error loading dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [startDate, endDate]);

    // Cargar roles disponibles
    useEffect(() => {
        const loadRoles = async () => {
            try {
                const [rolesData, estadisticasData] = await Promise.all([
                    fetchRolesDisponibles(),
                    fetchEstadisticasPorRol({ startDate, endDate })
                ]);
                setRoles(rolesData || []);
                setEstadisticasRoles(estadisticasData || []);
            } catch (error) {
                console.error('Error loading roles:', error);
            } finally {
                setLoadingRoles(false);
            }
        };
        loadRoles();
    }, [startDate, endDate]);

    // Cargar usuarios con filtros y paginación
    useEffect(() => {
        const loadUsuarios = async () => {
            setLoadingUsuarios(true);
            try {
                const response = await fetchMetricasUsuarios({
                    page: currentSubPage,
                    limit: itemsPerPage,
                    rol: selectedRol || undefined,
                    search: searchTerm,
                    startDate,
                    endDate
                });

                setUsuarios(response.data || []);
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalUsuarios(response.pagination?.total || 0);
            } catch (error) {
                console.error('Error loading usuarios:', error);
            } finally {
                setLoadingUsuarios(false);
            }
        };
        loadUsuarios();
    }, [currentSubPage, itemsPerPage, selectedRol, searchTerm, startDate, endDate]);

    // Cargar análisis detallado de usuarios (Página 5)
    useEffect(() => {
        const loadAnalisis = async () => {
            setLoadingAnalisis(true);
            try {
                const data = await fetchAnalisisUsuarios({
                    startDate,
                    endDate,
                    rol: analisisRolFilter,
                    search: analisisSearch
                });
                setAnalisisUsuarios(data || []);
            } catch (error) {
                console.error('Error loading analisis usuarios:', error);
            } finally {
                setLoadingAnalisis(false);
            }
        };
        loadAnalisis();
    }, [startDate, endDate, analisisRolFilter, analisisSearch]);

    const handleSearch = () => {
        setSearchTerm(searchInput);
        setCurrentSubPage(1);
    };

    const handleRolChange = (e) => {
        const newRol = e.target.value;
        setSelectedRol(newRol);
        setCurrentSubPage(1);
    };

    const handleResetFilters = () => {
        setSelectedRol('');
        setSearchTerm('');
        setSearchInput('');
        setCurrentSubPage(1);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-20 w-20 border-4 border-csj-azul border-t-transparent mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600 font-cairo font-semibold">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    const porcentajeCompletado = kpis.total_acciones > 0
        ? Math.round((kpis.acciones_cerradas / kpis.total_acciones) * 100)
        : 0;

    const porcentajeEntregables = kpis.entregables_totales > 0
        ? Math.round((kpis.entregables_completados / kpis.entregables_totales) * 100)
        : 0;

    const porcentajeVencidas = kpis.total_acciones > 0
        ? Math.round((kpis.acciones_vencidas / kpis.total_acciones) * 100)
        : 0;

    const porcentajeProximas = kpis.total_acciones > 0
        ? Math.round((kpis.acciones_proximas / kpis.total_acciones) * 100)
        : 0;

    // PÁGINA 1: Resumen Ejecutivo
    const renderPage1 = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-csj-azul to-csj-verde p-6 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white font-montserrat mb-2">
                            Dashboard - Resumen Ejecutivo
                        </h1>
                        <p className="text-white/90 font-cairo">
                            Panel de seguimiento a los Planes de Mejoramiento
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                            <span className="text-white font-cairo text-sm font-semibold">Desde:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-white font-cairo font-bold border-none outline-none focus:ring-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                            <span className="text-white font-cairo text-sm font-semibold">Hasta:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-white font-cairo font-bold border-none outline-none focus:ring-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Hallazgos"
                    value={kpis.total_hallazgos}
                    subtitle={`${kpis.procesos_afectados || 0} procesos afectados`}
                    icon={AlertCircle}
                    variant="info"
                    trend={5}
                />
                <KPICard
                    title="Acciones Totales"
                    value={kpis.total_acciones}
                    subtitle="Registradas en el sistema"
                    icon={ClipboardList}
                    variant="default"
                    trend={8}
                />
                <KPICard
                    title="Acciones Cerradas"
                    value={kpis.acciones_cerradas}
                    subtitle={`${kpis.total_acciones - kpis.acciones_cerradas} activas`}
                    icon={CheckCircle2}
                    variant="success"
                    trend={12}
                />
                <KPICard
                    title="Avance Global"
                    value={`${kpis.avance_global}%`}
                    subtitle="Progreso general"
                    icon={TrendingUp}
                    variant="warning"
                    trend={-3}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniStatCard
                    label="Acciones Vencidas"
                    value={kpis.acciones_vencidas || 0}
                    icon={AlertTriangle}
                    color="colombia-rojo"
                    percentage={porcentajeVencidas}
                />
                <MiniStatCard
                    label="Próximas a Vencer"
                    value={kpis.acciones_proximas || 0}
                    icon={Clock}
                    color="csj-amarillo"
                    percentage={porcentajeProximas}
                />
                <MiniStatCard
                    label="En Tiempo"
                    value={kpis.acciones_en_tiempo || 0}
                    icon={CheckCircle2}
                    color="csj-verde"
                    percentage={100 - porcentajeVencidas - porcentajeProximas}
                />
            </div>


            {/* Fila de Métricas Sin Gestión */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MiniStatCard
                    label="Hallazgos Sin Planes de Acción"
                    value={kpis.hallazgos_sin_gestion || 0}
                    icon={AlertCircle}
                    color="colombia-rojo"
                />
                <MiniStatCard
                    label="Acciones Sin Ningún Avance"
                    value={kpis.acciones_sin_gestion || 0}
                    icon={AlertTriangle}
                    color="csj-amarillo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-csj-azul">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-csj-azul font-montserrat flex items-center gap-2">
                            <Activity size={20} />
                            Progreso de Acciones
                        </h3>
                        <span className="text-2xl font-black text-csj-verde font-montserrat">
                            {porcentajeCompletado}%
                        </span>
                    </div>
                    <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-csj-verde to-green-400 transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                            style={{ width: `${porcentajeCompletado}%` }}
                        >
                            <span className="text-white font-bold text-sm">
                                {kpis.acciones_cerradas} / {kpis.total_acciones}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500 font-cairo">
                        <span>0 acciones</span>
                        <span>{kpis.total_acciones} acciones</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-csj-azul">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-csj-azul font-montserrat flex items-center gap-2">
                            <Package size={20} />
                            Progreso de Entregables
                        </h3>
                        <span className="text-2xl font-black text-csj-azul font-montserrat">
                            {porcentajeEntregables}%
                        </span>
                    </div>
                    <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-csj-azul to-blue-400 transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                            style={{ width: `${porcentajeEntregables}%` }}
                        >
                            <span className="text-white font-bold text-sm">
                                {kpis.entregables_completados} / {kpis.entregables_totales}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500 font-cairo">
                        <span>0 entregables</span>
                        <span>{kpis.entregables_totales} entregables</span>
                    </div>
                </div>
            </div>
        </div >
    );

    // PÁGINA 2: Análisis por Procesos y Estados
    const renderPage2 = () => {
        const itemsPerPage = 15;
        const totalProcesosPages = Math.ceil((graficas.procesos?.length || 0) / itemsPerPage);
        const currentProcesos = (graficas.procesos || []).slice(
            (page2Page - 1) * itemsPerPage,
            page2Page * itemsPerPage
        );

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-r from-csj-azul to-blue-900 p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-white font-montserrat mb-2">
                                Análisis por Procesos y Estados
                            </h1>
                            <p className="text-white/90 font-cairo">
                                Distribución y desempeño por área
                            </p>
                        </div>
                        <BarChart3 size={48} className="text-white opacity-80" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-csj-azul hover:shadow-xl transition-shadow flex flex-col">
                        <h3 className="text-lg font-black text-csj-azul font-montserrat mb-4 flex items-center gap-2">
                            <Building2 size={20} className="text-csj-azul" />
                            Top 10 Dependencias con Más Acciones
                        </h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={graficas.top_dependencias || []} layout="vertical" margin={{ left: 150, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fill: '#6B7280', fontFamily: 'Cairo', fontSize: 12 }} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={140}
                                        tick={{ fontSize: 10, fill: '#374151', fontFamily: 'Cairo', fontWeight: 600 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="acciones"
                                        fill="#004182"
                                        radius={[0, 8, 8, 0]}
                                        barSize={24}
                                        label={{ position: 'right', fill: '#004182', fontWeight: 'bold', fontSize: 12 }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-csj-azul hover:shadow-xl transition-shadow">
                        <h3 className="text-lg font-black text-csj-azul font-montserrat mb-4 flex items-center gap-2">
                            <div className="w-1 h-6 bg-csj-azul rounded-full"></div>
                            Estado de Acciones
                        </h3>
                        <div className="h-80 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={graficas.estados}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={4}
                                        dataKey="value"
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                        labelLine={{ stroke: '#004182', strokeWidth: 2 }}
                                    >
                                        {graficas.estados && graficas.estados.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[entry.name] || '#004182'}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={50}
                                        wrapperStyle={{
                                            fontFamily: 'Cairo',
                                            fontSize: '13px',
                                            fontWeight: 'bold'
                                        }}
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-csj-azul hover:shadow-xl transition-shadow flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-csj-azul font-montserrat flex items-center gap-2 m-0">
                            <div className="w-1 h-6 bg-csj-azul rounded-full"></div>
                            Hallazgos por Proceso
                        </h3>
                        {totalProcesosPages > 1 && (
                            <div className="flex items-center gap-2 text-sm font-cairo">
                                <button
                                    onClick={() => setPage2Page(p => Math.max(1, p - 1))}
                                    disabled={page2Page === 1}
                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-csj-azul hover:text-white disabled:opacity-50 disabled:hover:bg-gray-100 disabled:hover:text-gray-400 text-gray-600 transition-colors shadow-sm"
                                    title="Página Anterior"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="font-bold text-gray-700 select-none px-2">
                                    {page2Page} / {totalProcesosPages}
                                </span>
                                <button
                                    onClick={() => setPage2Page(p => Math.min(totalProcesosPages, p + 1))}
                                    disabled={page2Page === totalProcesosPages}
                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-csj-azul hover:text-white disabled:opacity-50 disabled:hover:bg-gray-100 disabled:hover:text-gray-400 text-gray-600 transition-colors shadow-sm"
                                    title="Página Siguiente"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentProcesos} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" tick={{ fill: '#6B7280', fontFamily: 'Cairo', fontSize: 12 }} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={140}
                                    tick={{ fontSize: 11, fill: '#374151', fontFamily: 'Cairo', fontWeight: 600 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="hallazgos"
                                    fill="#004182"
                                    radius={[0, 8, 8, 0]}
                                    barSize={28}
                                    label={{ position: 'right', fill: '#004182', fontWeight: 'bold' }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    // PÁGINA 3: Tendencias y Eficiencia
    const renderPage3 = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-csj-azul to-blue-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white font-montserrat mb-2">
                            Tendencias y Eficiencia
                        </h1>
                        <p className="text-white/90 font-cairo">
                            Análisis temporal y desempeño
                        </p>
                    </div>
                    <TrendingUp size={48} className="text-white opacity-80" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-csj-amarillo">
                <h3 className="text-lg font-black text-csj-azul font-montserrat mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-csj-amarillo" />
                    Tendencia de Cierre Mensual
                </h3>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graficas.eficiencia_mensual || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAcciones" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#004182" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#004182" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCerradas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#359946" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#359946" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="mes"
                                tick={{ fill: '#6B7280', fontFamily: 'Cairo', fontSize: 12 }}
                            />
                            <YAxis tick={{ fill: '#6B7280', fontFamily: 'Cairo', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontFamily: 'Cairo', fontSize: '13px', fontWeight: 'bold' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="acciones"
                                stroke="#004182"
                                fillOpacity={1}
                                fill="url(#colorAcciones)"
                                name="Acciones Creadas"
                            />
                            <Area
                                type="monotone"
                                dataKey="cerradas"
                                stroke="#359946"
                                fillOpacity={1}
                                fill="url(#colorCerradas)"
                                name="Acciones Cerradas"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-csj-azul">
                    <h3 className="text-lg font-black text-csj-azul font-montserrat mb-6">
                        Métricas de Eficiencia
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-csj-verde/10 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Award size={24} className="text-csj-verde" />
                                <span className="font-cairo font-semibold">Tasa de Cumplimiento</span>
                            </div>
                            <span className="text-2xl font-black text-csj-verde font-montserrat">
                                {kpis.promedio_cumplimiento || 0}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-csj-azul/10 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Timer size={24} className="text-csj-azul" />
                                <span className="font-cairo font-semibold">Días Promedio Cierre</span>
                            </div>
                            <span className="text-2xl font-black text-csj-azul font-montserrat">
                                {kpis.tiempo_promedio_cierre || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-csj-amarillo/10 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Target size={24} className="text-csj-amarillo" />
                                <span className="font-cairo font-semibold">Eficiencia Entregables</span>
                            </div>
                            <span className="text-2xl font-black text-csj-amarillo font-montserrat">
                                {porcentajeEntregables}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-colombia-rojo/10 rounded-lg">
                            <div className="flex items-center gap-3">
                                <AlertTriangle size={24} className="text-colombia-rojo" />
                                <span className="font-cairo font-semibold">Tasa de Vencimiento</span>
                            </div>
                            <span className="text-2xl font-black text-colombia-rojo font-montserrat">
                                {porcentajeVencidas}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-csj-amarillo">
                    <h3 className="text-lg font-black text-csj-azul font-montserrat mb-6">
                        Indicadores Clave
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 border-l-4 border-csj-verde bg-gray-50 rounded">
                            <p className="text-xs text-gray-500 font-cairo mb-1">ACCIONES COMPLETADAS</p>
                            <p className="text-3xl font-black text-csj-verde font-montserrat">
                                {kpis.acciones_cerradas} <span className="text-lg text-gray-400">/ {kpis.total_acciones}</span>
                            </p>
                        </div>
                        <div className="p-4 border-l-4 border-csj-azul bg-gray-50 rounded">
                            <p className="text-xs text-gray-500 font-cairo mb-1">PROCESOS MONITOREADOS</p>
                            <p className="text-3xl font-black text-csj-azul font-montserrat">
                                {kpis.procesos_afectados || 0}
                            </p>
                        </div>
                        <div className="p-4 border-l-4 border-csj-verde bg-gray-50 rounded">
                            <p className="text-xs text-gray-500 font-cairo mb-1">DEPENDENCIAS ACTIVAS</p>
                            <p className="text-3xl font-black text-csj-verde font-montserrat">
                                {kpis.dependencias_involucradas || 0}
                            </p>
                        </div>
                        <div className="p-4 border-l-4 border-csj-amarillo bg-gray-50 rounded">
                            <p className="text-xs text-gray-500 font-cairo mb-1">AVANCE GLOBAL</p>
                            <p className="text-3xl font-black text-csj-amarillo font-montserrat">
                                {kpis.avance_global}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // PÁGINA 4: Métricas por Usuario CON FILTROS Y PAGINACIÓN
    const renderPage4 = () => {
        const topUsuarios = (!selectedRol && !searchTerm) ? usuarios.slice(0, 3) : [];

        return (
            <div className="space-y-6 animate-fadeIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-csj-azul to-blue-700 p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-white font-montserrat mb-2">
                                Métricas por Usuario y Rol
                            </h1>
                            <p className="text-white/90 font-cairo">
                                Desempeño individual filtrado por dependencia
                            </p>
                        </div>
                        <Users size={48} className="text-white opacity-80" />
                    </div>
                </div>

                {/* Estadísticas por Rol */}
                <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-csj-azul">
                    <h3 className="text-lg font-black text-csj-azul font-montserrat mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-csj-azul" />
                        Estadísticas por Rol/Dependencia
                    </h3>

                    {loadingRoles ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-csj-azul border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {estadisticasRoles.slice(0, 6).map((estadistica, index) => {
                                const totalAcciones =
                                    estadistica.total_evaluaciones +
                                    estadistica.total_observaciones +
                                    estadistica.total_replicas +
                                    estadistica.total_conclusiones;

                                return (
                                    <div
                                        key={estadistica.rol || index}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-csj-azul hover:shadow-lg transition-all cursor-pointer"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            setSelectedRol(estadistica.rol);
                                            setCurrentSubPage(1);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedRol(estadistica.rol);
                                                setCurrentSubPage(1);
                                            }
                                        }}
                                    >
                                        <h4 className="font-bold text-sm text-gray-700 font-cairo mb-3 truncate" title={estadistica.rol}>
                                            {estadistica.rol}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 font-cairo">Usuarios</p>
                                                <p className="text-2xl font-black text-csj-azul font-montserrat">
                                                    {estadistica.total_usuarios}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 font-cairo">Acciones</p>
                                                <p className="text-2xl font-black text-csj-verde font-montserrat">
                                                    {totalAcciones}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Filtros y Búsqueda */}
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-csj-azul">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label htmlFor="filtro-rol" className="block text-sm font-bold text-gray-700 font-cairo mb-2">
                                <Filter size={16} className="inline mr-2" />
                                Filtrar por Rol/Dependencia
                            </label>
                            <select
                                id="filtro-rol"
                                value={selectedRol}
                                onChange={handleRolChange}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg font-cairo focus:border-csj-azul focus:outline-none"
                            >
                                <option value="">Todos los roles</option>
                                {roles.map((rol) => (
                                    <option key={rol.id} value={rol.id}>
                                        {rol.nombre} ({rol.total_usuarios} usuarios)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1">
                            <label htmlFor="buscar-usuario" className="block text-sm font-bold text-gray-700 font-cairo mb-2">
                                <Search size={16} className="inline mr-2" />
                                Buscar Usuario
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="buscar-usuario"
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Nombre del usuario..."
                                    className="flex-1 p-3 border-2 border-gray-300 rounded-lg font-cairo focus:border-csj-azul focus:outline-none"
                                />
                                <button
                                    onClick={handleSearch}
                                    className="px-6 py-3 bg-csj-azul text-white rounded-lg font-cairo font-bold hover:bg-csj-azul/90 transition-colors"
                                >
                                    <Search size={20} />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleResetFilters}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-cairo font-bold hover:bg-gray-300 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw size={20} />
                            Limpiar
                        </button>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 font-cairo">
                        <span className="font-bold">Mostrando:</span>
                        <span>{totalUsuarios} usuarios encontrados</span>
                        {selectedRol && (
                            <span className="px-3 py-1 bg-csj-azul/10 text-csj-azul rounded-full font-semibold">
                                Rol: {selectedRol}
                            </span>
                        )}
                        {searchTerm && (
                            <span className="px-3 py-1 bg-csj-azul/10 text-csj-azul rounded-full font-semibold">
                                Búsqueda: "{searchTerm}"
                            </span>
                        )}
                    </div>
                </div>



                {/* Tabla de usuarios con paginación */}
                <div className="bg-white rounded-xl shadow-md border-t-4 border-csj-azul">
                    <div className="p-6">
                        <h3 className="text-lg font-black text-csj-azul font-montserrat mb-4 flex items-center gap-2">

                            {selectedRol ? `Usuarios del rol: ${selectedRol}` : 'Ranking de Usuarios'}
                        </h3>

                        {loadingUsuarios ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-csj-azul border-t-transparent"></div>
                            </div>
                        ) : usuarios.length === 0 ? (
                            <div className="text-center py-12">
                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-cairo">
                                    No se encontraron usuarios con los filtros aplicados
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                                            <tr>
                                                <th className="p-4 text-left text-xs font-bold text-gray-700 font-montserrat uppercase">#</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-700 font-montserrat uppercase">Usuario</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-700 font-montserrat uppercase">Rol</th>
                                                <th className="p-4 text-center text-xs font-bold text-gray-700 font-montserrat uppercase">Evaluaciones</th>
                                                <th className="p-4 text-center text-xs font-bold text-gray-700 font-montserrat uppercase">Observaciones</th>
                                                <th className="p-4 text-center text-xs font-bold text-gray-700 font-montserrat uppercase">Réplicas</th>
                                                <th className="p-4 text-center text-xs font-bold text-gray-700 font-montserrat uppercase">Conclusiones</th>
                                                <th className="p-4 text-center text-xs font-bold text-gray-700 font-montserrat uppercase">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {usuarios.map((usuario, index) => {
                                                const globalIndex = (currentSubPage - 1) * itemsPerPage + index + 1;
                                                const totalAcciones = usuario.total_acciones || 0;

                                                return (
                                                    <tr key={usuario.usuario_id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-4">
                                                            <span className="text-sm font-bold text-gray-500 font-montserrat">
                                                                #{globalIndex}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-csj-azul to-csj-verde flex items-center justify-center text-white font-bold">
                                                                    {usuario.nombre_usuario?.charAt(0) || 'U'}
                                                                </div>
                                                                <p className="font-bold text-gray-800 font-cairo">
                                                                    {usuario.nombre_usuario || 'Usuario desconocido'}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="text-sm text-gray-600 font-cairo">
                                                                {usuario.rol || 'Sin asignar'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-csj-verde/10 text-csj-verde font-black font-montserrat">
                                                                {usuario.total_evaluaciones}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-csj-azul/10 text-csj-azul font-black font-montserrat">
                                                                {usuario.total_observaciones}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-csj-amarillo/10 text-csj-amarillo font-black font-montserrat">
                                                                {usuario.total_replicas}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-colombia-rojo/10 text-colombia-rojo font-black font-montserrat">
                                                                {usuario.total_conclusiones}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="text-xl font-black text-gray-800 font-montserrat">
                                                                {totalAcciones}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Paginación */}
                                <div className="mt-6 flex items-center justify-between border-t pt-4">
                                    <div className="text-sm text-gray-600 font-cairo">
                                        Mostrando {((currentSubPage - 1) * itemsPerPage) + 1} a {Math.min(currentSubPage * itemsPerPage, totalUsuarios)} de {totalUsuarios} usuarios
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentSubPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentSubPage === 1}
                                            className={`px-4 py-2 rounded-lg font-cairo font-bold transition-all ${currentSubPage === 1
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-csj-azul text-white hover:bg-csj-azul/90'
                                                }`}
                                        >
                                            <ChevronLeft size={20} />
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentSubPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentSubPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentSubPage - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentSubPage(pageNum)}
                                                        className={`px-4 py-2 rounded-lg font-cairo font-bold transition-all ${currentSubPage === pageNum
                                                            ? 'bg-csj-azul text-white'
                                                            : 'bg-white text-gray-600 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => setCurrentSubPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentSubPage === totalPages}
                                            className={`px-4 py-2 rounded-lg font-cairo font-bold transition-all ${currentSubPage === totalPages
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-csj-azul text-white hover:bg-csj-azul/90'
                                                }`}
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    // PÁGINA 5: Análisis de Carga y Tiempos
    const renderPage5 = () => {
        // Calcular totales globales para determinar la vista
        const totalAsignadas = analisisUsuarios.reduce((s, u) => s + u.total_acciones, 0);
        const totalObservaciones = analisisUsuarios.reduce((s, u) => s + (u.total_observaciones || 0), 0);
        const totalConclusiones = analisisUsuarios.reduce((s, u) => s + (u.total_conclusiones || 0), 0);

        // Vista predominante
        const isControlInternoView = (totalObservaciones + totalConclusiones) > totalAsignadas;

        // Sorting y Data para Control Interno
        const topControlInterno = [...analisisUsuarios]
            .filter(u => (u.total_observaciones || 0) + (u.total_conclusiones || 0) > 0)
            .sort((a, b) => {
                const totalA = (a.total_observaciones || 0) + (a.total_conclusiones || 0);
                const totalB = (b.total_observaciones || 0) + (b.total_conclusiones || 0);
                return totalB - totalA;
            })
            .slice(0, 15);

        // Sorting y Data para Líderes
        const topLideres = [...analisisUsuarios]
            .filter(u => u.total_acciones > 0)
            .sort((a, b) => b.total_acciones - a.total_acciones)
            .slice(0, 15);

        // Top Tiempos Control Interno (obs y conc)
        const topDemoraObs = [...analisisUsuarios].filter(u => u.tiempo_promedio_observacion > 0).sort((a, b) => b.tiempo_promedio_observacion - a.tiempo_promedio_observacion).slice(0, 10);
        const topDemoraConc = [...analisisUsuarios].filter(u => u.tiempo_promedio_conclusion > 0).sort((a, b) => b.tiempo_promedio_conclusion - a.tiempo_promedio_conclusion).slice(0, 10);

        // Top Tiempos Líderes (cierre)
        const topDemoraCierre = [...analisisUsuarios].filter(u => u.tiempo_promedio_cierre > 0).sort((a, b) => b.tiempo_promedio_cierre - a.tiempo_promedio_cierre).slice(0, 10);

        const COLORS = {
            cerradas: '#359946',
            vencidas: '#D7281E',
            proximas: '#FFCF61',
            en_tiempo: '#004182',
            observaciones: '#FFD700',
            conclusiones: '#359946'
        };

        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-csj-azul via-blue-800 to-csj-azul p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <Users className="text-white" size={28} />
                            <div>
                                <h2 className="text-2xl font-cairo font-black text-white">
                                    {isControlInternoView ? 'Gestión de Seguimiento (Control Interno)' : 'Análisis de Carga (Líderes)'}
                                </h2>
                                <p className="text-white/70 text-sm font-cairo">
                                    {isControlInternoView ? 'Monitoreo de observaciones y conclusiones' : 'Distribución y cumplimiento de acciones asignadas'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                                <Filter size={16} className="text-white" />
                                <select
                                    value={analisisRolFilter}
                                    onChange={(e) => setAnalisisRolFilter(e.target.value)}
                                    className="bg-transparent text-white font-cairo text-sm border-none outline-none cursor-pointer [&>option]:text-gray-800"
                                >
                                    <option value="">Todos los roles</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                                <Search size={16} className="text-white" />
                                <input
                                    type="text"
                                    placeholder="Buscar usuario..."
                                    value={analisisSearchInput}
                                    onChange={(e) => setAnalisisSearchInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') setAnalisisSearch(analisisSearchInput); }}
                                    className="bg-transparent text-white placeholder-white/50 font-cairo text-sm border-none outline-none w-40"
                                />
                                <button onClick={() => setAnalisisSearch(analisisSearchInput)} className="text-white/80 hover:text-white">
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {loadingAnalisis ? (
                    <div className="flex justify-center items-center py-20">
                        <RefreshCw className="animate-spin text-csj-azul" size={40} />
                    </div>
                ) : analisisUsuarios.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl shadow-lg text-center">
                        <Users className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 font-cairo text-lg">No se encontraron datos para los filtros seleccionados</p>
                    </div>
                ) : isControlInternoView ? (
                    // ==========================================
                    //  VISTA CONTROL INTERNO
                    // ==========================================
                    <>
                        {/* KPIs Control Interno */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-azul">
                                <p className="text-sm text-gray-500 font-cairo">Usuarios</p>
                                <p className="text-3xl font-black text-csj-azul font-cairo">{analisisUsuarios.length}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-amarillo">
                                <p className="text-sm text-gray-500 font-cairo">Observaciones</p>
                                <p className="text-3xl font-black text-csj-amarillo font-cairo">{totalObservaciones}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-amarillo">
                                <p className="text-sm text-gray-500 font-cairo">T. Prom. Obs.</p>
                                <p className="text-3xl font-black text-csj-amarillo font-cairo">
                                    {analisisUsuarios.filter(u => u.tiempo_promedio_observacion > 0).length > 0
                                        ? Math.round(analisisUsuarios.reduce((s, u) => s + (u.tiempo_promedio_observacion || 0), 0) / analisisUsuarios.filter(u => u.tiempo_promedio_observacion > 0).length)
                                        : 0} d
                                </p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-verde">
                                <p className="text-sm text-gray-500 font-cairo">Conclusiones</p>
                                <p className="text-3xl font-black text-csj-verde font-cairo">{totalConclusiones}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-verde">
                                <p className="text-sm text-gray-500 font-cairo">T. Prom. Conc.</p>
                                <p className="text-3xl font-black text-csj-verde font-cairo">
                                    {analisisUsuarios.filter(u => u.tiempo_promedio_conclusion > 0).length > 0
                                        ? Math.round(analisisUsuarios.reduce((s, u) => s + (u.tiempo_promedio_conclusion || 0), 0) / analisisUsuarios.filter(u => u.tiempo_promedio_conclusion > 0).length)
                                        : 0} d
                                </p>
                            </div>
                        </div>

                        {/* Gráficas Control Interno */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-csj-azul">
                                <h3 className="text-lg font-black text-csj-azul font-cairo mb-4">Volumen de Actividad</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topControlInterno} layout="vertical" margin={{ left: 100 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="nombre" type="category" width={90} tick={{ fontSize: 10 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="total_observaciones" stackId="a" fill={COLORS.observaciones} name="Observaciones" />
                                            <Bar dataKey="total_conclusiones" stackId="a" fill={COLORS.conclusiones} name="Conclusiones" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-csj-rojo">
                                <h3 className="text-lg font-black text-csj-rojo font-cairo mb-4">Tiempos de Respuesta</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topControlInterno.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="nombre" type="category" width={90} tick={{ fontSize: 10 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="tiempo_promedio_observacion" fill={COLORS.observaciones} name="T. Obs." />
                                            <Bar dataKey="tiempo_promedio_conclusion" fill={COLORS.conclusiones} name="T. Conc." />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Tabla Control Interno */}
                        <div className="bg-white p-6 rounded-xl shadow-lg overflow-hidden">
                            <h3 className="text-lg font-black text-gray-800 font-cairo mb-4">Detalle de Gestión (Control Interno)</h3>
                            <div className="overflow-x-auto max-h-96 overflow-y-auto w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-50 text-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Usuario</th>
                                            <th className="px-4 py-3 text-center bg-csj-amarillo/10 text-yellow-800">Observaciones</th>
                                            <th className="px-4 py-3 text-center bg-csj-amarillo/10 text-yellow-800">T. Prom. Obs (días)</th>
                                            <th className="px-4 py-3 text-center bg-csj-verde/10 text-green-800">Conclusiones</th>
                                            <th className="px-4 py-3 text-center bg-csj-verde/10 text-green-800">T. Prom. Conc (días)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analisisUsuarios.map((user, idx) => (
                                            <tr key={idx} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{user.nombre}</td>
                                                <td className="px-4 py-3 text-center font-bold bg-csj-amarillo/10 text-yellow-800">{user.total_observaciones}</td>
                                                <td className="px-4 py-3 text-center bg-csj-amarillo/10 text-yellow-800">{user.tiempo_promedio_observacion}</td>
                                                <td className="px-4 py-3 text-center font-bold bg-csj-verde/10 text-green-800">{user.total_conclusiones}</td>
                                                <td className="px-4 py-3 text-center bg-csj-verde/10 text-green-800">{user.tiempo_promedio_conclusion}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    // ==========================================
                    //  VISTA LÍDERES / GESTIÓN
                    // ==========================================
                    <>
                        {/* KPIs Líderes */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-azul">
                                <p className="text-sm text-gray-500 font-cairo">Usuarios</p>
                                <p className="text-3xl font-black text-csj-azul font-cairo">{analisisUsuarios.length}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-amarillo">
                                <p className="text-sm text-gray-500 font-cairo">Acciones Asignadas</p>
                                <p className="text-3xl font-black text-csj-amarillo font-cairo">{totalAsignadas}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-verde">
                                <p className="text-sm text-gray-500 font-cairo">T. Prom. Cierre</p>
                                <p className="text-3xl font-black text-csj-verde font-cairo">
                                    {analisisUsuarios.filter(u => u.tiempo_promedio_cierre > 0).length > 0
                                        ? Math.round(analisisUsuarios.reduce((s, u) => s + u.tiempo_promedio_cierre, 0) / analisisUsuarios.filter(u => u.tiempo_promedio_cierre > 0).length)
                                        : 0} días
                                </p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-csj-rojo">
                                <p className="text-sm text-gray-500 font-cairo">% Vencimiento</p>
                                <p className="text-3xl font-black text-csj-rojo font-cairo">
                                    {analisisUsuarios.length > 0
                                        ? Math.round(analisisUsuarios.reduce((s, u) => s + parseFloat(u.porcentaje_vencidas || 0), 0) / analisisUsuarios.length)
                                        : 0}%
                                </p>
                            </div>
                        </div>

                        {/* Gráficas Líderes */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-csj-azul">
                                <h3 className="text-lg font-black text-csj-azul font-cairo mb-4">Carga y Estado de Acciones</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topLideres} layout="vertical" margin={{ left: 100 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="nombre" type="category" width={90} tick={{ fontSize: 10 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="cerradas" stackId="a" fill={COLORS.cerradas} name="Cerradas" />
                                            <Bar dataKey="vencidas" stackId="a" fill={COLORS.vencidas} name="Vencidas" />
                                            <Bar dataKey="proximas" stackId="a" fill={COLORS.proximas} name="Próximas" />
                                            <Bar dataKey="en_tiempo" stackId="a" fill={COLORS.en_tiempo} name="En Tiempo" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-csj-rojo">
                                <h3 className="text-lg font-black text-csj-rojo font-cairo mb-4">Top 10 - Mayor Tiempo de Cierre</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topDemoraCierre} layout="vertical" margin={{ left: 100 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="nombre" type="category" width={90} tick={{ fontSize: 10 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="tiempo_promedio_cierre" fill="#D7281E" name="Días Promedio" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Tabla Líderes */}
                        <div className="bg-white p-6 rounded-xl shadow-lg overflow-hidden">
                            <h3 className="text-lg font-black text-gray-800 font-cairo mb-4">Detalle de Cumplimiento (Líderes)</h3>
                            <div className="overflow-x-auto max-h-96 overflow-y-auto w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-50 text-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Usuario</th>
                                            <th className="px-4 py-3 text-center">Asignadas</th>
                                            <th className="px-4 py-3 text-center text-csj-verde">Cerradas</th>
                                            <th className="px-4 py-3 text-center text-csj-rojo">Vencidas</th>
                                            <th className="px-4 py-3 text-center">T. Prom. Cierre</th>
                                            <th className="px-4 py-3 text-center">% Vencidas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analisisUsuarios.map((user, idx) => (
                                            <tr key={idx} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{user.nombre}</td>
                                                <td className="px-4 py-3 text-center font-bold">{user.total_acciones}</td>
                                                <td className="px-4 py-3 text-center text-csj-verde font-bold">{user.cerradas}</td>
                                                <td className="px-4 py-3 text-center text-csj-rojo font-bold">{user.vencidas}</td>
                                                <td className="px-4 py-3 text-center">{user.tiempo_promedio_cierre} d</td>
                                                <td className="px-4 py-3 text-center">
                                                    {user.total_acciones > 0 ? (
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.porcentaje_vencidas > 50 ? 'bg-red-100 text-red-800' :
                                                            user.porcentaje_vencidas > 20 ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-green-100 text-green-800'
                                                            }`}>
                                                            {user.porcentaje_vencidas}%
                                                        </span>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const allPages = [renderPage1, renderPage2, renderPage3, ...(canSeeUserPages ? [renderPage4, renderPage5] : [])];
    const pages = allPages;
    const renderCurrentPage = pages[Math.min(currentPage, pages.length) - 1];

    // Ensure currentPage stays in bounds if user switches role
    if (currentPage > pages.length) setCurrentPage(pages.length);

    return (
        <div className="space-y-6">
            {renderCurrentPage && renderCurrentPage()}

            {/* Navegación tipo libro */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-csj-azul">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-cairo font-bold transition-all ${currentPage === 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-csj-azul text-white hover:bg-csj-azul/90 shadow-lg hover:shadow-xl'
                            }`}
                    >
                        <ChevronLeft size={20} />
                        Anterior
                    </button>

                    <div className="flex items-center gap-3">
                        {pages.map((_, index) => (
                            <PageButton
                                key={`page-btn-${index}`}
                                active={currentPage === index + 1}
                                onClick={() => setCurrentPage(() => index + 1)}
                            >
                                {index + 1}
                            </PageButton>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(pages.length, prev + 1))}
                        disabled={currentPage === pages.length}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-cairo font-bold transition-all ${currentPage === pages.length
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-csj-azul text-white hover:bg-csj-azul/90 shadow-lg hover:shadow-xl'
                            }`}
                    >
                        Siguiente
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 font-cairo">
                        Página <span className="font-bold text-csj-azul">{currentPage}</span> de{' '}
                        <span className="font-bold text-csj-azul">{pages.length}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
