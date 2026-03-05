import React, { useEffect, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNovedades, resolverNovedad, fetchAprobacionesPendientes, resolverAprobacion, fetchUsuariosRoles, updateAccion, fetchAccionById } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import {
    Clock, CheckCircle, XCircle, AlertTriangle, Calendar,
    Users, FileText, ChevronDown, ChevronUp, Filter, Eye, ListTodo
} from 'lucide-react';

// ==========================================
// CONSTANTS
// ==========================================
const TIPO_LABELS = {
    0: 'Prórroga',
    1: 'Modificación de la Acción',
    2: 'Modificación de Responsable',
    3: 'Modificación de Unidades de Medida',
};

const TIPO_COLORS = {
    0: 'bg-blue-100 text-blue-700',
    1: 'bg-purple-100 text-purple-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-teal-100 text-teal-700',
};

const ESTADO_COLORS = {
    0: 'bg-yellow-100 text-yellow-800',
    1: 'bg-green-100 text-green-800',
    2: 'bg-red-100 text-red-800',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

// ==========================================
// REDUCER
// ==========================================
const initialState = {
    tab: 'acciones', // acciones, pendientes, aprobadas, rechazadas
    accionesPendientes: [],
    novedades: [],
    loading: true,
    error: '',
    expanded: null,
    resolving: null,
    applying: null,
    resolvingObs: {},
    successMsg: '',
    usuariosRoles: [],
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_TAB': return { ...state, tab: action.payload, expanded: null };
        case 'SET_ACCIONES': return { ...state, accionesPendientes: action.payload, loading: false, error: '' };
        case 'SET_NOVEDADES': return { ...state, novedades: action.payload, loading: false, error: '' };
        case 'SET_USUARIOS_ROLES': return { ...state, usuariosRoles: action.payload };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
        case 'TOGGLE_EXPANDED': return { ...state, expanded: state.expanded === action.payload ? null : action.payload };
        case 'SET_RESOLVING': return { ...state, resolving: action.payload };
        case 'SET_APPLYING': return { ...state, applying: action.payload };
        case 'SET_OBS': return { ...state, resolvingObs: { ...state.resolvingObs, [action.id]: action.value } };
        case 'SET_SUCCESS': return { ...state, successMsg: action.payload };
        default: return state;
    }
};

