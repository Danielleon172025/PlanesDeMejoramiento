import React, { useEffect, useReducer } from 'react';
import { fetchTimeline, evaluateProgressLog, replyToProgressLog } from '../services/api';
import {
    Clock, CheckCircle2, AlertTriangle, FileText,
    Calendar, User, Eye, MessageSquare, CheckSquare,
    Download, Check, MessageCircle, CornerDownRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

/* ─── Config visual by event type ───────────────────────── */
const TYPE_CFG = {
    evaluacion: {
        icon: <CheckCircle2 size={15} className="text-white" />,
        dotBg: 'bg-csj-verde', badge: 'bg-csj-verde text-white',
        border: 'border-l-4 border-csj-verde', label: 'Avance del Líder',
    },
    novedad: {
        icon: <AlertTriangle size={15} className="text-white" />,
        dotBg: 'bg-yellow-500', badge: 'bg-yellow-500 text-white',
        border: 'border-l-4 border-yellow-400', label: 'Novedad / Modificación',
    },
    historico: {
        icon: <Clock size={15} className="text-white" />,
        dotBg: 'bg-gray-400', badge: 'bg-gray-400 text-white',
        border: 'border-l-4 border-gray-300', label: 'Histórico',
    },
    observacion: {
        icon: <Eye size={15} className="text-white" />,
        dotBg: 'bg-red-500', badge: 'bg-red-500 text-white',
        border: 'border-l-4 border-red-400', label: '🔍 Observación del Auditor',
    },
    replica: {
        icon: <MessageSquare size={15} className="text-white" />,
        dotBg: 'bg-blue-500', badge: 'bg-blue-500 text-white',
        border: 'border-l-4 border-blue-400', label: '💬 Réplica del Líder',
    },
    conclusion: {
        icon: <CheckSquare size={15} className="text-white" />,
        dotBg: 'bg-csj-verde', badge: 'bg-csj-verde text-white',
        border: 'border-l-4 border-csj-verde', label: '✅ Conclusión del Auditor',
    },
};

const DEFAULT_CFG = {
    icon: <FileText size={15} className="text-white" />,
    dotBg: 'bg-gray-400', badge: 'bg-gray-400 text-white',
    border: 'border-l-4 border-gray-300', label: 'Evento',
};

// Child event types — will be nested under their parent evaluacion
const CHILD_TYPES = new Set(['observacion', 'replica', 'conclusion']);

/* ─── Group flat array into threads ─────────────────────── */
const groupIntoThreads = (events) => {
    // Root-level events keyed by their id
    const roots = new Map();       // id → { ...event, children: [] }
    const orphans = [];

    // First pass: identify roots (evaluacion, novedad, historico)
    for (const ev of events) {
        if (!CHILD_TYPES.has(ev.tipo)) {
            roots.set(ev.id, { ...ev, children: [] });
        }
    }

    // Second pass: attach children (share same id / logId)
    for (const ev of events) {
        if (CHILD_TYPES.has(ev.tipo)) {
            const parent = roots.get(ev.logId ?? ev.id);
            if (parent) {
                parent.children.push(ev);
            } else {
                orphans.push({ ...ev, children: [] });
            }
        }
    }

    // Sort children chronologically within each thread
    for (const root of roots.values()) {
        root.children.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    }

    const all = [...roots.values(), ...orphans];
    return all.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
};

const initialState = {
    events: [],
    loading: true,
    evaluatingId: null,
    observacionData: '',
    submittingEval: false,
    replyingId: null,
    replicaData: '',
    submittingReply: false
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_EVENTS': return { ...state, events: action.payload, loading: false };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_EVALUATING_ID': return { ...state, evaluatingId: action.payload, observacionData: '' };
        case 'SET_OBSERVACION_DATA': return { ...state, observacionData: action.payload };
        case 'SET_SUBMITTING_EVAL': return { ...state, submittingEval: action.payload };
        case 'SET_REPLYING_ID': return { ...state, replyingId: action.payload, replicaData: '' };
        case 'SET_REPLICA_DATA': return { ...state, replicaData: action.payload };
        case 'SET_SUBMITTING_REPLY': return { ...state, submittingReply: action.payload };
        case 'RESET_FORMS': return {
            ...state,
            evaluatingId: null, observacionData: '', submittingEval: false,
            replyingId: null, replicaData: '', submittingReply: false
        };
        default: return state;
    }
};

