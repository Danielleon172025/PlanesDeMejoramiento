import React, { useEffect, useState } from 'react';
import { fetchHistorial } from '../services/api';
import { History, ArrowRight, User, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const HistoryViewer = ({ hallazgoId, accionId, causaId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            try {
                const data = await fetchHistorial({ hallazgoId, accionId, causaId });
                setHistory(data);
            } catch (error) {
                console.error('Error loading history:', error);
            } finally {
                setLoading(false);
            }
        };

        if (hallazgoId || accionId || causaId) {
            loadHistory();
        }
    }, [hallazgoId, accionId, causaId]);

    if (loading) {
        return <div className="p-4 text-center text-gray-500 font-cairo">Cargando historial...</div>;
    }

    if (history.length === 0) {
        return (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <History className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500 font-cairo">No hay historial registrado</p>
            </div>
        );
    }

    const getDiff = (item) => {
        const changes = [];
        
        if (item.hallazgo_anterior !== item.hallazgo_nuevo) {
            changes.push({ label: 'Hallazgo', old: item.hallazgo_anterior, new: item.hallazgo_nuevo });
        }
        if (item.causa_anterior !== item.causa_nueva) {
            changes.push({ label: 'Causa', old: item.causa_anterior, new: item.causa_nueva });
        }
        if (item.accion_anterior !== item.accion_nueva) {
            changes.push({ label: 'Acción', old: item.accion_anterior, new: item.accion_nueva });
        }

        return changes;
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 font-montserrat flex items-center gap-2">
                <History size={20} className="text-csj-azul" />
                Historial de Cambios
            </h3>
            
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-2">
                {history.map((item, index) => {
                    const changes = getDiff(item);
                    
                    return (
                        <div key={item.id} className="ml-6 relative">
                            {/* Dot */}
                            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-csj-azul border-2 border-white shadow-sm"></div>
                            
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold font-cairo bg-blue-50 text-csj-azul border border-blue-100 uppercase tracking-wider">
                                            {item.tipo.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-xs text-gray-400 font-cairo flex items-center gap-1">
                                            <Calendar size={12} />
                                            {format(new Date(item.fecha), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 font-cairo bg-gray-50 px-2 py-1 rounded">
                                        <User size={12} />
                                        {item.usuario || 'Sistema'}
                                    </div>
                                </div>

                                {changes.length > 0 ? (
                                    <div className="space-y-3 mt-3">
                                        {changes.map((change, idx) => (
                                            <div key={idx} className="text-sm font-cairo bg-gray-50 p-3 rounded border border-gray-100">
                                                <p className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                                                    <FileText size={12} /> 
                                                    {change.label}
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-2 items-center">
                                                    <div className="bg-red-50 text-red-700 p-2 rounded text-xs line-through opacity-75">
                                                        {change.old || '(Vacío)'}
                                                    </div>
                                                    <ArrowRight size={14} className="text-gray-400 mx-auto transform rotate-90 md:rotate-0" />
                                                    <div className="bg-green-50 text-green-700 p-2 rounded text-xs font-semibold">
                                                        {change.new || '(Vacío)'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 font-cairo italic">
                                        No se registraron cambios específicos en los campos de texto principal.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HistoryViewer;