// ==========================================
// SUB-COMPONENTE: Tarjeta de Acción Pendiente
// ==========================================
const AccionCard = ({ accion, onResolve, resolving }) => {
    const navigate = useNavigate();

    return (
        <div className="border border-yellow-200 bg-white rounded-xl overflow-hidden shadow-sm transition-all duration-200">
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                                Plan de Acción
                            </span>
                            <span className="text-xs text-gray-500 font-bold">Solicitud #{accion.id}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-2">{accion.descripcion}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            <span>📋 {accion.responsable || 'N/A'}</span>
                            <span>👤 {accion.solicitante || 'Desconocido'}</span>
                            <span>🗓️ Solicitado: {fmtDate(accion.fecha)}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                        <button
                            className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded transition-colors"
                            onClick={() => navigate(`/acciones?show=${accion.id}`)}
                            title="Revisar evidencia y detalles antes de aprobar"
                        >
                            <Eye size={14} /> Revisar
                        </button>
                        <button
                            className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition-colors disabled:opacity-50"
                            onClick={() => onResolve(accion.id, true)}
                            disabled={resolving === accion.id}
                        >
                            <CheckCircle size={14} /> Aprobar
                        </button>
                        <button
                            className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded transition-colors disabled:opacity-50"
                            onClick={() => onResolve(accion.id, false)}
                            disabled={resolving === accion.id}
                        >
                            <XCircle size={14} /> Rechazar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// SUB-COMPONENTE: Tarjeta de Novedad
// ==========================================
const NovedadCard = ({ novedad, expanded, onToggle, onResolve, resolving, obs, onObsChange, canEdit, usuariosRoles, onApplyChange, applying }) => {
    const isPendiente = novedad.estado === 0;
    const isAprobada = novedad.estado === 1;
    const cardBg = isPendiente ? 'bg-white border-yellow-200' : isAprobada ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

    // Estado local para el formulario de aplicar cambio
    const [applyData, setApplyData] = React.useState({ text: '', user: '', measure: '', qty: '' });

    const handleApply = () => {
        onApplyChange(novedad, applyData);
    };

    return (
        <div className={`border rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${cardBg}`}>
            {/* Header de la tarjeta */}
            <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 select-none"
                onClick={() => onToggle(novedad.id)}
                role="button"
            >
                {/* Ícono tipo */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {novedad.tipo === 0 ? <Calendar size={18} className="text-blue-600" /> :
                        novedad.tipo === 1 ? <FileText size={18} className="text-purple-600" /> :
                            novedad.tipo === 2 ? <Users size={18} className="text-orange-600" /> :
                                <AlertTriangle size={18} className="text-teal-600" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIPO_COLORS[novedad.tipo] || 'bg-gray-100 text-gray-700'}`}>
                            {TIPO_LABELS[novedad.tipo] || 'Novedad'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ESTADO_COLORS[novedad.estado] || ''}`}>
                            {novedad.estadoNombre}
                        </span>
                        {novedad.hallazgoRef && (
                            <span className="text-xs text-gray-500">Ref: <strong>{novedad.hallazgoRef}</strong></span>
                        )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{novedad.accion || '—'}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        <span>📋 {novedad.dependencia || 'N/A'}</span>
                        <span>👤 {novedad.solicitante || 'N/A'}</span>
                        <span>🗓️ Solicitado: {fmtDate(novedad.fechaSolicitud)}</span>
                    </div>
                </div>

                {expanded === novedad.id ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
            </div>

            {/* Detalle expandido */}
            {expanded === novedad.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50/50 space-y-4">
                    {/* Info de la solicitud */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Justificación</p>
                            <p className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 leading-relaxed">
                                {novedad.justificacion || '—'}
                            </p>
                        </div>
                        <div className="space-y-2">
                            {novedad.tipo === 0 && (
                                <>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Fecha Actual</p>
                                        <p className="text-sm font-semibold text-gray-800">{fmtDate(novedad.fechaFinActual)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Fecha Propuesta</p>
                                        <p className="text-sm font-bold text-blue-700">{fmtDate(novedad.fechaPropuesta)}</p>
                                    </div>
                                </>
                            )}
                            {novedad.estado !== 0 && novedad.revisor && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Resuelto por</p>
                                    <p className="text-sm text-gray-700">{novedad.revisor} — {fmtDate(novedad.fechaResolucion)}</p>
                                </div>
                            )}
                            {novedad.observacionesResolucion && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Observaciones de Resolución</p>
                                    <p className="text-sm text-gray-700 italic">"{novedad.observacionesResolucion}"</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botones de acción (solo si está pendiente y tiene permiso) */}
                    {isPendiente && canEdit && (
                        <div className="border-t border-gray-200 pt-4">
                            <p className="text-sm font-bold text-gray-700 mb-2">Observaciones (opcional al aprobar, obligatorio al rechazar)</p>
                            <textarea
                                value={obs || ''}
                                onChange={(e) => onObsChange(novedad.id, e.target.value)}
                                rows={2}
                                placeholder="Ingrese observaciones..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1E3A6B] focus:ring-2 focus:ring-[#1E3A6B]/10 resize-none mb-3"
                            />
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => onResolve(novedad.id, false, obs)}
                                    disabled={resolving === novedad.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                                >
                                    <XCircle size={16} /> Rechazar
                                </button>
                                <button
                                    onClick={() => onResolve(novedad.id, true, obs)}
                                    disabled={resolving === novedad.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                                >
                                    <CheckCircle size={16} />
                                    {resolving === novedad.id ? 'Guardando...' : 'Aprobar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Fomulario para APLICAR CAMBIO (Aprobadas, no-prorroga, con permiso) */}
                    {isAprobada && canEdit && novedad.tipo !== 0 && (
                        <div className="border-t border-gray-200 pt-4 mt-4 bg-white p-4 rounded-xl shadow-inner border border-blue-100">
                            <p className="text-sm font-black text-csj-azul flex items-center gap-2 mb-3">
                                <AlertTriangle size={16} className="text-blue-500" />
                                Aplicar Cambio Aprobado
                            </p>
                            <p className="text-xs text-gray-600 mb-4 font-cairo">
                                Esta novedad ha sido aprobada. Ejecute el cambio manual en el plan de acción ingresando los nuevos datos a continuación:
                            </p>

                            <div className="space-y-3">
                                {novedad.tipo === 1 && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Nueva Descripción de la Acción</label>
                                        <textarea
                                            value={applyData.text}
                                            onChange={(e) => setApplyData({ ...applyData, text: e.target.value })}
                                            className="input-csj w-full mt-1 text-sm py-2 px-3"
                                            rows={2}
                                            placeholder="Ingrese el nuevo texto..."
                                        />
                                    </div>
                                )}
                                {novedad.tipo === 2 && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Nuevo Responsable</label>
                                        <select
                                            value={applyData.user}
                                            onChange={(e) => setApplyData({ ...applyData, user: e.target.value })}
                                            className="input-csj w-full mt-1 text-sm py-2 px-3 focus:border-[#359946]"
                                        >
                                            <option value="">-- Seleccione el nuevo responsable --</option>
                                            {usuariosRoles.map((role) => (
                                                <optgroup key={role.id} label={role.nombre}>
                                                    {role.usuarios && role.usuarios.map((usr) => (
                                                        <option key={usr.id} value={usr.id}>
                                                            {usr.nombre} ({usr.dependencia || 'Sin dependencia'})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {novedad.tipo === 3 && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Nueva U. de Medida</label>
                                            <input
                                                type="text"
                                                value={applyData.measure}
                                                onChange={(e) => setApplyData({ ...applyData, measure: e.target.value })}
                                                className="input-csj w-full mt-1 text-sm py-2 px-3"
                                                placeholder="Ej. Informes"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Nueva Cantidad</label>
                                            <input
                                                type="number"
                                                value={applyData.qty}
                                                onChange={(e) => setApplyData({ ...applyData, qty: e.target.value })}
                                                className="input-csj w-full mt-1 text-sm py-2 px-3"
                                                placeholder="Ej. 4"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleApply}
                                        disabled={applying === novedad.id || (!applyData.text && !applyData.user && (!applyData.measure || !applyData.qty))}
                                        className="btn-primary flex items-center justify-center gap-2 py-2 px-4 text-xs mt-2"
                                    >
                                        <CheckCircle size={14} />
                                        {applying === novedad.id ? 'Aplicando...' : 'Aplicar en el Plan de Acción'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
const NovedadesPage = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { tab, accionesPendientes, novedades, loading, error, expanded, resolving, applying, resolvingObs, successMsg, usuariosRoles } = state;
    const { canEdit } = usePermissions('novedades');

    const loadData = useCallback(async (currentTab) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            if (currentTab === 'acciones') {
                const [data, roles] = await Promise.all([
                    fetchAprobacionesPendientes(),
                    fetchUsuariosRoles()
                ]);
                dispatch({ type: 'SET_ACCIONES', payload: data.acciones || [] });
                dispatch({ type: 'SET_USUARIOS_ROLES', payload: Array.isArray(roles) ? roles : [] });
            } else {
                const estado = currentTab === 'pendientes' ? 0 : currentTab === 'aprobadas' ? 1 : 2;
                const [data, roles] = await Promise.all([
                    fetchNovedades(estado),
                    // Solo fetch routes users if we need to apply a new responsible
                    estado === 1 ? fetchUsuariosRoles() : Promise.resolve([])
                ]);
                dispatch({ type: 'SET_NOVEDADES', payload: Array.isArray(data) ? data : [] });
                if (estado === 1) {
                    dispatch({ type: 'SET_USUARIOS_ROLES', payload: Array.isArray(roles) ? roles : [] });
                }
            }
        } catch {
            dispatch({ type: 'SET_ERROR', payload: 'Error al cargar los datos.' });
        }
    }, []);

    useEffect(() => {
        loadData(tab);
    }, [tab, loadData]);

    const handleResolveAccion = async (accionId, aprobada) => {
        dispatch({ type: 'SET_RESOLVING', payload: accionId });
        try {
            await resolverAprobacion('Accion', accionId, {
                aprobada,
                observaciones: aprobada ? 'Aprobada por Auditor desde módulo centralizado' : 'Rechazada por Auditor'
            });
            dispatch({ type: 'SET_SUCCESS', payload: aprobada ? '✅ Plan de Acción aprobado.' : '❌ Plan de Acción rechazado.' });
            loadData(tab);
            setTimeout(() => dispatch({ type: 'SET_SUCCESS', payload: '' }), 4000);
        } catch {
            alert('Error al procesar el plan de acción.');
        } finally {
            dispatch({ type: 'SET_RESOLVING', payload: null });
        }
    };

    const handleResolveNovedad = async (novedadId, aprobado, observaciones) => {
        if (!aprobado && !observaciones?.trim()) {
            alert('Debe ingresar observaciones al rechazar una novedad.');
            return;
        }
        dispatch({ type: 'SET_RESOLVING', payload: novedadId });
        try {
            await resolverNovedad(novedadId, { aprobado, observaciones });
            dispatch({ type: 'SET_SUCCESS', payload: aprobado ? '✅ Novedad aprobada correctamente.' : '❌ Novedad rechazada.' });
            loadData(tab);
            setTimeout(() => dispatch({ type: 'SET_SUCCESS', payload: '' }), 4000);
        } catch {
            alert('Error al procesar la novedad.');
        } finally {
            dispatch({ type: 'SET_RESOLVING', payload: null });
        }
    };

    const handleApplyChange = async (novedad, applyData) => {
        dispatch({ type: 'SET_APPLYING', payload: novedad.id });
        try {
            // Fetch la acción actual para obtener su estado base (updateAccion requiere algunos campos)
            const currentAccion = await fetchAccionById(novedad.accionId);
            if (!currentAccion) throw new Error('No se pudo cargar la acción en BD.');

            const payload = {
                RootCauseId: currentAccion.causa_id,
                TaskDescription: novedad.tipo === 1 ? applyData.text : currentAccion.accion,
                ResponsibleUserId: novedad.tipo === 2 ? applyData.user : currentAccion.responsableUserId,
                ExpectedOutcome: currentAccion.descripcionMetas,
                UnitOfMeasureName: novedad.tipo === 3 ? applyData.measure : currentAccion.denominacionUnidad,
                TargetQuantity: novedad.tipo === 3 ? parseInt(applyData.qty) : currentAccion.entregablesTotales,
                StartDate: currentAccion.fechaInicio,
                TargetCompletionDate: currentAccion.fechaFin
            };

            await updateAccion(novedad.accionId, payload);
            dispatch({ type: 'SET_SUCCESS', payload: '✅ Cambio aplicado correctamente al Plan de Acción.' });
            // Optional: you could call a backend hook here to close the ModificationRequest
            setTimeout(() => dispatch({ type: 'SET_SUCCESS', payload: '' }), 4000);
            dispatch({ type: 'TOGGLE_EXPANDED', payload: null }); // Collapse to clear UI
        } catch (error) {
            console.error(error);
            alert('Error al aplicar el cambio: ' + (error.message || ''));
        } finally {
            dispatch({ type: 'SET_APPLYING', payload: null });
        }
    };

    const hasData = tab === 'acciones' ? accionesPendientes.length > 0 : novedades.length > 0;

    const TABS = [
        { key: 'acciones', label: 'Planes Pendientes', icon: <ListTodo size={15} /> },
        { key: 'pendientes', label: 'Novedades', icon: <Clock size={15} /> },
        { key: 'aprobadas', label: 'Novedades Aprobadas', icon: <CheckCircle size={15} /> },
        { key: 'rechazadas', label: 'Novedades Rechazadas', icon: <XCircle size={15} /> },
    ];

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            {/* Encabezado */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-[#1E3A6B] rounded-xl flex items-center justify-center">
                        <Filter size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 font-montserrat">Central de Aprobaciones</h1>
                        <p className="text-sm text-gray-500 font-cairo">Gestión de Planes de Acción y Novedades sobre los mismos</p>
                    </div>
                </div>
            </div>

            {/* Mensaje de éxito */}
            {successMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-medium flex items-center gap-2">
                    <CheckCircle size={16} /> {successMsg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit flex-wrap">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => dispatch({ type: 'SET_TAB', payload: t.key })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${tab === t.key
                            ? 'bg-white text-[#1E3A6B] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <svg className="animate-spin w-8 h-8 mr-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cargando información...
                </div>
            ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {error}
                </div>
            ) : !hasData ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium font-cairo">
                        No hay registros en esta sección.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tab === 'acciones' && accionesPendientes.map(accion => (
                        <AccionCard
                            key={accion.id}
                            accion={accion}
                            onResolve={handleResolveAccion}
                            resolving={resolving}
                        />
                    ))}

                    {tab !== 'acciones' && novedades.map(novedad => (
                        <NovedadCard
                            key={novedad.id}
                            novedad={novedad}
                            expanded={expanded}
                            onToggle={(id) => dispatch({ type: 'TOGGLE_EXPANDED', payload: id })}
                            onResolve={handleResolveNovedad}
                            resolving={resolving}
                            obs={resolvingObs[novedad.id]}
                            onObsChange={(id, value) => dispatch({ type: 'SET_OBS', id, value })}
                            canEdit={canEdit}
                            usuariosRoles={usuariosRoles}
                            applying={applying}
                            onApplyChange={handleApplyChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default NovedadesPage;
