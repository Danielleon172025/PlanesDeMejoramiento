import React, { useReducer, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { changePassword } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const initialState = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    loading: false,
    error: ''
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE_FIELD': return { ...state, [action.field]: action.value };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_ERROR': return { ...state, error: action.payload };
        default: return state;
    }
};

const ChangePasswordPage = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { oldPassword, newPassword, confirmPassword, loading, error } = state;

    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();

    // Obtener el email que nos pasó LoginPage por el History State
    const email = location.state?.email;

    useEffect(() => {
        // Si alguien intenta entrar aquí manualmente sin venir del login, expulsarlo
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch({ type: 'SET_ERROR', payload: '' });

        if (newPassword !== confirmPassword) {
            dispatch({ type: 'SET_ERROR', payload: 'Las nuevas contraseñas no coinciden.' });
            return;
        }

        if (newPassword === oldPassword) {
            dispatch({ type: 'SET_ERROR', payload: 'La nueva contraseña no puede ser la misma que la genérica actual.' });
            return;
        }

        if (newPassword.length < 8) {
            dispatch({ type: 'SET_ERROR', payload: 'La nueva contraseña debe tener al menos 8 caracteres.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            const response = await changePassword({
                email,
                oldPassword,
                newPassword
            });

            if (response && response.user) {
                // Iniciar sesión y redirigir
                login(response.user);
                navigate('/');
            } else {
                dispatch({ type: 'SET_ERROR', payload: 'Error desconocido al intentar cambiar la contraseña.' });
            }
        } catch (err) {
            console.error('Error cambiando clave:', err);
            dispatch({ type: 'SET_ERROR', payload: err.message || 'No fue posible actualizar la contraseña. Verifica tu clave actual.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    if (!email) return null; // Prevenir render flash antes del redirect

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 transform transition-all border-t-4 border-yellow-500">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 font-montserrat tracking-tight">
                        Cambio Obligatorio
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 font-cairo bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        Por motivos de seguridad, debes establecer una contraseña personal para <strong>{email}</strong> antes de continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 font-montserrat mb-1">
                            Contraseña Actual
                        </label>
                        <input
                            type="password"
                            required
                            value={oldPassword}
                            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'oldPassword', value: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-cairo"
                            placeholder="La contraseña genérica"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 font-montserrat mb-1">
                            Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={newPassword}
                            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'newPassword', value: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-cairo"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 font-montserrat mb-1">
                            Confirmar Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'confirmPassword', value: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-cairo"
                            placeholder="Repite la nueva contraseña"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-md bg-red-50 border border-red-200">
                            <p className="text-sm font-cairo text-red-600 text-center">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold font-montserrat text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Actualizando...' : 'Guardar y Continuar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