/* ─── Main Component ─── */
const Timeline = ({ accionId }) => {
    const { user } = useAuth();
    const { canEdit: canEvaluate } = usePermissions('seguimientos');
    const { canCreate: canReplica } = usePermissions('replicas');
    const { canEdit: canObservarReplica } = usePermissions('replicas');

    const [state, dispatch] = useReducer(reducer, initialState);
    const {
        events, loading, evaluatingId, observacionData, submittingEval,
        replyingId, replicaData, submittingReply
    } = state;

    const loadTimeline = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await fetchTimeline(accionId);
            dispatch({ type: 'SET_EVENTS', payload: groupIntoThreads(data) });
        } catch (err) {
            console.error('Error loading timeline:', err);
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    useEffect(() => { if (accionId) loadTimeline(); }, [accionId]);

    const handleEvaluateSubmit = async (logId, isConclusion = false) => {
        if (!observacionData.trim() && !isConclusion) {
            alert('Debe ingresar una observación.'); return;
        }
        try {
            dispatch({ type: 'SET_SUBMITTING_EVAL', payload: true });
            await evaluateProgressLog(accionId, logId, {
                observaciones: isConclusion ? '' : observacionData,
                conclusion: isConclusion ? 'Aprobado sin observaciones / Conforme' : '',
                isConclusion,
            });
            dispatch({ type: 'RESET_FORMS' });
            loadTimeline();
        } catch (err) {
            console.error(err); alert('Error al enviar la evaluación');
            dispatch({ type: 'SET_SUBMITTING_EVAL', payload: false });
        }
    };

    const handleReplySubmit = async (logId) => {
        if (!replicaData.trim()) { alert('Debe ingresar un texto para la réplica.'); return; }
        try {
            dispatch({ type: 'SET_SUBMITTING_REPLY', payload: true });
            await replyToProgressLog(accionId, logId, replicaData);
            dispatch({ type: 'RESET_FORMS' });
            loadTimeline();
        } catch (err) {
            console.error(err); alert('Error al enviar la réplica');
            dispatch({ type: 'SET_SUBMITTING_REPLY', payload: false });
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-500 font-cairo">Cargando línea de tiempo...</div>;
    if (events.length === 0) return <div className="p-4 text-center text-gray-500 font-cairo italic">No hay registros en la línea de tiempo.</div>;





    return (
        <div className="py-2 space-y-2">
            {events.map((thread) => (
                <Thread
                    key={`${thread.tipo}-${thread.id}`}
                    thread={thread}
                    canEvaluate={canEvaluate}
                    evaluatingId={evaluatingId}
                    setEvaluatingId={(id) => dispatch({ type: 'SET_EVALUATING_ID', payload: id })}
                    observacionData={observacionData}
                    setObservacionData={(val) => dispatch({ type: 'SET_OBSERVACION_DATA', payload: val })}
                    submittingEval={submittingEval}
                    handleEvaluateSubmit={handleEvaluateSubmit}
                    canObservarReplica={canObservarReplica}
                    canReplica={canReplica}
                    replyingId={replyingId}
                    setReplyingId={(id) => dispatch({ type: 'SET_REPLYING_ID', payload: id })}
                    replicaData={replicaData}
                    setReplicaData={(val) => dispatch({ type: 'SET_REPLICA_DATA', payload: val })}
                    submittingReply={submittingReply}
                    handleReplySubmit={handleReplySubmit}
                />
            ))}
        </div>
    );
};

/* ── Single event card ── */
const EventCard = ({
    event, isChild = false,
    canEvaluate, evaluatingId, setEvaluatingId, observacionData, setObservacionData,
    submittingEval, handleEvaluateSubmit, canObservarReplica, canReplica,
    replyingId, setReplyingId, replicaData, setReplicaData, submittingReply, handleReplySubmit
}) => {
    const cfg = TYPE_CFG[event.tipo] || DEFAULT_CFG;
    return (
        <div className={`flex gap-3 group ${isChild ? 'mt-3' : ''}`}>
            {/* Dot */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${cfg.dotBg} flex items-center justify-center border-4 border-white shadow-sm mt-1 group-hover:scale-110 transition-transform z-10`}>
                {cfg.icon}
            </div>

            {/* Card */}
            <div className={`flex-1 bg-white rounded-lg shadow-sm border border-gray-100 ${cfg.border} hover:shadow-md transition-shadow`}>
                {/* Header */}
                <div className="flex justify-between items-center px-4 pt-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${cfg.badge} uppercase tracking-wider`}>
                        {cfg.label}
                    </span>
                    <div className="flex flex-col items-end">
                        {event.fecha && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Calendar size={11} />
                                {format(new Date(event.fecha), "d 'de' MMM yyyy", { locale: es })}
                            </span>
                        )}
                        {event.usuario && (
                            <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <User size={11} />{event.usuario}
                            </span>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="px-4 pb-3 pt-2">
                    <p className="text-sm text-gray-700 font-cairo leading-relaxed whitespace-pre-wrap">
                        {event.descripcion}
                    </p>

                    {event.archivo && (
                        <a
                            href={event.archivo.startsWith('/uploads') ? event.archivo : `/api/files/${event.archivo}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-gray-50 hover:bg-csj-azul/10 text-csj-azul border border-gray-200 rounded-md text-xs font-bold transition-colors shadow-sm"
                        >
                            <Download size={13} /> Descargar Adjunto
                        </a>
                    )}

                    {/* AUDITOR: evalúa avance */}
                    {canEvaluate && event.tipo === 'evaluacion' && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                            {evaluatingId !== event.id ? (
                                <div className="flex gap-3 flex-wrap items-center">
                                    <button onClick={() => setEvaluatingId(event.id)} className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                        <Eye size={13} /> Registrar Observación
                                    </button>
                                    <span className="text-gray-300 text-xs">|</span>
                                    <button onClick={() => handleEvaluateSubmit(event.id, true)} disabled={submittingEval} className="text-[11px] font-bold text-green-700 hover:text-green-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition-colors disabled:opacity-50">
                                        <Check size={13} /> Dar Conformidad al Avance
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                    <label htmlFor={`obs-${event.id}`} className="block text-[11px] font-bold text-red-800 mb-1">Su Observación:</label>
                                    <textarea id={`obs-${event.id}`} value={observacionData} onChange={(e) => setObservacionData(e.target.value)} className="w-full text-sm p-2 border border-red-200 rounded focus:ring-2 focus:ring-red-400 outline-none mb-2" rows="2" placeholder="Describa los motivos de no conformidad..." disabled={submittingEval} />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setEvaluatingId(null); setObservacionData(''); }} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded font-bold" disabled={submittingEval}>Cancelar</button>
                                        <button onClick={() => handleEvaluateSubmit(event.id, false)} className="px-3 py-1 text-xs bg-red-500 text-white hover:bg-red-600 rounded font-bold flex items-center gap-1" disabled={submittingEval}><MessageCircle size={13} />Enviar Observación</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AUDITOR: observa/concluye réplica */}
                    {canObservarReplica && event.tipo === 'replica' && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                            {evaluatingId !== event.id ? (
                                <div className="flex gap-3 flex-wrap items-center">
                                    <button onClick={() => setEvaluatingId(event.id)} className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                        <Eye size={13} /> Observar esta Réplica
                                    </button>
                                    <span className="text-gray-300 text-xs">|</span>
                                    <button onClick={() => handleEvaluateSubmit(event.id, true)} disabled={submittingEval} className="text-[11px] font-bold text-green-700 hover:text-green-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50 transition-colors">
                                        <Check size={13} /> Aceptar Réplica (Conforme)
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                    <label htmlFor={`obs-rep-${event.id}`} className="block text-[11px] font-bold text-red-800 mb-1">Su Observación a la Réplica:</label>
                                    <textarea id={`obs-rep-${event.id}`} value={observacionData} onChange={(e) => setObservacionData(e.target.value)} className="w-full text-sm p-2 border border-red-200 rounded focus:ring-2 focus:ring-red-400 outline-none mb-2" rows="2" placeholder="Describa su posición final..." disabled={submittingEval} />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setEvaluatingId(null); setObservacionData(''); }} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded font-bold" disabled={submittingEval}>Cancelar</button>
                                        <button onClick={() => handleEvaluateSubmit(event.id, false)} className="px-3 py-1 text-xs bg-red-500 text-white hover:bg-red-600 rounded font-bold flex items-center gap-1" disabled={submittingEval}><MessageCircle size={13} />Enviar Observación</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LÍDER: da réplica a una observación */}
                    {canReplica && event.tipo === 'observacion' && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                            {replyingId !== event.id ? (
                                <button onClick={() => setReplyingId(event.id)} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                                    <MessageSquare size={13} /> Dar Réplica a esta Observación
                                </button>
                            ) : (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <label htmlFor={`rep-${event.id}`} className="block text-[11px] font-bold text-blue-800 mb-1">Su Réplica / Descargo:</label>
                                    <textarea id={`rep-${event.id}`} value={replicaData} onChange={(e) => setReplicaData(e.target.value)} className="w-full text-sm p-2 border border-blue-200 rounded focus:ring-2 focus:ring-blue-400 outline-none mb-2" rows="2" placeholder="Escriba su respuesta a la observación del Auditor..." disabled={submittingReply} />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setReplyingId(null); setReplicaData(''); }} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded font-bold" disabled={submittingReply}>Cancelar</button>
                                        <button onClick={() => handleReplySubmit(event.id)} className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded font-bold flex items-center gap-1" disabled={submittingReply}><MessageSquare size={13} />Enviar Réplica</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Thread: root + nested children ── */
const Thread = ({
    thread,
    canEvaluate, evaluatingId, setEvaluatingId, observacionData, setObservacionData,
    submittingEval, handleEvaluateSubmit, canObservarReplica, canReplica,
    replyingId, setReplyingId, replicaData, setReplicaData, submittingReply, handleReplySubmit
}) => {
    const threadProps = {
        canEvaluate, evaluatingId, setEvaluatingId, observacionData, setObservacionData,
        submittingEval, handleEvaluateSubmit, canObservarReplica, canReplica,
        replyingId, setReplyingId, replicaData, setReplicaData, submittingReply, handleReplySubmit
    };

    return (
        <div className="mb-6">
            <EventCard event={thread} {...threadProps} />

            {thread.children && thread.children.length > 0 && (
                <div className="ml-10 mt-1 pl-4 border-l-2 border-dashed border-gray-200 space-y-0">
                    {thread.children.map((child) => (
                        <div key={`${child.tipo}-${child.id}`} className="relative">
                            {/* Connector arrow */}
                            <div className="absolute -left-[21px] top-5 text-gray-300">
                                <CornerDownRight size={16} />
                            </div>
                            <EventCard event={child} isChild {...threadProps} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Timeline;
