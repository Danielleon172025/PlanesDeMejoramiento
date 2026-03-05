import React, { useReducer, useEffect, useCallback } from 'react';
import { Shield, Save, RefreshCw, Check, ChevronDown } from 'lucide-react';

const API = '/api/permisos';

const MODULES = [
    { key: 'dashboard', label: 'Dashboard Ejecutivo' },
    { key: 'hallazgos', label: 'Planes de Mejoramiento' },
    { key: 'acciones', label: 'Planes de Acción' },
    { key: 'seguimientos', label: 'Seguimientos / Avances' },
    { key: 'replicas', label: 'Réplicas Líder ↔ Auditor' },
    { key: 'novedades', label: 'Novedades / Aprobaciones' },
    { key: 'reportes', label: 'Reportes y Exportaciones' },
    { key: 'calendario', label: 'Calendario' },
    { key: 'usuarios', label: 'Gestión de Usuarios' },
    { key: 'permisos', label: 'Roles y Permisos' },
    { key: 'config', label: 'Configuración' },
];

const ACCIONES = [
    { key: 'ver', label: 'Ver' },
    { key: 'crear', label: 'Crear / Registrar' },
    { key: 'editar', label: 'Editar / Evaluar' },
    { key: 'eliminar', label: 'Eliminar' },
];

/* ── Big Toggle ──────────────────────────────────────────────────── */
const Toggle = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        style={checked ? { backgroundColor: '#359946' } : {}}
        className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#359946]
            ${checked ? '' : 'bg-gray-200'}
            ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <span
            className={`inline-block h-6 w-6 rounded-sm bg-white shadow-md transform transition-transform duration-200
                ${checked ? 'translate-x-7' : 'translate-x-1'}`}
        />
    </button>
);

const initialState = {
    roles: [],
    permissions: [],
    assigned: {},
    selectedRole: null,
    dirty: false,
    saving: false,
    loading: true,
    toast: null
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'LOAD_START': return { ...state, loading: true };
        case 'LOAD_SUCCESS': return {
            ...state, loading: false, roles: action.roles, permissions: action.permissions,
            assigned: action.assigned, selectedRole: action.selectedRole, dirty: false
        };
        case 'LOAD_ERROR': return { ...state, loading: false, toast: action.toast };
        case 'SET_ROLE': return { ...state, selectedRole: action.selectedRole };
        case 'TOGGLE_PERMISSION': return { ...state, assigned: action.assigned, dirty: true };
        case 'SAVE_START': return { ...state, saving: true };
        case 'SAVE_SUCCESS': return { ...state, saving: false, dirty: false, toast: { msg: 'Permisos guardados', ok: true } };
        case 'SAVE_ERROR': return { ...state, saving: false, toast: action.toast };
        case 'SHOW_TOAST': return { ...state, toast: action.toast };
        case 'HIDE_TOAST': return { ...state, toast: null };
        default: return state;
    }
};

