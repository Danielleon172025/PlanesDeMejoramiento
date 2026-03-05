import React, { useEffect, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchDetalleHallazgo, closeHallazgo } from '../services/api';
import {
    ArrowLeft,
    Calendar,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Layers,
    User,
    TrendingUp,
    PlayCircle,
    XCircle,
    AlertCircle,
    Download,
    Eye,
    Package,
    Target,
    ClipboardCheck,
    MessageSquare,
    X,
    History,
    ChevronDown,
    ChevronUp,
    Plus,
    Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { CausesTimeline } from '../components/CausesTimeline';
import HistoryViewer from '../components/HistoryViewer';
import CausaForm from '../components/CausaForm';
import AccionForm from '../components/AccionForm';
import Timeline from '../components/Timeline';
import AccionDetailModal from '../components/AccionDetailModal';

const initialState = {
    data: null,
    loading: true,
    error: null,
    selectedAccion: null,
    showModal: false,
    showHistory: false,
    showCausaModal: false,
    showAccionForm: false,
    selectedCausaId: null,
    closing: false
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_DATA': return { ...state, data: action.payload, loading: false, error: null };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
        case 'OPEN_MODAL': return { ...state, showModal: true, selectedAccion: action.payload };
        case 'CLOSE_MODAL': return { ...state, showModal: false, selectedAccion: null };
        case 'TOGGLE_HISTORY': return { ...state, showHistory: !state.showHistory };
        case 'SET_CAUSA_MODAL': return { ...state, showCausaModal: action.payload };
        case 'OPEN_ACCION_FORM': return { ...state, showAccionForm: true, selectedCausaId: action.payload };
        case 'CLOSE_ACCION_FORM': return { ...state, showAccionForm: false, selectedCausaId: null };
        case 'SET_CLOSING': return { ...state, closing: action.payload };
        default: return state;
    }
};

const HallazgoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [state, dispatch] = useReducer(reducer, initialState);
    const { data, loading, error, selectedAccion, showModal, showHistory, showCausaModal, showAccionForm, selectedCausaId, closing } = state;

    const { canCreate, canEdit, canDelete } = usePermissions('hallazgos');

    const loadDetail = async () => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            const result = await fetchDetalleHallazgo(id);

            if (!result) {
                dispatch({ type: 'SET_ERROR', payload: 'No se encontró información del hallazgo' });
                return;
            }

            dispatch({ type: 'SET_DATA', payload: result });
        } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: 'Error al cargar los datos del hallazgo' });
            console.error(err);
        }
    };

    useEffect(() => {
        loadDetail();
    }, [id]);

    const openModal = (accion) => {
        dispatch({ type: 'OPEN_MODAL', payload: accion });
    };

    const closeModal = () => {
        dispatch({ type: 'CLOSE_MODAL' });
    };

    const handleCloseHallazgo = async () => {
        if (!window.confirm('¿Está seguro de cerrar este hallazgo? Esta acción marcará como concluidas todas las acciones asociadas pendientes y es definitiva.')) {
            return;
        }

        try {
            dispatch({ type: 'SET_CLOSING', payload: true });
            await closeHallazgo(id);
            alert('Hallazgo cerrado exitosamente');
            loadDetail(); // Recargamos para ver el estado Cerrado
        } catch (err) {
            console.error('Error cerrando hallazgo', err);
            alert('Ocurrió un error al intentar cerrar el hallazgo');
            dispatch({ type: 'SET_CLOSING', payload: false });
        }
    };

    // Estado de carga
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-gray-500 font-cairo">Cargando detalles del hallazgo...</p>
                </div>
            </div>
        );
    }

    // Estado de error
    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertCircle size={64} className="text-colombia-rojo mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-csj-azul font-montserrat mb-2">
                        {error || 'Hallazgo no encontrado'}
                    </h3>
                    <p className="text-gray-500 font-cairo mb-6">
                        No se pudo cargar la información solicitada
                    </p>
                    <button
                        onClick={() => navigate('/hallazgos')}
                        className="btn-primary"
                    >
                        <ArrowLeft size={18} className="inline mr-2" />
                        Volver a Hallazgos
                    </button>
                </div>
            </div>
        );
    }

    const { hallazgo, causas } = data;

    // Función para obtener badge según estado
    const getEstadoBadge = (estado) => {
        const badges = {
            'Vencida': (
                <span className="badge-vencida">
                    <XCircle size={14} />
                    Vencida
                </span>
            ),
            'Próxima': (
                <span className="badge-proxima">
                    <Clock size={14} />
                    Próxima a vencer
                </span>
            ),
            'En Tiempo': (
                <span className="badge-en-tiempo">
                    <PlayCircle size={14} />
                    En tiempo
                </span>
            ),
            'Cerrada': (
                <span className="badge-cerrada">
                    <CheckCircle2 size={14} />
                    Cerrada
                </span>
            ),
        };
        return badges[estado] || <span className="badge">{estado}</span>;
    };

    // Función para calcular días restantes
    const calcularDiasRestantes = (fechaFin, fechaCierre) => {
        if (fechaCierre) return null;

        const hoy = new Date();
        const fin = new Date(fechaFin);
        const diffTime = fin - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header De Navegación */}
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={() => navigate('/hallazgos')}
                        className="flex items-center gap-2 text-gray-500 hover:text-csj-azul transition-colors font-medium font-cairo"
                    >
                        <ArrowLeft size={18} />
                        Volver al listado
                    </button>
                    <div className="flex gap-3">
                        {canEdit && hallazgo.estado !== 'Cerrado' && canDelete && (
                            <button
                                onClick={handleCloseHallazgo}
                                disabled={closing}
                                className="bg-csj-azul hover:bg-blue-800 text-white font-bold flex items-center gap-2 shadow-lg shadow-csj-azul/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Lock size={18} />
                                Cerrar Hallazgo Definitivamente
                            </button>
                        )}
                        {canCreate && hallazgo.estado !== 'Cerrado' && (
                            <button
                                onClick={() => dispatch({ type: 'SET_CAUSA_MODAL', payload: true })}
                                className="btn-primary flex items-center gap-2 shadow-lg shadow-csj-verde/20 px-4 py-2"
                            >
                                <Plus size={18} />
                                Nueva Causa
                            </button>
                        )}
                    </div>
                </div>

                {/* Tarjeta Principal del Hallazgo */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-csj-azul to-[#1b3a6e] p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <FileText size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold font-montserrat tracking-wider border border-white/30">
                                            {hallazgo.anio}
                                        </span>
                                        <span className="bg-csj-verde text-white px-3 py-1 rounded-full text-xs font-bold font-montserrat border border-white/20 shadow-sm">
                                            {hallazgo.cod_hallazgo}
                                        </span>
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black mb-2 font-montserrat leading-tight max-w-4xl">
                                        {hallazgo.pla_mej_hal_hallazgo || 'Sin descripción del hallazgo'}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-6 mt-4 opacity-90 text-sm font-cairo">
                                        <div className="flex items-center gap-2">
                                            <Layers size={16} />
                                            <span>
                                                {hallazgo.macroproceso || 'Macroproceso no definido'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={16} />
                                            <span>
                                                {hallazgo.proceso || 'Proceso no definido'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detalles Grid */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 bg-white">
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-csj-azul/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2 text-gray-500">
                                <Calendar className="w-5 h-5 group-hover:text-csj-azul transition-colors" />
                                <span className="text-xs font-bold uppercase tracking-wider font-montserrat">Fecha Reporte</span>
                            </div>
                            <p className="font-semibold text-gray-800 font-cairo">
                                {hallazgo.pla_mej_hal_fecha ? new Date(hallazgo.pla_mej_hal_fecha).toLocaleDateString() : 'Sin fecha'}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-csj-azul/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2 text-gray-500">
                                <AlertTriangle className="w-5 h-5 group-hover:text-csj-amarillo transition-colors" />
                                <span className="text-xs font-bold uppercase tracking-wider font-montserrat">Criticidad</span>
                            </div>
                            <p className="font-semibold text-gray-800 font-cairo">
                                {hallazgo.criticidad || 'Media'}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-csj-azul/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2 text-gray-500">
                                <User className="w-5 h-5 group-hover:text-csj-verde transition-colors" />
                                <span className="text-xs font-bold uppercase tracking-wider font-montserrat">Fuente</span>
                            </div>
                            <p className="font-semibold text-gray-800 font-cairo">
                                {hallazgo.fuente || 'No especificada'}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-csj-azul/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2 text-gray-500">
                                <CheckCircle2 className="w-5 h-5 group-hover:text-csj-verde transition-colors" />
                                <span className="text-xs font-bold uppercase tracking-wider font-montserrat">Estado</span>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hallazgo.estado === 'Cerrado'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {hallazgo.estado || 'Abierto'}
                            </span>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-csj-azul/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2 text-gray-500">
                                <User className="w-5 h-5 group-hover:text-csj-azul transition-colors" />
                                <span className="text-xs font-bold uppercase tracking-wider font-montserrat">Auditor</span>
                            </div>
                            <p className="font-semibold text-gray-800 font-cairo line-clamp-2" title={hallazgo.auditor_nombre || 'No asignado'}>
                                {hallazgo.auditor_nombre || 'No asignado'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Línea de Tiempo de Causas (Replaces Ishikawa) */}
                {causas.length > 0 && (
                    <div className="mb-8">
                        <CausesTimeline effect={hallazgo.pla_mej_hal_efecto || hallazgo.pla_mej_hal_hallazgo} causes={data.causas.map(c => ({ id: c.id, descripcion: c.causa }))} />
                    </div>
                )}

                {/* Historial del Hallazgo */}
                <div className="bg-white rounded-xl shadow-md border-l-4 border-gray-400 overflow-hidden mb-6">
                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_HISTORY' })}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <History className="text-gray-500" size={20} />
                            <h3 className="font-bold text-gray-700 font-montserrat">Historial de Cambios</h3>
                        </div>
                        {showHistory ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>

                    {showHistory && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <HistoryViewer
                                hallazgoId={id}
                                compact={true}
                            />
                        </div>
                    )}
                </div>

                {/* Sección de Causas y Acciones */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black text-csj-azul flex items-center gap-2 font-montserrat">
                                <Target size={24} />
                                Plan de Acción
                            </h2>
                            <p className="text-sm text-gray-500 font-cairo mt-1">
                                Gestión de causas raíz y acciones correctivas
                            </p>
                        </div>
                        <div className="text-sm text-gray-500 font-cairo bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                            {causas.length} {causas.length === 1 ? 'causa raíz' : 'causas raíz'}
                        </div>
                    </div>

                    {causas.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                            <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-cairo">
                                No hay causas ni acciones registradas para este hallazgo
                            </p>
                            {canCreate && hallazgo.estado !== 'Cerrado' && (
                                <button
                                    onClick={() => dispatch({ type: 'SET_CAUSA_MODAL', payload: true })}
                                    className="mt-4 btn-primary inline-flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Agregar Primer Causa
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {causas.map((causa) => (
                                <div key={causa.id} className="bg-white rounded-xl shadow-md border-t-4 border-csj-azul overflow-hidden hover:shadow-lg transition-shadow">
                                    {/* Cause Header */}
                                    <div className="bg-gradient-to-r from-csj-azul to-csj-verde p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-white">
                                            <div className="bg-white/20 p-2 rounded-lg">
                                                <AlertTriangle size={24} className="text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg font-montserrat">Causa Raíz</h4>
                                                <p className="text-sm text-blue-100 font-cairo opacity-90 max-w-2xl">
                                                    {causa.causa}
                                                </p>
                                                {causa.efecto && (
                                                    <p className="text-white/80 text-sm mt-2 font-cairo">
                                                        <span className="font-semibold">Efecto:</span> {causa.efecto}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <div className="text-white text-xs font-cairo">Acciones</div>
                                                <div className="text-white font-black text-xl font-montserrat">
                                                    {causa.acciones.length}
                                                </div>
                                            </div>
                                            {canCreate && hallazgo.estado !== 'Cerrado' && (
                                                <button
                                                    onClick={() => dispatch({ type: 'OPEN_ACCION_FORM', payload: causa.id })}
                                                    className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors backdrop-blur-sm"
                                                    title="Nueva Acción"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions List */}
                                    <div className="p-2 bg-gray-50">
                                        {causa.acciones.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500 font-cairo italic">
                                                No hay acciones planteadas para esta causa
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {causa.acciones.map((accion) => (
                                                    <div
                                                        key={accion.id}
                                                        onClick={() => openModal(accion)}
                                                        className="bg-white p-4 rounded-lg border border-gray-100 hover:border-csj-azul/30 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                                    >
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${accion.avance >= 100 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                                                }`}>
                                                                <Target size={16} />
                                                            </div>
                                                            <div>
                                                                <h5 className="font-bold text-gray-800 font-montserrat text-sm mb-1 line-clamp-1">
                                                                    {accion.accion}
                                                                </h5>
                                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-cairo">
                                                                    <div className="flex items-center gap-1">
                                                                        <User size={12} />
                                                                        <span>{accion.responsable || 'Sin responsable'}</span>
                                                                    </div>
                                                                    {accion.fechaFin && (
                                                                        <div className="flex items-center gap-1">
                                                                            <Calendar size={12} />
                                                                            <span>Vence: {new Date(accion.fechaFin).toLocaleDateString()}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 justify-between md:justify-end min-w-[200px]">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-bold text-gray-500 font-montserrat">Avance</span>
                                                                <span className={`text-md font-black ${accion.avance >= 100 ? 'text-csj-verde' : 'text-csj-azul'
                                                                    } font-montserrat`}>
                                                                    {accion.avance || 0}%
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                {getEstadoBadge(accion.estado)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DE DETALLE DE ACCION */}
            {showModal && selectedAccion && (
                <AccionDetailModal
                    accion={selectedAccion}
                    onClose={closeModal}
                    onUpdate={loadDetail}
                />
            )}

            {/* MODAL DE NUEVA CAUSA */}
            {showCausaModal && (
                <CausaForm
                    hallazgoId={id}
                    onClose={() => dispatch({ type: 'SET_CAUSA_MODAL', payload: false })}
                    onSave={() => {
                        loadDetail();
                        dispatch({ type: 'SET_CAUSA_MODAL', payload: false });
                    }}
                />
            )}

            {/* MODAL DE NUEVA ACCION */}
            {showAccionForm && selectedCausaId && (
                <AccionForm
                    causaId={selectedCausaId}
                    onClose={() => dispatch({ type: 'CLOSE_ACCION_FORM' })}
                    onSave={() => {
                        loadDetail();
                        dispatch({ type: 'CLOSE_ACCION_FORM' });
                    }}
                />
            )}
        </div>
    );
};



export default HallazgoDetail;
