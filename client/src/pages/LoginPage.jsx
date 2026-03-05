import React, { useReducer } from 'react';
import { loginUsuario, requestPasswordReset } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const initialState = {
    loading: false,
    localLoading: false,
    error: '',
    email: '',
    password: '',
    // Módulo recuperación de contraseña
    showForgotModal: false,
    forgotEmail: '',
    forgotLoading: false,
    forgotError: '',
    forgotSuccess: false
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE_FIELD': return { ...state, [action.field]: action.value };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_LOCAL_LOADING': return { ...state, localLoading: action.payload };
        case 'SET_ERROR': return { ...state, error: action.payload };
        case 'OPEN_FORGOT': return { ...state, showForgotModal: true, forgotEmail: '', forgotError: '', forgotSuccess: false };
        case 'CLOSE_FORGOT': return { ...state, showForgotModal: false, forgotEmail: '', forgotError: '', forgotSuccess: false, forgotLoading: false };
        case 'SET_FORGOT_EMAIL': return { ...state, forgotEmail: action.payload };
        case 'SET_FORGOT_LOADING': return { ...state, forgotLoading: action.payload };
        case 'SET_FORGOT_ERROR': return { ...state, forgotError: action.payload };
        case 'SET_FORGOT_SUCCESS': return { ...state, forgotSuccess: true, forgotLoading: false };
        default: return state;
    }
};

