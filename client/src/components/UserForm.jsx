import React, { useReducer, useEffect } from 'react';
import { User, Shield, Briefcase, Save, X, AlertCircle, Edit } from 'lucide-react';
import { fetchRoles, createUser, updateUsuario, fetchDependencias } from '../services/api';

const initialState = {
    formData: {
        username: '',
        nombre: '',
        password: '',
        roleId: '',
        dependenciaId: '',
        email: ''
    },
    roles: [],
    dependencias: [],
    loading: false,
    submitting: false,
    error: null
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'FETCH_START': return { ...state, loading: true };
        case 'FETCH_SUCCESS': return { ...state, loading: false, roles: action.roles, dependencias: action.dependencias, formData: action.formData || state.formData };
        case 'FETCH_ERROR': return { ...state, loading: false, error: action.error };
        case 'FIELD_CHANGE': return { ...state, formData: { ...state.formData, [action.name]: action.value } };
        case 'SUBMIT_START': return { ...state, submitting: true, error: null };
        case 'SUBMIT_SUCCESS': return { ...state, submitting: false };
        case 'SUBMIT_ERROR': return { ...state, submitting: false, error: action.error };
        default: return state;
    }
};

const UserForm = ({ user: editingUser, onClose, onSave }) => {
    const isEditMode = Boolean(editingUser);
    const [state, dispatch] = useReducer(reducer, initialState);
    const { formData, roles, dependencias, loading, submitting, error } = state;

    useEffect(() => {
        const loadInitialData = async () => {
            dispatch({ type: 'FETCH_START' });
            try {
                const [rolesData, depsData] = await Promise.all([
                    fetchRoles(),
                    fetchDependencias()
                ]);

                let initialFormData = undefined;
                // Si estamos en modo edición, pre-rellenamos los campos
                if (editingUser) {
                    initialFormData = {
                        username: editingUser.username || '',
                        nombre: editingUser.nombre || '',
                        password: '', // No exponemos la contraseña actual
                        roleId: editingUser.role_id || '',
                        dependenciaId: editingUser.dependencia_id || '',
                        email: editingUser.email || ''
                    };
                }

                dispatch({
                    type: 'FETCH_SUCCESS',
                    roles: rolesData || [],
                    dependencias: depsData || [],
                    formData: initialFormData
                });
            } catch (err) {
                console.error("Error loading data", err);
                dispatch({ type: 'FETCH_ERROR', error: 'Error al cargar datos' });
            }
        };
        loadInitialData();
    }, [editingUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        dispatch({ type: 'FIELD_CHANGE', name, value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch({ type: 'SUBMIT_START' });

        try {
            if (isEditMode) {
                await updateUsuario(editingUser.user_id, {
                    nombre: formData.nombre,
                    roleId: formData.roleId,
                    dependenciaId: formData.dependenciaId,
                    email: formData.email
                });
            } else {
                await createUser(formData);
            }
            dispatch({ type: 'SUBMIT_SUCCESS' });
            onSave();
        } catch (err) {
            console.error(err);
            dispatch({
                type: 'SUBMIT_ERROR',
                error: isEditMode
                    ? 'Error al actualizar usuario. Verifique los datos.'
                    : 'Error al crear usuario. Verifique los datos.'
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-csj-azul to-[#1b3a6e] p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold font-montserrat flex items-center gap-2">
                        {isEditMode ? <Edit size={24} /> : <User size={24} />}
                        {isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label htmlFor="userform-username" className="label-csj flex items-center gap-2">
                            <User size={14} className="text-csj-azul" />
                            Usuario de Red (Login)
                        </label>
                        <input
                            id="userform-username"
                            type="text"
                            name="username"
                            required={!isEditMode}
                            disabled={isEditMode}
                            className={`input-csj ${isEditMode ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                            placeholder="ej. drupiz"
                            value={formData.username}
                            onChange={handleChange}
                        />
                        {isEditMode && (
                            <p className="text-xs text-gray-400 font-cairo">El usuario de red no puede modificarse.</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="userform-nombre" className="label-csj flex items-center gap-2">
                            <Briefcase size={14} className="text-csj-azul" />
                            Nombre Completo
                        </label>
                        <input
                            id="userform-nombre"
                            type="text"
                            name="nombre"
                            required
                            className="input-csj"
                            placeholder="ej. Daniel Ruales"
                            value={formData.nombre}
                            onChange={handleChange}
                        />
                    </div>

                    {!isEditMode && (
                        <div className="space-y-1">
                            <label htmlFor="userform-password" className="label-csj flex items-center gap-2">
                                <Shield size={14} className="text-csj-azul" />
                                Contraseña Inicial
                            </label>
                            <input
                                id="userform-password"
                                type="password"
                                name="password"
                                required
                                className="input-csj"
                                placeholder="********"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label htmlFor="userform-role" className="label-csj flex items-center gap-2">
                                <Shield size={14} className="text-csj-azul" />
                                Rol
                            </label>
                            <select
                                id="userform-role"
                                name="roleId"
                                className="input-csj"
                                value={formData.roleId}
                                onChange={handleChange}
                            >
                                <option value="">-- Seleccionar Rol --</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="userform-dep" className="label-csj flex items-center gap-2">
                                <Briefcase size={14} className="text-csj-azul" />
                                Dependencia
                            </label>
                            <select
                                id="userform-dep"
                                name="dependenciaId"
                                className="input-csj"
                                value={formData.dependenciaId}
                                onChange={handleChange}
                            >
                                <option value="">-- Seleccionar Dep --</option>
                                {dependencias.map(dep => (
                                    <option key={dep.id} value={dep.id}>
                                        {dep.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loading}
                            className="flex-1 btn-primary flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    {isEditMode ? 'Guardar Cambios' : 'Crear Usuario'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;
