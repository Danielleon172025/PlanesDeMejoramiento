import React, { useEffect, useState } from 'react';
import {
    fetchModulosResumen,
    fetchNotificaciones,
} from '../services/api';

const StatCard = ({ title, value }) => (
    <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-csj-azul">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-cairo">{title}</p>
        <p className="text-2xl font-black text-csj-azul font-montserrat mt-1">{value}</p>
    </div>
);

const ModulosCenter = () => {
    const [loading, setLoading] = useState(true);
    const [resumen, setResumen] = useState({});
    const [notificaciones, setNotificaciones] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resumenData, notificacionesData] = await Promise.all([
                fetchModulosResumen(),
                fetchNotificaciones(),
            ]);

            setResumen(resumenData || {});
            setNotificaciones(notificacionesData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-csj-azul font-montserrat">Centro de Módulos</h2>
                <p className="text-gray-600 font-cairo mt-1">
                    Resumen general de gestión y alertas del sistema.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <StatCard title="Hallazgos" value={resumen.hallazgos || 0} />
                <StatCard title="Causas" value={resumen.causas || 0} />
                <StatCard title="Acciones" value={resumen.acciones || 0} />
                <StatCard title="Evaluaciones" value={resumen.evaluaciones || 0} />
                <StatCard title="Pend. Aprobación" value={resumen.acciones_pendientes_aprobacion || 0} />
                <StatCard title="Novedades Pend." value={resumen.novedades_pendientes || 0} />
                <StatCard title="Usuarios" value={resumen.usuarios || 0} />
            </div>

            <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="text-lg font-black text-csj-azul font-montserrat mb-4">Notificaciones Recientes</h3>
                <div className="space-y-2 max-h-80 overflow-auto">
                    {notificaciones.length === 0 && <p className="text-gray-500 font-cairo">Sin notificaciones.</p>}
                    {notificaciones.map((item) => (
                        <div key={`${item.tipo}-${item.id}`} className="border-l-4 border-csj-amarillo bg-gray-50 p-3 rounded-r-lg">
                            <p className="text-xs text-gray-500 font-cairo uppercase">{item.tipo}</p>
                            <p className="font-bold text-sm text-gray-700 font-montserrat">{item.titulo}</p>
                            <p className="text-sm text-gray-600 font-cairo">{item.descripcion}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ModulosCenter;