const LoginPage = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { loading, localLoading, error, email, password, showForgotModal, forgotEmail, forgotLoading, forgotError, forgotSuccess } = state;

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLocalLogin = async (e) => {
        e.preventDefault();
        dispatch({ type: 'SET_LOCAL_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: '' });

        try {
            const response = await loginUsuario({ email, password });

            if (response && response.requirePasswordChange) {
                // Interceptar para cambio de clave obligatorio
                navigate('/change-password', { state: { email: response.email } });
                return;
            }

            if (response && response.user) {
                // Almacenamos al usuario localmente
                login(response.user);
                // Redirigir al dashboard
                navigate('/');
            } else {
                dispatch({ type: 'SET_ERROR', payload: 'Ocurrió un error inesperado al procesar tu solicitud.' });
            }
        } catch (err) {
            console.error('Error login local:', err);
            dispatch({ type: 'SET_ERROR', payload: err.message || 'Credenciales inválidas o error de conexión.' });
        } finally {
            dispatch({ type: 'SET_LOCAL_LOADING', payload: false });
        }
    };

    const handleMicrosoftLogin = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: '' });
        try {
            // El backend nos devuelve la URL exacta configurada desde BD (Tenant + ClientID)
            const response = await fetch('/api/auth/microsoft/url').then(res => res.json());
            if (response.url) {
                // Redirigir físicamente al usuario hacia Azure AD
                window.location.href = response.url;
            } else {
                dispatch({ type: 'SET_ERROR', payload: 'El servidor no devolvió una URL válida de autenticación.' });
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        } catch (err) {
            console.error('Error fetching MS Auth URL:', err);
            dispatch({ type: 'SET_ERROR', payload: 'No fue posible contactar al servidor de autenticación. Verifica que el Backend esté corriendo.' });
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!forgotEmail.trim()) {
            dispatch({ type: 'SET_FORGOT_ERROR', payload: 'Ingrese su correo electrónico.' });
            return;
        }
        dispatch({ type: 'SET_FORGOT_LOADING', payload: true });
        dispatch({ type: 'SET_FORGOT_ERROR', payload: '' });
        try {
            await requestPasswordReset(forgotEmail.trim());
            dispatch({ type: 'SET_FORGOT_SUCCESS' });
        } catch (err) {
            console.error('Error en recuperación:', err);
            dispatch({ type: 'SET_FORGOT_ERROR', payload: 'Ocurrió un error. Inténtalo de nuevo.' });
            dispatch({ type: 'SET_FORGOT_LOADING', payload: false });
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-white font-cairo overflow-hidden">
            {/* IZQUIERDA: Formulario de Login */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 relative z-10">
                <div className="w-full max-w-md space-y-8">
                    {/* Header del Formulario */}
                    <div className="text-left animate-fade-in-up">
                        <img
                            src="/logo.png"
                            alt="Consejo Superior de la Judicatura"
                            className="h-20 w-auto object-contain mb-8"
                        />
                        <h2 className="text-4xl font-black text-[#1E3A6B] font-montserrat tracking-tight">
                            Bienvenido
                        </h2>
                        <p className="mt-3 text-base text-gray-500">
                            Ingresa tus credenciales para acceder al sistema de planes de mejoramiento de la Unidad de Auditoría.
                        </p>
                    </div>

                    {/* Alertas de Error */}
                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-shake">
                            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* FORMULARIO LOCAL */}
                        <form onSubmit={handleLocalLogin} className="space-y-5">
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-gray-700 font-montserrat">
                                    Correo Electrónico
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-[#359946] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'email', value: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#359946]/20 focus:border-[#359946] transition-all duration-200 text-gray-900 placeholder-gray-400 outline-none"
                                        placeholder="usuario@dominio.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-bold text-gray-700 font-montserrat">
                                        Contraseña
                                    </label>
                                    {/* Boton recuperar clave */}
                                    <button
                                        type="button"
                                        onClick={() => dispatch({ type: 'OPEN_FORGOT' })}
                                        className="text-xs font-semibold text-[#1E3A6B] hover:text-[#359946] transition-colors bg-transparent border-none p-0 cursor-pointer"
                                    >
                                        ¿Olvidaste tu clave?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-[#359946] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'password', value: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#359946]/20 focus:border-[#359946] transition-all duration-200 text-gray-900 placeholder-gray-400 outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={localLoading || loading}
                                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold font-montserrat text-white bg-[#1E3A6B] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E3A6B] disabled:opacity-70 shadow-lg shadow-[#1E3A6B]/30 hover:shadow-[#1E3A6B]/50 transform hover:-translate-y-0.5 transition-all duration-200"
                            >
                                {localLoading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Autenticando...
                                    </span>
                                ) : 'Iniciar Sesión'}
                            </button>
                        </form>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-400 font-medium text-xs uppercase tracking-wider">
                                    O ingresa con
                                </span>
                            </div>
                        </div>

                        {/* MICROSOFT SSO */}
                        <button
                            onClick={handleMicrosoftLogin}
                            disabled={loading || localLoading}
                            className="w-full flex items-center justify-center py-3.5 px-4 border border-gray-200 rounded-xl text-sm font-bold font-montserrat text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 disabled:opacity-70 shadow-sm hover:shadow transform transition-all duration-200 group"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Conectando a Microsoft...
                                </span>
                            ) : (
                                <span className="flex items-center gap-3">
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23">
                                        <path fill="#f3f3f3" d="M0 0h11v11H0z" />
                                        <path fill="#f3f3f3" d="M12 0h11v11H12z" />
                                        <path fill="#f3f3f3" d="M0 12h11v11H0z" />
                                        <path fill="#f3f3f3" d="M12 12h11v11H12z" />
                                        <path fill="#F25022" d="M1 1h9v9H1z" />
                                        <path fill="#7FBA00" d="M13 1h9v9H13z" />
                                        <path fill="#00A4EF" d="M1 13h9v9H1z" />
                                        <path fill="#FFB900" d="M13 13h9v9H13z" />
                                    </svg>
                                    Cuenta de Microsoft
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer del Formulario */}
                <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                    <p className="text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} Consejo Superior de la Judicatura - Colombia
                    </p>
                </div>
            </div>

            {/* DERECHA: Hero Banner Deslumbrante */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#1E3A6B] items-center justify-center p-12 overflow-hidden">
                {/* Gradiente dinámico de fondo */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A6B] via-[#1a325b] to-[#359946] opacity-90 z-0"></div>

                {/* Elementos abstractos desenfocados para dar profundidad (Glass / Glow) */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-green-400/20 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-indigo-400/10 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-4000"></div>

                {/* Grid Pattern Sutil */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPxwYXRoIGQ9Ik00MCA0MEwwIDBtMCA0MGw0MC00MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] opacity-20 z-0"></div>

                {/* Contenido Principal del Hero */}
                <div className="relative z-10 w-full max-w-lg text-white">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl">
                        <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-6 shadow-inner border border-white/10">
                            <svg className="w-8 h-8 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black font-montserrat mb-4 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100">
                            Gestión Transparente
                        </h1>
                        <p className="text-lg text-blue-100 font-cairo leading-relaxed mb-8">
                            Unificando el monitoreo de planes de mejoramiento y acciones institucionales con los más altos estándares de seguridad y eficiencia.
                        </p>

                        {/* Pequeños Cards Informativos (simulando dashboard UI de fondo) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                                <div className="text-3xl font-black text-white mb-1">100%</div>
                                <div className="text-xs text-blue-200 uppercase tracking-wide font-bold">Seguridad</div>
                            </div>
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                                <div className="text-3xl font-black text-white mb-1">24/7</div>
                                <div className="text-xs text-blue-200 uppercase tracking-wide font-bold">Disponibilidad</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#1E3A6B] to-[#2a4d8b] p-6">
                            <h3 className="text-xl font-black text-white font-montserrat flex items-center gap-2">
                                <svg className="w-6 h-6 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Recuperar Contraseña
                            </h3>
                            <p className="text-blue-200 text-sm mt-1 font-cairo">
                                Te enviaremos una contraseña temporal a tu correo
                            </p>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {forgotSuccess ? (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-[#359946]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-black text-gray-800 font-montserrat text-lg mb-2">¡Solicitud enviada!</h4>
                                    <p className="text-gray-500 font-cairo text-sm">
                                        Si el correo <strong>{forgotEmail}</strong> está registrado en el sistema, recibirás una contraseña temporal en breve.
                                    </p>
                                    <p className="text-gray-400 font-cairo text-xs mt-3">
                                        Al iniciar sesión con esa contraseña, el sistema te pedirá que la cambies.
                                    </p>
                                    <button
                                        onClick={() => dispatch({ type: 'CLOSE_FORGOT' })}
                                        className="mt-5 w-full py-3 px-4 bg-[#1E3A6B] text-white rounded-xl font-bold font-montserrat hover:bg-blue-900 transition-colors"
                                    >
                                        Entendido
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="space-y-4">
                                    {forgotError && (
                                        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm flex items-center gap-2">
                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {forgotError}
                                        </div>
                                    )}
                                    <div>
                                        <label htmlFor="forgot-email" className="block text-sm font-bold text-gray-700 mb-2 font-montserrat">
                                            Correo Electrónico
                                        </label>
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            autoFocus
                                            value={forgotEmail}
                                            onChange={(e) => dispatch({ type: 'SET_FORGOT_EMAIL', payload: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E3A6B]/20 focus:border-[#1E3A6B] transition-all outline-none font-cairo"
                                            placeholder="tu@correo.com"
                                            disabled={forgotLoading}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 font-cairo">
                                        Se generará una contraseña temporal y se enviará a tu correo institucional registrado en el sistema.
                                    </p>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => dispatch({ type: 'CLOSE_FORGOT' })}
                                            disabled={forgotLoading}
                                            className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-bold font-montserrat hover:bg-gray-50 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={forgotLoading}
                                            className="flex-1 py-3 px-4 bg-[#1E3A6B] text-white rounded-xl font-bold font-montserrat hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            {forgotLoading ? (
                                                <>
                                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Enviando...
                                                </>
                                            ) : 'Enviar Clave Temporal'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Clases CSS personalizadas para animaciones inyectadas en línea para facilidad */}
            <style>
                {`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out forwards;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
                `}
            </style>
        </div>
    );
};

export default LoginPage;
