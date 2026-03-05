import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const verifyMicrosoftCode = async (code) => {
    const res = await fetch('/api/auth/microsoft/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });
    return res.json();
};

const AuthCallback = () => {
    const [status, setStatus] = useState('Autenticando...');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const isProcessing = useRef(false); // Prevents StrictMode double-firing

    useEffect(() => {
        // Ejecutar solo una vez
        if (isProcessing.current) return;

        const processAuth = async () => {
            isProcessing.current = true;

            // Extraer el código de la URL (?code=...)
            const searchParams = new URLSearchParams(location.search);
            const code = searchParams.get('code');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(`Microsoft denegó el acceso: ${searchParams.get('error_description') || errorParam}`);
                setStatus('');
                return;
            }

            if (!code) {
                setError('No se recibió un código válido desde Microsoft.');
                setStatus('');
                return;
            }

            try {
                // Enviar el code al backend para verificar y obtener token/info usuario
                const response = await verifyMicrosoftCode(code);

                if (response.user) {
                    setStatus('¡Ingreso Exitoso! Redirigiendo...');
                    // Guardar en el contexto global / Local Storage
                    login(response.user, response.ms_token);

                    // Volver al Dashboard
                    setTimeout(() => {
                        navigate('/');
                    }, 1000);
                } else {
                    setError('Error: El backend no devolvió los datos del usuario.');
                }
            } catch (err) {
                console.error('Error durante el callback OAUTH:', err);
                setError(err.response?.data?.message || err.message || 'Error al validar las credenciales con el servidor.');
                setStatus('');
            }
        };

        processAuth();
    }, [location.search, login, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <img
                    src="/logo.png"
                    alt="Consejo Superior de la Judicatura"
                    className="mx-auto h-20 w-auto object-contain mb-8 animate-pulse"
                />

                <h2 className="text-xl font-bold font-montserrat text-csj-azul mb-4">
                    Iniciando Sesión
                </h2>

                {status && (
                    <div className="flex flex-col items-center justify-center gap-3">
                        <svg className="animate-spin h-8 w-8 text-csj-verde" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-600 font-cairo animate-pulse">{status}</p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 rounded-md bg-red-50 border border-red-200 text-left">
                        <h3 className="text-red-800 font-bold mb-2 font-montserrat text-sm">Error de Autenticación</h3>
                        <p className="text-sm font-cairo text-red-600">{error}</p>

                        <button
                            onClick={() => navigate('/login')}
                            className="mt-4 w-full py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
