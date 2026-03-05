import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, CheckCircle, Info, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { fetchNotificaciones } from '../services/api';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await fetchNotificaciones();
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);

        // SSE Real-Time Notifications Connection
        const userStr = localStorage.getItem('siapoas_user');
        const user = userStr ? JSON.parse(userStr) : null;
        let eventSource = null;

        if (user && user.id) {
            // Se le concatena el userId por query parameters para que getActorUserId pase validación sin headers custom
            eventSource = new EventSource(`/api/modulos/notificaciones/stream?userId=${user.id}`);

            eventSource.onopen = () => {
                console.log('[SSE] Conectado exitosamente al stream de notificaciones en tiempo real.');
            };

            eventSource.onmessage = (event) => {
                console.log('[SSE] Evento recibido en crudo:', event.data);
                try {
                    // El backend envía el mensaje the forma: "data: {...}" 
                    // Si trae el string directo (no JSON raw object)
                    const data = JSON.parse(event.data);

                    if (data.type !== 'connected' && data.type !== 'keepalive') {
                        // Renderizamos un nodo React dentro del Toast para estilizar correctamente los saltos de línea y el título


                        // Opciones extendidas de tostada para hacerla más prominente
                        const toastOptions = {
                            duration: 10000,
                            style: {
                                maxWidth: '500px',
                                padding: '16px 20px',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                            }
                        };

                        // Disparamos la alerta Toast style google en base al severity/type
                        if (data.type === 'warning' || data.type === 'error') {
                            toast.error((t) => <ToastContent t={t} data={data} />, toastOptions);
                        } else {
                            toast.success((t) => <ToastContent t={t} data={data} />, toastOptions);
                        }

                        // Una vez llega el evento en vivo, forzamos recarga de la bandeja para que el contador visual suba
                        fetchNotifications();
                    }
                } catch (e) {
                    console.error('[SSE] Error procesando notificación en tiempo real:', e);
                }
            };

            eventSource.onerror = (error) => {
                console.error('[SSE] Conexión interrumpida o con error. Reintentando...', error);
                // El EventSource de HTML5 tiene reconexión automática activada siempre.
            };
        }

        return () => {
            clearInterval(interval);
            if (eventSource) {
                eventSource.close();
            }
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'vencimiento': return <AlertTriangle size={18} className="text-red-500" />;
            case 'aprobacion': return <Info size={18} className="text-blue-500" />;
            case 'novedad': return <CheckCircle size={18} className="text-orange-500" />;
            case 'observacion': return <MessageSquare size={18} className="text-purple-500" />;
            default: return <Bell size={18} className="text-gray-500" />;
        }
    };

    const getLink = (notif) => {
        if (notif.tipo === 'vencimiento' || notif.tipo === 'aprobacion' || notif.tipo === 'observacion') {
            return `/acciones?show=${notif.id}`;
        }
        return '/modulos'; // Fallback
    };

    const unreadCount = notifications.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-gray-500 hover:text-[#359946] transition p-2 rounded-full hover:bg-gray-100"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden transform transition-all">
                    <div className="p-4 bg-[#359946] text-white flex justify-between items-center">
                        <h3 className="font-semibold font-montserrat">Notificaciones</h3>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {loading && notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">Cargando...</div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notif) => (
                                    <Link
                                        key={`${notif.tipo}-${notif.id || notif.titulo}`}
                                        to={getLink(notif)}
                                        onClick={() => setIsOpen(false)}
                                        className="block p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 flex-shrink-0">
                                                {getIcon(notif.tipo)}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 font-montserrat">
                                                    {notif.titulo}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                    {notif.descripcion}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {new Date(notif.fecha_referencia).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                <p>No tienes notificaciones pendientes.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;

const ToastContent = ({ t, data }) => (
    <div
        className={`flex flex-col gap-2 w-full min-w-[280px] py-1 ${data.linkUrl ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        onClick={() => {
            if (data.linkUrl) {
                window.location.href = data.linkUrl;
                toast.dismiss(t.id);
            }
        }}
        role={data.linkUrl ? "button" : undefined}
        tabIndex={data.linkUrl ? 0 : undefined}
        onKeyDown={(e) => {
            if (data.linkUrl && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                window.location.href = data.linkUrl;
                toast.dismiss(t.id);
            }
        }}
    >
        <h4 className="font-extrabold text-base text-gray-900 tracking-tight">{data.title}</h4>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed font-medium">{data.message}</p>
        {data.linkUrl && (
            <span className="text-xs text-blue-600 font-bold mt-1">Haga clic para ver detalles &rarr;</span>
        )}
    </div>
);
