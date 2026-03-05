import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AccionesPage from './pages/AccionesPage';
import HallazgoDetail from './pages/HallazgoDetail';
import HallazgosList from './pages/HallazgosList';
import ModulosCenter from './pages/ModulosCenter';
import CalendarView from './pages/CalendarView';
import Usuarios from './pages/Usuarios';
import Configuracion from './pages/Configuracion';

const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const Reportes = lazy(() => import('./pages/Reportes'));
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import ChangePasswordPage from './pages/ChangePasswordPage';
import PermisosPage from './pages/PermisosPage';
import UserHome from './pages/UserHome';
import NovedadesPage from './pages/NovedadesPage';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Cargando...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
};

/**
 * Enruta la raíz '/' al dashboard completo (Admin) o a la home del usuario según su rol.
 */
const SmartHome = () => {
    const { permissions } = useAuth();
    const canViewDashboard = permissions?.dashboard?.includes('ver');
    if (canViewDashboard) return <DashboardHome />;
    return <UserHome />;
};

const NotFound = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
            <h1 className="text-6xl font-black text-csj-azul font-montserrat mb-4">404</h1>
            <p className="text-xl text-gray-600 font-cairo mb-6">Pagina no encontrada</p>
            <Link to="/" className="btn-primary inline-block">
                Volver al Dashboard
            </Link>
        </div>
    </div>
);

function App() {
    return (
        <>
            <Toaster position="bottom-right" reverseOrder={false} />
            <Router>
                <Routes>
                    {/* Rutas Públicas */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/change-password" element={<ChangePasswordPage />} />
                    <Route path="/404" element={<NotFound />} />

                    {/* Rutas Protegidas */}
                    <Route
                        path="*"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center text-gray-500 font-cairo">Cargando módulo...</div>}>
                                        <Routes>
                                            <Route path="/" element={<SmartHome />} />
                                            <Route path="/hallazgos" element={<HallazgosList />} />
                                            <Route path="/hallazgos/:id" element={<HallazgoDetail />} />
                                            <Route path="/acciones" element={<AccionesPage />} />
                                            <Route path="/acciones/calendario" element={<CalendarView />} />
                                            <Route path="/modulos" element={<ModulosCenter />} />
                                            <Route path="/modulos/usuarios" element={<Usuarios />} />
                                            <Route path="/modulos/reportes" element={<Reportes />} />
                                            <Route path="/modulos/configuracion" element={<Configuracion />} />
                                            <Route path="/modulos/permisos" element={<PermisosPage />} />
                                            <Route path="/modulos/novedades" element={<NovedadesPage />} />
                                            <Route path="*" element={<Navigate to="/404" replace />} />
                                        </Routes>
                                    </Suspense>
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </>
    );
}

export default App;
