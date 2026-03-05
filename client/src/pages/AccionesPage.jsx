import React, { useEffect, useReducer } from 'react';
import { fetchAcciones, fetchDependencias, fetchAccionById } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, Search, Eye, Calendar as CalendarIcon, ArrowUpRight } from 'lucide-react';
import AccionDetailModal from '../components/AccionDetailModal';

const initialState = {
    acciones: [],
    loading: true,
    dependencias: [],
    filters: {
        estado: '',
        dependenciaId: '',
        search: ''
    },
    selectedAccion: null
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_INITIAL_DATA': return { ...state, dependencias: action.payload };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_ACCIONES': return { ...state, acciones: action.payload, loading: false };
        case 'SET_SELECTED_ACCION': return { ...state, selectedAccion: action.payload };
        case 'SET_FILTER': return { ...state, filters: { ...state.filters, [action.field]: action.value } };
        case 'SET_FILTERS': return { ...state, filters: action.payload };
        default: return state;
    }
};

const AccionesPage = () => {
    const navigate = useNavigate();
    const [state, dispatch] = useReducer(reducer, initialState);
    const { acciones, loading, dependencias, filters, selectedAccion } = state;
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        loadInitialData();
    }, []);

    const showId = searchParams.get('show');

    useEffect(() => {
        // Auto-load modal if ?show= param exists in URL
        if (showId) {
            handleViewDetail(showId);
        }
    }, [showId]);

    const handleViewDetail = async (id) => {
        try {
            const fullAccion = await fetchAccionById(id);
            dispatch({ type: 'SET_SELECTED_ACCION', payload: fullAccion });
        } catch (error) {
            console.error("Error fetching action details", error);
        }
    };

    const loadInitialData = async () => {
        try {
            const deps = await fetchDependencias();
            dispatch({ type: 'SET_INITIAL_DATA', payload: deps });
            loadAcciones();
        } catch (error) {
            console.error("Error loading initial data", error);
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const loadAcciones = async (overrideFilters = filters) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            // Apply filtering in memory if API doesn't support thorough search yet, 
            // but the API supports 'estado' and 'dependenciaId'.
            const data = await fetchAcciones({
                estado: overrideFilters.estado,
                dependenciaId: overrideFilters.dependenciaId
            });

            // Client-side text search for now
            let filtered = data;
            if (overrideFilters.search) {
                const term = overrideFilters.search.toLowerCase();
                filtered = data.filter(a =>
                    a.actividad.toLowerCase().includes(term) ||
                    a.id.toString().includes(term)
                );
            }

            dispatch({ type: 'SET_ACCIONES', payload: filtered });
        } catch (error) {
            console.error("Error loading acciones", error);
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        dispatch({ type: 'SET_FILTERS', payload: newFilters });

        if (name !== 'search') {
            loadAcciones(newFilters);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        loadAcciones();
    };

    const getEstadoBadge = (item) => {
        if (item.fecha_cierre) {
            return <span className="badge-success">Cerrada</span>;
        }
        if (item.fecha_fin && new Date(item.fecha_fin) < new Date()) {
            return <span className="badge-danger">Vencida</span>;
        }
        // Check if "Próxima" (e.g. within 30 days) - Logic from controller
        const daysToDeadline = Math.ceil((new Date(item.fecha_fin) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysToDeadline >= 0 && daysToDeadline <= 30) {
            return <span className="badge-warning">Próxima</span>;
        }
        return <span className="badge-primary bg-blue-100 text-blue-800 border-blue-200">En Tiempo</span>;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black font-montserrat text-csj-azul">
                        Gestión de Acciones de Mejora
                    </h2>
                    <p className="text-sm text-gray-500 font-cairo mt-1">
                        Seguimiento consolidado de compromisos y avances
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/acciones/calendario')}
                        className="btn-outline flex items-center gap-2"
                    >
                        <CalendarIcon size={18} /> Ver Calendario
                    </button>
                    {/* 
                      Note: Create Action usually requires a Cause context. 
                      So no global "New Action" button here unless we implement a complex selector.
                    */}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-csj-azul grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 font-montserrat uppercase tracking-wide">
                        Estado
                    </label>
                    <select
                        name="estado"
                        value={filters.estado}
                        onChange={handleFilterChange}
                        className="select-csj font-cairo"
                    >
                        <option value="">Todos</option>
                        <option value="abierta">Abiertas</option>
                        <option value="vencida">Vencidas</option>
                        <option value="cerrada">Cerradas</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 font-montserrat uppercase tracking-wide">
                        Dependencia Responsable
                    </label>
                    <select
                        name="dependenciaId"
                        value={filters.dependenciaId}
                        onChange={handleFilterChange}
                        className="select-csj font-cairo"
                    >
                        <option value="">Todas</option>
                        {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2 font-montserrat uppercase tracking-wide">
                        Buscar
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Buscar por actividad o ID..."
                            className="input-csj flex-1 font-cairo"
                            onKeyDown={(e) => e.key === 'Enter' && loadAcciones()}
                        />
                        <button
                            onClick={handleSearch}
                            className="btn-secondary flex items-center justify-center gap-2 shadow-lg shadow-csj-azul/30"
                        >
                            <Search size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-md border-t-4 border-csj-azul overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider">ID</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider w-1/3">Actividad</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider">Responsable</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider">Vencimiento</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider text-center">Avance</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider text-center">Estado</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider text-right">Ver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-gray-500 font-cairo">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-csj-azul"></div>
                                            <span>Cargando acciones...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : acciones.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-gray-500 font-cairo italic">
                                        No se encontraron acciones con los filtros actuales.
                                    </td>
                                </tr>
                            ) : (
                                acciones.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-gray-400 font-mono text-xs">
                                            #{item.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-cairo text-gray-800 line-clamp-2" title={item.actividad}>
                                                {item.actividad}
                                            </div>
                                            {item.descripcion_meta && (
                                                <div className="text-xs text-gray-400 mt-1 line-clamp-1 italic">
                                                    Meta: {item.descripcion_meta}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-cairo text-xs">
                                            {item.dependencia || <span className="text-gray-400 italic">No asignada</span>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-cairo whitespace-nowrap">
                                            {item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString('es-CO') : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-20">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-500 ${(item.avance_actual || 0) === 100 ? 'bg-csj-verde' : 'bg-csj-azul'
                                                                }`}
                                                            style={{ width: `${item.avance_actual || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 text-center">
                                                    {item.avance_actual || 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getEstadoBadge(item)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        handleViewDetail(item.id);
                                                        setSearchParams({ show: item.id });
                                                    }}
                                                    className="btn-icon text-csj-azul bg-blue-50 hover:bg-csj-azul hover:text-white"
                                                    title="Ver Detalle"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {/* Link to Hallazgo Context */}
                                                <button
                                                    onClick={() => navigate(`/hallazgos/${item.hallazgo_id}`)}
                                                    className="btn-icon text-gray-400 hover:text-csj-verde hover:bg-green-50"
                                                    title="Ir al Hallazgo"
                                                >
                                                    <ArrowUpRight size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Simple for now) */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-cairo bg-gray-50">
                    <span>
                        Total: <strong>{acciones.length}</strong> acciones
                    </span>
                    {/* Placeholder for real pagination */}
                    <div className="flex gap-1">
                        <button className="px-3 py-1 border rounded bg-white disabled:opacity-50" disabled>Anterior</button>
                        <button className="px-3 py-1 border rounded bg-white disabled:opacity-50" disabled>Siguiente</button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedAccion && (
                <AccionDetailModal
                    accion={selectedAccion}
                    onClose={() => {
                        dispatch({ type: 'SET_SELECTED_ACCION', payload: null });
                        setSearchParams({}); // Clean URL parameter
                    }}
                    onUpdate={() => {
                        loadAcciones();
                        dispatch({ type: 'SET_SELECTED_ACCION', payload: null });
                    }}
                />
            )}
        </div>
    );
};

export default AccionesPage;
