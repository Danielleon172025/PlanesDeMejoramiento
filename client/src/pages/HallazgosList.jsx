import React, { useEffect, useReducer } from 'react';
import { fetchHallazgos, fetchListas } from '../services/api';
import { Filter, Search, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HallazgoForm from '../components/HallazgoForm';
import { usePermissions } from '../hooks/usePermissions';

const initialState = {
    hallazgos: [],
    loading: true,
    procesos: [],
    fuentes: [],
    filters: { proceso: '', fuente: '', year: '' },
    showFormModal: false
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'INITIAL_LOAD_SUCCESS':
            return { ...state, procesos: action.payload.procesos, fuentes: action.payload.fuentes };
        case 'SET_HALLAZGOS':
            return { ...state, hallazgos: action.payload, loading: false };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'UPDATE_FILTER':
            return { ...state, filters: { ...state.filters, [action.field]: action.value } };
        case 'SET_SHOW_FORM_MODAL':
            return { ...state, showFormModal: action.payload };
        default:
            return state;
    }
};

const HallazgosList = () => {
    const navigate = useNavigate();
    const { canCreate } = usePermissions('hallazgos');
    const [state, dispatch] = useReducer(reducer, initialState);
    const { hallazgos, loading, procesos, fuentes, filters, showFormModal } = state;

    useEffect(() => {
        const loadInitialData = async () => {
            const [dataProcesos, dataFuentes] = await Promise.all([
                fetchListas('procesos'),
                fetchListas('fuentes')
            ]);
            dispatch({ type: 'INITIAL_LOAD_SUCCESS', payload: { procesos: dataProcesos, fuentes: dataFuentes } });
            loadHallazgos();
        };
        loadInitialData();
    }, []);

    const loadHallazgos = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        const data = await fetchHallazgos(filters);
        dispatch({ type: 'SET_HALLAZGOS', payload: data });
    };

    const handleFilterChange = (e) => {
        dispatch({ type: 'UPDATE_FILTER', field: e.target.name, value: e.target.value });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        loadHallazgos();
    };

    const handleViewDetail = (id) => {
        navigate(`/hallazgos/${id}`);
    };

    const handleSaveHallazgo = () => {
        loadHallazgos();
        dispatch({ type: 'SET_SHOW_FORM_MODAL', payload: false });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black font-montserrat text-csj-azul">
                        Gestión de Hallazgos
                    </h2>
                    <p className="text-sm text-gray-500 font-cairo mt-1">
                        Registro y seguimiento de hallazgos identificados
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => dispatch({ type: 'SET_SHOW_FORM_MODAL', payload: true })}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-csj-verde/30"
                    >
                        <Plus size={18} /> Nuevo Hallazgo
                    </button>
                )}
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-csj-verde grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 font-montserrat uppercase tracking-wide">
                        Vigencia
                    </label>
                    <select
                        name="year"
                        value={filters.year}
                        onChange={handleFilterChange}
                        className="select-csj font-cairo"
                    >
                        <option value="">Todas</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 font-montserrat uppercase tracking-wide">
                        Proceso
                    </label>
                    <select
                        name="proceso"
                        value={filters.proceso}
                        onChange={handleFilterChange}
                        className="select-csj font-cairo"
                    >
                        <option value="">Todos</option>
                        {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 font-montserrat uppercase tracking-wide">
                        Fuente
                    </label>
                    <select
                        name="fuente"
                        value={filters.fuente}
                        onChange={handleFilterChange}
                        className="select-csj font-cairo"
                    >
                        <option value="">Todas</option>
                        {fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleSearch}
                        className="btn-secondary w-full flex items-center justify-center gap-2 shadow-lg shadow-csj-azul/30"
                    >
                        <Search size={18} /> Buscar
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-md border-t-4 border-csj-verde overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-csj-azul text-white">
                            <tr>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider">No.</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider">Fecha</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider">Fuente</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider">Proceso</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider">Descripción</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider text-center">Acciones</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider text-center">Avance</th>
                                <th className="px-6 py-4 font-black font-montserrat uppercase text-xs tracking-wider text-right">Opciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500 font-cairo">
                                        Cargando hallazgos...
                                    </td>
                                </tr>
                            ) : hallazgos.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500 font-cairo">
                                        No se encontraron hallazgos con los filtros seleccionados
                                    </td>
                                </tr>
                            ) : (
                                hallazgos.map((hallazgo) => (
                                    <tr key={hallazgo.id} className="hover:bg-csj-verde/5 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-csj-azul font-montserrat">
                                            {hallazgo.numero}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-cairo">
                                            {new Date(hallazgo.fecha).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-csj-azul/10 text-csj-azul px-3 py-1 rounded-full text-xs font-bold font-cairo">
                                                {hallazgo.fuente_nombre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-cairo">
                                            {hallazgo.proceso_nombre}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate font-cairo" title={hallazgo.descripcion}>
                                            {hallazgo.descripcion}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-csj-azul font-bold text-lg font-montserrat">
                                                {hallazgo.total_acciones}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                                                    <div
                                                        className="bg-csj-verde h-2.5 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${hallazgo.total_acciones > 0
                                                                ? (hallazgo.acciones_cerradas / hallazgo.total_acciones) * 100
                                                                : 0}%`
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-600 font-cairo w-10 text-right">
                                                    {hallazgo.total_acciones > 0
                                                        ? Math.round((hallazgo.acciones_cerradas / hallazgo.total_acciones) * 100)
                                                        : 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewDetail(hallazgo.id)}
                                                className="text-gray-400 hover:text-csj-verde p-2 hover:bg-csj-verde/10 rounded-lg transition-colors"
                                                title="Ver Detalle"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t-2 border-gray-100 flex items-center justify-between text-sm font-cairo bg-gray-50">
                    <span className="text-gray-600">
                        Mostrando <span className="font-bold text-csj-azul">{hallazgos.length}</span> resultados
                    </span>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-csj-verde hover:text-csj-verde font-semibold disabled:opacity-50 transition-colors" disabled>
                            Anterior
                        </button>
                        <button className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-csj-verde hover:text-csj-verde font-semibold disabled:opacity-50 transition-colors" disabled>
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            {showFormModal && (
                <HallazgoForm
                    onClose={() => dispatch({ type: 'SET_SHOW_FORM_MODAL', payload: false })}
                    onSave={handleSaveHallazgo}
                />
            )}
        </div>
    );
};

export default HallazgosList;