/* ── Main ──────────────────────────────────────────────────────────── */
export default function PermisosPage() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { roles, permissions, assigned, selectedRole, dirty, saving, loading, toast } = state;

    const userId = JSON.parse(localStorage.getItem('siapoas_user') || '{}')?.id;

    const showToast = (msg, ok = true) => {
        dispatch({ type: 'SHOW_TOAST', toast: { msg, ok } });
        setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3000);
    };

    const loadData = useCallback(async () => {
        dispatch({ type: 'LOAD_START' });
        try {
            const res = await fetch(API, { headers: { 'x-user-id': userId } });
            const data = await res.json();

            const map = {};
            for (const { RoleId, PermissionId } of (data.assigned || [])) {
                if (!map[RoleId]) map[RoleId] = new Set();
                map[RoleId].add(PermissionId);
            }

            dispatch({
                type: 'LOAD_SUCCESS',
                roles: data.roles || [],
                permissions: data.permissions || [],
                assigned: map,
                selectedRole: data.roles?.length ? data.roles[0] : null
            });
        } catch {
            showToast('Error al cargar los permisos', false);
        }
    }, [userId]);

    useEffect(() => { loadData(); }, [loadData]);

    const isChecked = (modKey, actionKey) => {
        if (!selectedRole) return false;
        const p = permissions.find(p => p.Name === `${modKey}.${actionKey}`);
        return p ? (assigned[selectedRole.Id] || new Set()).has(p.Id) : false;
    };

    const toggle = (modKey, actionKey) => {
        const p = permissions.find(p => p.Name === `${modKey}.${actionKey}`);
        if (!p || !selectedRole) return;

        const newAssigned = { ...assigned };
        const s = new Set(newAssigned[selectedRole.Id] || []);
        if (s.has(p.Id)) s.delete(p.Id); else s.add(p.Id);
        newAssigned[selectedRole.Id] = s;

        dispatch({ type: 'TOGGLE_PERMISSION', assigned: newAssigned });
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        dispatch({ type: 'SAVE_START' });
        try {
            const ids = [...(assigned[selectedRole.Id] || [])];
            const res = await fetch(`${API}/${selectedRole.Id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ permissionIds: ids }),
            });
            if (!res.ok) throw new Error();
            dispatch({ type: 'SAVE_SUCCESS' });
            setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3000);
        } catch {
            dispatch({ type: 'SAVE_ERROR', toast: { msg: 'Error al guardar los permisos', ok: false } });
            setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3000);
        }
    };

    /* ── Loading ─────────────────────────────────────────────────── */
    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3">
            <RefreshCw className="animate-spin text-blue-500" size={28} />
            <span className="text-gray-400 font-cairo text-sm">Cargando permisos…</span>
        </div>
    );

    /* ── View ──────────────────────────────────────────────────────── */
    return (
        <div className="max-w-3xl mx-auto space-y-5">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white
                    ${toast.ok ? 'bg-green-500' : 'bg-red-500'}`}>
                    {toast.ok && <Check size={15} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1E3A6B] rounded-xl">
                    <Shield size={18} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[#1E3A6B] font-montserrat">
                        Permisos — {selectedRole?.Name ?? ''}
                    </h2>
                    <p className="text-xs text-gray-400 font-cairo">
                        Configura qué puede hacer este perfil en cada módulo.
                    </p>
                </div>
            </div>

            {/* Role selector */}
            <div className="relative w-64">
                <select
                    value={selectedRole?.Id ?? ''}
                    onChange={e => {
                        const r = roles.find(r => r.Id === e.target.value);
                        dispatch({ type: 'SET_ROLE', selectedRole: r });
                    }}
                    className="w-full appearance-none border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 text-sm font-semibold text-[#1E3A6B] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-montserrat cursor-pointer"
                >
                    {roles.map(r => (
                        <option key={r.Id} value={r.Id}>{r.Name}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Permissions table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="w-10 px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Módulo</th>
                            {ACCIONES.map(a => (
                                <th key={a.key} className="px-5 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    {a.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {MODULES.map((mod, idx) => (
                            <tr key={mod.key} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-5 py-4 text-gray-400 text-sm font-cairo">{idx + 1}</td>
                                <td className="px-5 py-4 font-semibold text-gray-700 font-cairo">{mod.label}</td>
                                {ACCIONES.map(accion => {
                                    const perm = permissions.find(p => p.Name === `${mod.key}.${accion.key}`);
                                    return (
                                        <td key={accion.key} className="px-5 py-4 text-center">
                                            <div className="flex justify-center">
                                                <Toggle
                                                    checked={isChecked(mod.key, accion.key)}
                                                    disabled={!perm}
                                                    onChange={() => toggle(mod.key, accion.key)}
                                                />
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer actions */}
            <div className="flex justify-center gap-3 pt-2">
                <button
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold font-montserrat text-white transition shadow-sm
                        ${dirty ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    Guardar
                </button>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold font-montserrat text-white bg-red-500 hover:bg-red-600 transition shadow-sm shadow-red-200"
                >
                    <RefreshCw size={14} />
                    Recargar
                </button>
            </div>
        </div>
    );
}
