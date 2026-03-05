import React, { useReducer } from 'react';
import {
    X,
    User,
    Calendar,
    Target,
    Package,
    TrendingUp,
    History,
    ChevronUp,
    ChevronDown,
    Download,
    Clock,
    AlertTriangle
} from 'lucide-react';
import Timeline from './Timeline';
import EvaluacionForm from './EvaluacionForm';
import { Plus, Check, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { approveAccion as apiApproveAccion, solicitarNovedad } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';

const AccionInfoTable = ({ accion }) => (
    <table className="w-full">
        <tbody>
            {/* Fila: Responsable y Fechas */}
            <tr className="border-b border-gray-200">
                <td className="bg-gray-100 p-4 font-bold text-sm w-1/6 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                        <User size={16} className="text-csj-azul" />
                        RESPONSABLE
                    </div>
                </td>
                <td className="p-4 text-sm w-1/3 border-r border-gray-200">
                    {accion.responsable || 'No asignado'}
                </td>
                <td className="bg-gray-100 p-4 font-bold text-sm w-1/6 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-csj-verde" />
                        FECHA INICIO
                    </div>
                </td>
                <td className="p-4 text-sm w-1/3">
                    {accion.fechaInicio ? new Date(accion.fechaInicio).toLocaleDateString('es-CO') :
                        accion.fecha_inicio ? new Date(accion.fecha_inicio).toLocaleDateString('es-CO') : '-'}
                </td>
            </tr>

            <tr className="border-b border-gray-200">
                <td className="bg-gray-100 p-4 font-bold text-sm border-r border-gray-200">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-csj-amarillo" />
                        FECHA FIN
                    </div>
                </td>
                <td className="p-4 text-sm border-r border-gray-200">
                    {accion.fechaFin ? new Date(accion.fechaFin).toLocaleDateString('es-CO') :
                        accion.fecha_fin ? new Date(accion.fecha_fin).toLocaleDateString('es-CO') : '-'}
                </td>
                <td className="bg-gray-100 p-4 font-bold text-sm border-r border-gray-200">
                    ESTADO
                </td>
                <td className="p-4 text-sm">
                    {(() => {
                        const now = new Date();
                        const fechaFin = accion.fechaFin ? new Date(accion.fechaFin) : null;
                        const fechaCierre = accion.fechaCierre ? new Date(accion.fechaCierre) : null;
                        const approvalStatus = accion.approvalStatus;
                        const en30dias = fechaFin ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

                        let estadoCalc, colorClass;

                        if (approvalStatus === 0) {
                            estadoCalc = 'Pendiente Aprobación';
                            colorClass = 'bg-orange-100 text-orange-600';
                        } else if (approvalStatus === 2) {
                            estadoCalc = 'Rechazada';
                            colorClass = 'bg-red-100 text-red-600';
                        } else if (fechaCierre) {
                            estadoCalc = 'Cerrada';
                            colorClass = 'bg-csj-verde/20 text-csj-verde';
                        } else if (fechaFin && fechaFin < now) {
                            estadoCalc = 'Vencida';
                            colorClass = 'bg-colombia-rojo/20 text-colombia-rojo';
                        } else if (fechaFin && fechaFin <= en30dias) {
                            estadoCalc = 'Próxima';
                            colorClass = 'bg-csj-amarillo/20 text-csj-amarillo';
                        } else {
                            estadoCalc = 'En Ejecución';
                            colorClass = 'bg-csj-azul/20 text-csj-azul';
                        }

                        return (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
                                {estadoCalc}
                            </span>
                        );
                    })()}
                </td>
            </tr>

            {/* Descripción de Metas */}
            {(accion.descripcionMetas || accion.descripcion_meta) && (
                <tr className="border-b border-gray-200">
                    <td className="bg-gray-100 p-4 font-bold text-sm border-r border-gray-200 align-top">
                        <div className="flex items-center gap-2">
                            <Target size={16} className="text-csj-verde" />
                            DESCRIPCIÓN DE METAS
                        </div>
                    </td>
                    <td className="p-4 text-sm" colSpan="3">
                        {accion.descripcionMetas || accion.descripcion_meta}
                    </td>
                </tr>
            )}

            {/* Entregables */}
            <tr className="border-b border-gray-200 bg-csj-verde/5">
                <td className="bg-gray-100 p-4 font-bold text-sm border-r border-gray-200">
                    <div className="flex items-center gap-2">
                        <Package size={16} className="text-csj-verde" />
                        UNIDAD DE MEDIDA
                    </div>
                </td>
                <td className="p-4 text-sm border-r border-gray-200">
                    {accion.denominacionUnidad || 'No especificado'}
                </td>
                <td className="bg-gray-100 p-4 font-bold text-sm border-r border-gray-200">
                    ENTREGABLES
                </td>
                <td className="p-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-csj-verde font-montserrat">
                            {accion.entregablesRealizados || 0}
                        </span>
                        <span className="text-gray-400 font-bold">/</span>
                        <span className="text-lg font-bold text-gray-700 font-montserrat">
                            {accion.entregablesTotales || 0}
                        </span>
                    </div>
                </td>
            </tr>

            {/* Avance */}
            <tr className="border-b border-gray-200">
                <td className="bg-gray-100 p-4 font-bold text-sm border-r border-gray-200">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-csj-azul" />
                        PORCENTAJE DE AVANCE
                    </div>
                </td>
                <td className="p-4" colSpan="3">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-csj-verde to-csj-verde/80 flex items-center justify-end pr-2 transition-all duration-300"
                                    style={{ width: `${accion.avance || accion.avance_actual || 0}%` }}
                                >
                                    <span className="text-xs font-bold text-white">
                                        {accion.avance || accion.avance_actual || 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className="text-lg font-black text-csj-verde font-montserrat min-w-[60px] text-right">
                            {accion.avance || accion.avance_actual || 0}%
                        </span>
                    </div>
                </td>
            </tr>

            {/* Información de Aprobación */}
            {(accion.fechaAprobacion || accion.observacionesAprobacion) && (
                <>
                    {accion.fechaAprobacion && (
                        <tr className="border-b border-gray-200">
                            <td className="bg-gray-100 p-4 font-bold text-sm border-r border-gray-200">
                                FECHA DE APROBACIÓN
                            </td>
                            <td className="p-4 text-sm" colSpan="3">
                                {new Date(accion.fechaAprobacion).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </td>
                        </tr>
                    )}
                    {accion.observacionesAprobacion && (
                        <tr className="border-b border-gray-200">
                            <td className="bg-gray-100 p-4 font-bold text-sm border-r border-gray-200 align-top">
                                OBSERVACIONES DE APROBACIÓN
                            </td>
                            <td className="p-4 text-sm" colSpan="3">
                                {accion.observacionesAprobacion}
                            </td>
                        </tr>
                    )}
                </>
            )}
        </tbody>
    </table>
);

const AccionApprovalBox = ({ accion, approvalObs, setApprovalObs, approving, handleApproval }) => (
    <div className="mx-4 mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg shadow-sm">
        <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} />
            Acción Pendiente de Aprobación
        </h4>
        <p className="text-sm text-orange-700 mb-4">
            Esta acción fue formulada por el líder y requiere su revisión para autorizar el inicio de la ejecución.
        </p>

        <div className="mb-4">
            <label htmlFor="approvalObs" className="block text-sm font-bold text-gray-700 mb-1">
                Observaciones (Obligatorio si se rechaza)
            </label>
            <textarea
                id="approvalObs"
                value={approvalObs}
                onChange={(e) => setApprovalObs(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                rows="3"
                placeholder="Ingrese sus observaciones aquí..."
                disabled={approving}
            />
        </div>

        <div className="flex gap-3 justify-end">
            <button
                onClick={() => handleApproval(false)}
                disabled={approving}
                className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
                <XCircle size={18} />
                Rechazar
            </button>
            <button
                onClick={() => handleApproval(true)}
                disabled={approving}
                className="px-4 py-2 bg-csj-verde hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
                <Check size={18} />
                Aprobar Acción
            </button>
        </div>
    </div>
);

const initialState = {
    showEvaluaciones: false,
    showForm: false,
    expandedRow: null,
    approvalObs: '',
    approving: false,
    // Novedad
    showNovedadForm: false,
    novedadTipo: '0',
    novedadFecha: '',
    novedadJustificacion: '',
    novedadSending: false,
    novedadError: '',
    novedadSuccess: '',
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'TOGGLE_EVALUACIONES':
            return { ...state, showEvaluaciones: action.payload };
        case 'TOGGLE_FORM':
            return { ...state, showForm: action.payload };
        case 'TOGGLE_EXPANDED_ROW':
            return { ...state, expandedRow: state.expandedRow === action.payload ? null : action.payload };
        case 'SET_APPROVAL_OBS':
            return { ...state, approvalObs: action.payload };
        case 'SET_APPROVING':
            return { ...state, approving: action.payload };
        case 'OPEN_NOVEDAD':
            return { ...state, showNovedadForm: true, novedadTipo: '0', novedadFecha: '', novedadJustificacion: '', novedadError: '', novedadSuccess: '' };
        case 'CLOSE_NOVEDAD':
            return { ...state, showNovedadForm: false, novedadError: '', novedadSuccess: '' };
        case 'UPDATE_NOVEDAD':
            return { ...state, [action.field]: action.value };
        case 'SET_NOVEDAD_SENDING':
            return { ...state, novedadSending: action.payload };
        case 'SET_NOVEDAD_ERROR':
            return { ...state, novedadError: action.payload, novedadSending: false };
        case 'SET_NOVEDAD_SUCCESS':
            return { ...state, novedadSuccess: action.payload, novedadSending: false };
        default:
            return state;
    }
};

const AccionDetailModal = ({ accion, onClose, onUpdate }) => {
    const { user } = useAuth();
    const { canEdit } = usePermissions('acciones');
    const { canCreate: canRegisterAdvance } = usePermissions('seguimientos');
    const { canEdit: canApprove } = usePermissions('novedades');

    // El líder puede solicitar novedad si es el responsable de la acción,
    // o tiene permiso explícito. Comparación case-insensitive porque SQL devuelve UUIDs en mayúsculas.
    const { canCreate: canSolicitarNovedadPerm } = usePermissions('novedades');
    const userId = user?.id?.toLowerCase?.() ?? '';
    const respId = (accion?.responsableUserId ?? '').toLowerCase();
    const isResponsable = userId && respId && userId === respId;
    const canSolicitarNovedad = canSolicitarNovedadPerm || isResponsable;

    const [state, dispatch] = useReducer(reducer, initialState);
    const { showEvaluaciones, showForm, expandedRow, approvalObs, approving,
        showNovedadForm, novedadTipo, novedadFecha, novedadJustificacion,
        novedadSending, novedadError, novedadSuccess } = state;

    const handleApproval = async (aprobado) => {
        if (!aprobado && !approvalObs.trim()) {
            alert("Debe ingresar una observación al rechazar la acción.");
            return;
        }

        try {
            dispatch({ type: 'SET_APPROVING', payload: true });
            await apiApproveAccion(accion.id, { aprobado, observaciones: approvalObs });
            if (onUpdate) onUpdate();
            onClose(); // Cerrar modal después de procesar
        } catch (error) {
            console.error('Error en aprobación:', error);
            alert("Error al procesar la aprobación.");
        } finally {
            dispatch({ type: 'SET_APPROVING', payload: false });
        }
    };

    const toggleRowExpansion = (evaluacionId) => {
        dispatch({ type: 'TOGGLE_EXPANDED_ROW', payload: evaluacionId });
    };

    const handleEvaluationSuccess = () => {
        dispatch({ type: 'TOGGLE_FORM', payload: false });
        if (onUpdate) onUpdate();
    };

    const handleSolicitarNovedad = async (e) => {
        e.preventDefault();
        if (!novedadJustificacion.trim()) {
            dispatch({ type: 'SET_NOVEDAD_ERROR', payload: 'La justificación es obligatoria.' });
            return;
        }
        if (novedadTipo === '0' && !novedadFecha) {
            dispatch({ type: 'SET_NOVEDAD_ERROR', payload: 'La fecha propuesta es obligatoria para prórrogas.' });
            return;
        }
        dispatch({ type: 'SET_NOVEDAD_SENDING', payload: true });
        try {
            await solicitarNovedad(accion.id, {
                tipo: parseInt(novedadTipo),
                justificacion: novedadJustificacion,
                fecha_propuesta: novedadFecha || null,
            });
            dispatch({ type: 'SET_NOVEDAD_SUCCESS', payload: '¡Novedad solicitada correctamente!' });
            if (onUpdate) onUpdate();
        } catch {
            dispatch({ type: 'SET_NOVEDAD_ERROR', payload: 'Error al enviar la solicitud.' });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header del Modal */}
                <div className="bg-gradient-to-r from-csj-azul to-csj-verde p-4 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white font-montserrat">
                        Detalle de la Acción
                    </h3>
                    <div className="flex items-center gap-3">
                        {canRegisterAdvance && !showForm && accion.approvalStatus === 1 && (
                            <button
                                onClick={() => dispatch({ type: 'TOGGLE_FORM', payload: true })}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm"
                            >
                                <Plus size={16} />
                                Registrar Avance
                            </button>
                        )}
                        {canSolicitarNovedad && accion.approvalStatus === 1 && !showNovedadForm && (
                            <button
                                onClick={() => dispatch({ type: 'OPEN_NOVEDAD' })}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm border border-white/30"
                            >
                                <AlertTriangle size={16} />
                                Solicitar Novedad
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            title="Cerrar"
                        >
                            <X size={24} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* Contenido - ESTILO TABLA */}
                <div className="flex-1 overflow-y-auto bg-gray-50 pb-8">
                    {/* Descripción de la Acción */}
                    <div className="bg-csj-verde/10 p-4 border-b-2 border-csj-verde">
                        <p className="text-gray-800 font-cairo leading-relaxed">
                            {accion.accion || accion.actividad}
                        </p>
                    </div>

                    {/* Tabla de Información */}
                    <AccionInfoTable accion={accion} />

                    {/* SECTION: Aprobación Control Interno */}
                    {accion.approvalStatus === 0 && canApprove && (
                        <AccionApprovalBox
                            accion={accion}
                            approvalObs={approvalObs}
                            setApprovalObs={(value) => dispatch({ type: 'SET_APPROVAL_OBS', payload: typeof value === 'function' ? value(approvalObs) : value })}
                            approving={approving}
                            handleApproval={handleApproval}
                        />
                    )}

                    {/* TIMELINE VISUAL */}
                    <div className="border-t-4 border-csj-azul mt-6 p-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock size={20} className="text-csj-azul" />
                            <h5 className="font-black text-gray-900 font-montserrat">
                                Línea de Tiempo de la Acción
                            </h5>
                        </div>
                        <div className="max-h-80 overflow-y-auto pr-4">
                            <Timeline accionId={accion.id} />
                        </div>
                    </div>

                    {/* SECTION: Formulario de Nuevo Avance */}
                    {showForm && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <EvaluacionForm
                                accionId={accion.id}
                                onSuccess={handleEvaluationSuccess}
                                onCancel={() => dispatch({ type: 'TOGGLE_FORM', payload: false })}
                            />
                        </div>
                    )}

                    {/* SECTION: Formulario de Solicitud de Novedad */}
                    {showNovedadForm && (
                        <div className="p-4 border-t-4 border-yellow-400 bg-yellow-50">
                            <h5 className="font-black text-gray-800 font-montserrat mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-yellow-600" />
                                Solicitar Novedad sobre la Acción
                            </h5>
                            {novedadSuccess ? (
                                <div className="text-center py-4">
                                    <p className="text-green-700 font-bold">{novedadSuccess}</p>
                                    <button
                                        onClick={() => dispatch({ type: 'CLOSE_NOVEDAD' })}
                                        className="mt-3 px-4 py-2 bg-[#1E3A6B] text-white rounded-lg font-bold text-sm"
                                    >Cerrar</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSolicitarNovedad} className="space-y-4">
                                    {novedadError && (
                                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{novedadError}</p>
                                    )}
                                    <div>
                                        <label htmlFor="nov-tipo" className="block text-xs font-bold text-gray-600 uppercase mb-1">Tipo de Novedad</label>
                                        <select
                                            id="nov-tipo"
                                            value={novedadTipo}
                                            onChange={(e) => dispatch({ type: 'UPDATE_NOVEDAD', field: 'novedadTipo', value: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-yellow-500 bg-white"
                                        >
                                            <option value="0">Prórroga (cambio de fecha)</option>
                                            <option value="1">Modificación de la Acción</option>
                                            <option value="2">Modificación de Responsable</option>
                                            <option value="3">Modificación de Unidades de Medida</option>
                                        </select>
                                    </div>
                                    {novedadTipo === '0' && (
                                        <div>
                                            <label htmlFor="nov-fecha" className="block text-xs font-bold text-gray-600 uppercase mb-1">Nueva Fecha Propuesta</label>
                                            <input
                                                id="nov-fecha"
                                                type="date"
                                                value={novedadFecha}
                                                onChange={(e) => dispatch({ type: 'UPDATE_NOVEDAD', field: 'novedadFecha', value: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-yellow-500 bg-white"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label htmlFor="nov-just" className="block text-xs font-bold text-gray-600 uppercase mb-1">Justificación</label>
                                        <textarea
                                            id="nov-just"
                                            value={novedadJustificacion}
                                            onChange={(e) => dispatch({ type: 'UPDATE_NOVEDAD', field: 'novedadJustificacion', value: e.target.value })}
                                            rows={3}
                                            placeholder="Explique detalladamente el motivo de la solicitud..."
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-yellow-500 resize-none bg-white"
                                        />
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => dispatch({ type: 'CLOSE_NOVEDAD' })}
                                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50"
                                        >Cancelar</button>
                                        <button
                                            type="submit"
                                            disabled={novedadSending}
                                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold text-sm disabled:opacity-60 flex items-center gap-2"
                                        >
                                            {novedadSending ? 'Enviando...' : 'Enviar Solicitud'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccionDetailModal;
