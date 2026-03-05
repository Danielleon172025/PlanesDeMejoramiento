import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import {
    ClipboardList, CheckSquare, Bell, Calendar,
    AlertTriangle, Clock, CheckCircle2, TrendingUp,
    ArrowRight, RefreshCw
} from 'lucide-react';

/* ── Quick-access module card ───────────────────────────────── */
const ModuleCard = ({ to, icon: Icon, label, description, color }) => (
    <Link
        to={to}
        className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex items-start gap-4"
    >
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
            <Icon size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 font-montserrat text-sm">{label}</h3>
            <p className="text-xs text-gray-400 font-cairo mt-0.5">{description}</p>
        </div>
        <ArrowRight size={16} className="text-gray-300 group-hover:text-[#1E3A6B] group-hover:translate-x-1 transition-all mt-1" />
    </Link>
);

/* ── KPI pill ────────────────────────────────────────────────── */
const StatPill = ({ label, value, icon: Icon, variant }) => {
    const colors = {
        blue: 'bg-[#1E3A6B]/10 text-[#1E3A6B]',
        green: 'bg-[#359946]/10 text-[#359946]',
        amber: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-600',
    };
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${colors[variant]}`}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-xs text-gray-400 font-cairo uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-black text-gray-800 font-montserrat leading-tight">{value}</p>
            </div>
        </div>
    );
};

const fetchDashboardKpis = async (userId) => {
    const res = await fetch('/api/dashboard/mis-kpis', {
        headers: { 'x-user-id': userId }
    });
    return res.ok ? res.json() : null;
};

/* ── Main Component ─────────────────────────────────────────── */
export default function UserHome() {
    const { user } = useAuth();
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);

    const canAccess = {
        hallazgos: usePermissions('hallazgos').canView,
        acciones: usePermissions('acciones').canView,
        novedades: usePermissions('novedades').canView,
        seguimientos: usePermissions('seguimientos').canView,
    };

    useEffect(() => {
        const userId = user?.id;
        if (!userId) { setLoading(false); return; }

        let isMounted = true;
        fetchDashboardKpis(userId)
            .then(data => { if (isMounted) setKpis(data); })
            .catch(() => { })
            .finally(() => { if (isMounted) setLoading(false); });

        return () => { isMounted = false; };
    }, [user?.id]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">

            {/* Welcome banner */}
            <div className="bg-gradient-to-r from-[#1E3A6B] to-[#1a3060] rounded-2xl p-6 text-white shadow-lg">
                <p className="text-white/60 text-sm font-cairo mb-1">{greeting},</p>
                <h1 className="text-2xl font-black font-montserrat mb-1">
                    {user?.nombre || 'Usuario'}
                </h1>
                <p className="text-white/70 text-sm font-cairo">
                    {user?.rol} · {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* KPI summary row */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <RefreshCw className="animate-spin text-[#359946]" size={24} />
                </div>
            ) : kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatPill label="Total Acciones" value={kpis.total_acciones ?? '—'} icon={ClipboardList} variant="blue" />
                    <StatPill label="Cerradas" value={kpis.acciones_cerradas ?? '—'} icon={CheckCircle2} variant="green" />
                    <StatPill label="Próximas a Vencer" value={kpis.acciones_proximas ?? '—'} icon={Clock} variant="amber" />
                    <StatPill label="Vencidas" value={kpis.acciones_vencidas ?? '—'} icon={AlertTriangle} variant="red" />
                </div>
            )}

            {/* Quick access modules */}
            <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-montserrat mb-3">
                    Acceso rápido
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {canAccess.hallazgos && (
                        <ModuleCard
                            to="/hallazgos"
                            icon={ClipboardList}
                            label="Planes de Mejoramiento"
                            description="Ver y gestionar hallazgos activos"
                            color="bg-[#1E3A6B]"
                        />
                    )}
                    {canAccess.acciones && (
                        <ModuleCard
                            to="/acciones"
                            icon={CheckSquare}
                            label="Planes de Acción"
                            description="Acciones asignadas a tu perfil"
                            color="bg-[#359946]"
                        />
                    )}
                    {canAccess.novedades && (
                        <ModuleCard
                            to="/modulos/aprobaciones"
                            icon={Bell}
                            label="Novedades y Aprobaciones"
                            description="Solicitudes y notificaciones pendientes"
                            color="bg-amber-500"
                        />
                    )}
                    {canAccess.acciones && (
                        <ModuleCard
                            to="/acciones/calendario"
                            icon={Calendar}
                            label="Calendario de Acciones"
                            description="Vista de fechas y vencimientos"
                            color="bg-purple-600"
                        />
                    )}
                </div>
                {!Object.values(canAccess).some(Boolean) && (
                    <div className="text-center py-12 text-gray-400">
                        <TrendingUp size={40} className="mx-auto mb-2 opacity-30" />
                        <p className="font-cairo text-sm">Sin módulos asignados. Contacta al Administrador.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
