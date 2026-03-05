import React, { useEffect, useReducer } from 'react';
import { fetchUsuariosRoles } from '../services/api';
import UserForm from '../components/UserForm';
import { Plus, Edit2, User } from 'lucide-react';

const initialState = {
    loading: true,
    usuariosRoles: [],
    showUserForm: false,
    editingUser: null,
    filters: {
        busqueda: '',
        dependencia: '',
        fecha: ''
    }
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_USUARIOS': return { ...state, usuariosRoles: action.payload, loading: false };
        case 'SHOW_FORM': return { ...state, showUserForm: true, editingUser: action.payload };
        case 'HIDE_FORM': return { ...state, showUserForm: false, editingUser: null };
        case 'SET_FILTER': return { ...state, filters: { ...state.filters, [action.field]: action.value } };
        default: return state;
    }
};

const Usuarios = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { loading, usuariosRoles, showUserForm, editingUser, filters } = state;

    const loadData = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await fetchUsuariosRoles();
            dispatch({ type: 'SET_USUARIOS', payload: data || [] });
        } catch (error) {
            console.error(error);
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleEditUser = (user) => {
        dispatch({ type: 'SHOW_FORM', payload: user });
    };

    const handleCloseUserForm = () => {
        dispatch({ type: 'HIDE_FORM' });
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        dispatch({ type: 'SET_FILTER', field: name, value });
    };

    const filteredUsuarios = usuariosRoles.filter(item => {
        const term = filters.busqueda.toLowerCase();
        const matchBusqueda =
            (item.username || '').toLowerCase().includes(term) ||
            (item.nombre || '').toLowerCase().includes(term);

        const matchDependencia = filters.dependencia ? (item.dependencia || '').toLowerCase().includes(filters.dependencia.toLowerCase()) : true;

        const matchFecha = filters.fecha ?
            (item.fecha_creacion && new Date(item.fecha_creacion).toISOString().split('T')[0] === filters.fecha) : true;

        return matchBusqueda && matchDependencia && matchFecha;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-csj-azul font-montserrat">Usuarios y Roles</h2>
                    <p className="text-gray-500 font-cairo text-sm">Gestión de acceso y permisos del sistema</p>
                </div>
                <button
                    onClick={() => handleEditUser(null)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    Nuevo Usuario
                </button>
            </div>

            {/* Application Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Buscar (Usuario/Nombre)</label>
                    <input
                        type="text"
                        name="busqueda"
                        value={filters.busqueda}
                        onChange={handleFilterChange}
                        placeholder="Ej. jperez..."
                        className="input-csj w-full mt-1 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Dependencia</label>
                    <input
                        type="text"
                        name="dependencia"
                        value={filters.dependencia}
                        onChange={handleFilterChange}
                        placeholder="Ej. Administrativa..."
                        className="input-csj w-full mt-1 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Fecha Creación</label>
                    <input
                        type="date"
                        name="fecha"
                        value={filters.fecha}
                        onChange={handleFilterChange}
                        className="input-csj w-full mt-1 text-sm"
                    />
                </div>
            </div>

            <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="table-csj w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dependencia</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Alta</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsuarios.map((item, idx) => (
                            <tr key={`${item.user_id}-${item.role_id || 'none'}-${idx}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                            <User size={20} />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-gray-900">{item.nombre}</div>
                                            <div className="text-sm text-gray-500">{item.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${item.role_name ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {item.role_name || 'Sin rol'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.dependencia || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        className="text-csj-azul hover:text-blue-900 bg-blue-50 p-2 rounded-full transition-colors"
                                        onClick={() => handleEditUser(item)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showUserForm && (
                <UserForm
                    user={editingUser}
                    onClose={handleCloseUserForm}
                    onSave={() => {
                        loadData();
                        handleCloseUserForm();
                    }}
                />
            )}
        </div>
    );
};

export default Usuarios;
