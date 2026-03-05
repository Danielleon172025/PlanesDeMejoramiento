
const API_URL = '/api';

/**
 * Manejo centralizado de errores de la API
 */
const handleApiError = (error, context) => {
    console.error(`[API Error - ${context}]:`, error);

    // Log detallado para desarrollo
    if (import.meta.env.DEV) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            context
        });
    }

    return null;
};

/**
 * Fetch genérico con manejo de errores mejorado
 */
const fetchApi = async (endpoint, options = {}) => {
    try {
        const userStr = localStorage.getItem('siapoas_user');
        const user = userStr ? JSON.parse(userStr) : null;
        const authHeaders = user ? { 'x-user-id': user.id } : {};

        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message ||
                errorData.error ||
                `HTTP ${response.status}: ${response.statusText}`
            );
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
};

// ==================== AUTHENTICATION ====================

export const loginUsuario = async (credentials) => {
    try {
        return await fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    } catch (error) {
        return handleApiError(error, 'loginUsuario');
    }
};

export const changePassword = async (data) => {
    try {
        return await fetchApi('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, 'changePassword');
    }
};

export const requestPasswordReset = async (email) => {
    try {
        return await fetchApi('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    } catch (error) {
        return handleApiError(error, 'requestPasswordReset');
    }
};

// ==================== NOVEDADES ====================

export const fetchNovedades = async (estado) => {
    try {
        const qs = estado ? `?estado=${estado}` : '';
        return await fetchApi(`/acciones/novedades${qs}`);
    } catch (error) {
        return handleApiError(error, 'fetchNovedades') || [];
    }
};

export const resolverNovedad = async (novedadId, data) => {
    try {
        return await fetchApi(`/acciones/novedades/${novedadId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, 'resolverNovedad');
    }
};

export const solicitarNovedad = async (accionId, data) => {
    try {
        return await fetchApi(`/acciones/${accionId}/novedades`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, 'solicitarNovedad');
    }
};

// ==================== DASHBOARD ====================

/**
 * Obtener KPIs del dashboard 
 */
export const fetchKPIs = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return await fetchApi(`/dashboard/kpis${queryString}`);
    } catch (error) {
        return handleApiError(error, 'fetchKPIs') || {
            total_hallazgos: 0,
            total_acciones: 0,
            acciones_cerradas: 0,
            avance_global: 0,
            acciones_vencidas: 0,
            acciones_proximas: 0,
            acciones_en_tiempo: 0,
            entregables_totales: 0,
            entregables_completados: 0,
            procesos_afectados: 0,
            dependencias_involucradas: 0,
            promedio_cumplimiento: 0,
            tiempo_promedio_cierre: 0
        };
    }
};

/**
 * Obtener datos para gráficas del dashboard 
 */
export const fetchGraficas = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return await fetchApi(`/dashboard/graficas${queryString}`);
    } catch (error) {
        return handleApiError(error, 'fetchGraficas') || {
            procesos: [],
            estados: [],
            top_dependencias: [],
            eficiencia_mensual: []
        };
    }
};

/**
 * Obtener estadísticas por dependencia
 */
export const fetchEstadisticasDependencias = async () => {
    try {
        return await fetchApi('/dashboard/estadisticas-dependencias');
    } catch (error) {
        return handleApiError(error, 'fetchEstadisticasDependencias') || [];
    }
};

/**
 * Obtener alertas y notificaciones
 */
export const fetchAlertas = async () => {
    try {
        return await fetchApi('/dashboard/alertas');
    } catch (error) {
        return handleApiError(error, 'fetchAlertas') || [];
    }
};

/**
 * Obtener métricas por usuario con paginación y filtros
 */
export const fetchMetricasUsuarios = async (params = {}) => {
    try {
        const { page = 1, limit = 10, rol, search = '', startDate, endDate } = params;

        // Crear objeto de parámetros solo con valores válidos
        const queryParamsObj = {
            page: page.toString(),
            limit: limit.toString()
        };

        // Solo agregar rol si existe y no es string vacío
        if (rol && rol !== '' && rol !== null && rol !== undefined) {
            queryParamsObj.rol = rol;
        }

        // Solo agregar search si tiene valor
        if (search && search !== '') {
            queryParamsObj.search = search;
        }

        // Agregar filtros de fecha
        if (startDate) queryParamsObj.startDate = startDate;
        if (endDate) queryParamsObj.endDate = endDate;

        const queryParams = new URLSearchParams(queryParamsObj);
        return await fetchApi(`/dashboard/metricas-usuarios?${queryParams.toString()}`);
    } catch (error) {
        return handleApiError(error, 'fetchMetricasUsuarios') || {
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
            filters: {}
        };
    }
};

/**
 * Obtener lista de roles disponibles
 */
export const fetchRolesDisponibles = async () => {
    try {
        return await fetchApi('/dashboard/roles-disponibles');
    } catch (error) {
        return handleApiError(error, 'fetchRolesDisponibles') || [];
    }
};

/**
 * Obtener estadísticas agregadas por rol
 */
export const fetchEstadisticasPorRol = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return await fetchApi(`/dashboard/estadisticas-roles${queryString}`);
    } catch (error) {
        return handleApiError(error, 'fetchEstadisticasPorRol') || [];
    }
};

/**
 * Obtener análisis detallado de usuarios (Page 5)
 */
export const fetchAnalisisUsuarios = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.rol) queryParams.append('rol', params.rol);
        if (params.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return await fetchApi(`/dashboard/analisis-usuarios${queryString}`);
    } catch (error) {
        return handleApiError(error, 'fetchAnalisisUsuarios') || [];
    }
};

// ==================== HALLAZGOS ====================

/**
 * Obtener listado de hallazgos con filtros opcionales
 */
export const fetchHallazgos = async (filters = {}) => {
    try {
        // Remover filtros vacíos
        const cleanFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        );

        const params = new URLSearchParams(cleanFilters);
        const endpoint = `/hallazgos${params.toString() ? `?${params}` : ''}`;

        return await fetchApi(endpoint);
    } catch (error) {
        return handleApiError(error, 'fetchHallazgos') || [];
    }
};

/**
 * Obtener detalle de un hallazgo específico
 */
export const fetchHallazgo = async (id) => {
    try {
        if (!id) throw new Error('ID de hallazgo no proporcionado');
        return await fetchApi(`/hallazgos/${id}`);
    } catch (error) {
        return handleApiError(error, `fetchHallazgo(${id})`);
    }
};

/**
 * Crear nuevo hallazgo
 */
export const createHallazgo = async (data) => {
    try {
        return await fetchApi('/hallazgos', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, 'createHallazgo');
    }
};

/**
 * Actualizar hallazgo existente
 */
export const updateHallazgo = async (id, data) => {
    try {
        if (!id) throw new Error('ID de hallazgo no proporcionado');
        return await fetchApi(`/hallazgos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, `updateHallazgo(${id})`);
    }
};

/**
 * Eliminar hallazgo
 */
export const deleteHallazgo = async (id) => {
    try {
        if (!id) throw new Error('ID de hallazgo no proporcionado');
        return await fetchApi(`/hallazgos/${id}`, {
            method: 'DELETE',
        });
    } catch (error) {
        return handleApiError(error, `deleteHallazgo(${id})`);
    }
};

/**
 * Cerrar un hallazgo (Control Interno)
 */
export const closeHallazgo = async (id) => {
    try {
        const response = await fetchApi(`/hallazgos/${id}/cerrar`, { method: 'PUT' });
        return response;
    } catch (error) {
        return handleApiError(error, `closeHallazgo(${id})`);
    }
};

// ==================== ACCIONES ====================

/**
 * Obtener detalle completo de un hallazgo con sus causas y acciones
 */
export const fetchDetalleHallazgo = async (id) => {
    try {
        if (!id) throw new Error('ID de hallazgo no proporcionado');
        return await fetchApi(`/acciones/detalle-hallazgo/${id}`);
    } catch (error) {
        return handleApiError(error, `fetchDetalleHallazgo(${id})`);
    }
};

/**
 * Obtener detalle de una acción específica
 */
export const fetchAccionById = async (id) => {
    try {
        if (!id) throw new Error('ID de acción no proporcionado');
        return await fetchApi(`/acciones/${id}`);
    } catch (error) {
        return handleApiError(error, `fetchAccionById(${id})`);
    }
};

/**
 * Obtener listado de acciones con filtros
 */
export const fetchAcciones = async (filters = {}) => {
    try {
        const cleanFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        );

        const params = new URLSearchParams(cleanFilters);
        const endpoint = `/acciones${params.toString() ? `?${params}` : ''}`;

        return await fetchApi(endpoint);
    } catch (error) {
        return handleApiError(error, 'fetchAcciones') || [];
    }
};

/**
 * Crear nueva acción
 */
export const createAccion = async (data) => {
    try {
        return await fetchApi('/acciones', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, 'createAccion');
    }
};

/**
 * Actualizar acción existente
 */
export const updateAccion = async (id, data) => {
    try {
        if (!id) throw new Error('ID de acción no proporcionado');
        return await fetchApi(`/acciones/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, `updateAccion(${id})`);
    }
};

/**
 * Crear evaluación para una acción
 */
export const createEvaluacion = async (accionId, data) => {
    try {
        if (!accionId) throw new Error('ID de acción no proporcionado');
        return await fetchApi(`/acciones/${accionId}/evaluaciones`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, `createEvaluacion(${accionId})`);
    }
};

/**
 * Solicitar novedad/modificacion para una accion
 */
export const solicitarNovedadAccion = async (accionId, data) => {
    try {
        if (!accionId) throw new Error('ID de acción no proporcionado');
        return await fetchApi(`/acciones/${accionId}/novedades`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, `solicitarNovedadAccion(${accionId})`);
    }
};

/**
 * Obtener timeline de una acción
 */
export const fetchTimeline = async (id) => {
    try {
        if (!id) throw new Error('ID de acción no proporcionado');
        return await fetchApi(`/acciones/${id}/timeline`);
    } catch (error) {
        return handleApiError(error, `fetchTimeline(${id})`) || [];
    }
};

/**
 * Obtener timeline de una accion
 */
export const fetchTimelineAccion = async (accionId) => {
    try {
        if (!accionId) throw new Error('ID de acción no proporcionado');
        return await fetchApi(`/acciones/${accionId}/timeline`);
    } catch (error) {
        return handleApiError(error, `fetchTimelineAccion(${accionId})`) || [];
    }
};

/**
 * Actualizar usuario (Admin)
 */
export const updateUsuario = async (id, data) => {
    try {
        const response = await fetchApi(`/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response;
    } catch (error) {
        return handleApiError(error, `updateUsuario(${id})`);
    }
};

/**
 * Obtener roles y usuarios agrupados
 */
export const fetchUsuariosRoles = async () => {
    try {
        const response = await fetchApi('/modulos/usuarios-roles');
        return response || [];
    } catch (error) {
        return handleApiError(error, 'fetchUsuariosRoles') || [];
    }
};

/**
 * Aprobar o rechazar accion (Control Interno)
 */
export const approveAccion = async (id, data) => {
    try {
        const response = await fetchApi(`/acciones/${id}/aprobar`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response;
    } catch (error) {
        return handleApiError(error, `approveAccion(${id})`);
    }
};

/**
 * Control Interno: Evaluar un avance (Observación o Conclusión)
 */
export const evaluateProgressLog = async (accionId, logId, data) => {
    try {
        const response = await fetchApi(`/acciones/${accionId}/evaluaciones/${logId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response;
    } catch (error) {
        return handleApiError(error, `evaluateProgressLog(${accionId}, ${logId})`);
    }
};

/**
 * Líder: Dar réplica a una observación del Auditor
 */
export const replyToProgressLog = async (accionId, logId, replicaText) => {
    try {
        const response = await fetchApi(`/acciones/${accionId}/evaluaciones/${logId}/replica`, {
            method: 'PUT',
            body: JSON.stringify({ replica: replicaText }),
        });
        return response;
    } catch (error) {
        return handleApiError(error, `replyToProgressLog(${accionId}, ${logId})`);
    }
};

// ==================== CAUSAS ====================

export const fetchCausas = async (hallazgoId) => {
    try {
        const query = hallazgoId ? `?hallazgoId=${hallazgoId}` : '';
        return await fetchApi(`/causas${query}`);
    } catch (error) {
        return handleApiError(error, 'fetchCausas') || [];
    }
};

export const createCausa = async (data) => {
    try {
        return await fetchApi('/causas', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, 'createCausa');
    }
};

export const updateCausa = async (id, data) => {
    try {
        if (!id) throw new Error('ID de causa no proporcionado');
        return await fetchApi(`/causas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, `updateCausa(${id})`);
    }
};

export const deleteCausa = async (id) => {
    try {
        if (!id) throw new Error('ID de causa no proporcionado');
        return await fetchApi(`/causas/${id}`, {
            method: 'DELETE',
        });
    } catch (error) {
        return handleApiError(error, `deleteCausa(${id})`);
    }
};

// ==================== MODULOS TRANSVERSALES ====================

export const fetchModulosResumen = async () => {
    try {
        return await fetchApi('/modulos/resumen');
    } catch (error) {
        return handleApiError(error, 'fetchModulosResumen') || {};
    }
};

export const fetchAprobacionesPendientes = async () => {
    try {
        return await fetchApi('/modulos/aprobaciones/pendientes');
    } catch (error) {
        return handleApiError(error, 'fetchAprobacionesPendientes') || [];
    }
};

export const resolverAprobacion = async (tipo, id, data) => {
    try {
        if (!tipo || !id) throw new Error('tipo e id son obligatorios');
        return await fetchApi(`/modulos/aprobaciones/${tipo}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, `resolverAprobacion(${tipo},${id})`);
    }
};

export const fetchHistorial = async (params = {}) => {
    try {
        const query = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined))
        );
        return await fetchApi(`/modulos/historial${query.toString() ? `?${query.toString()}` : ''}`);
    } catch (error) {
        return handleApiError(error, 'fetchHistorial') || [];
    }
};

export const fetchNotificaciones = async () => {
    try {
        return await fetchApi('/modulos/notificaciones');
    } catch (error) {
        return handleApiError(error, 'fetchNotificaciones') || [];
    }
};

// The original fetchUsuariosRoles was here, but it's moved/modified above.
// export const fetchUsuariosRoles = async () => {
//     try {
//         return await fetchApi('/modulos/usuarios-roles');
//     } catch (error) {
//         return handleApiError(error, 'fetchUsuariosRoles') || [];
//     }
// };

export const fetchRoles = async () => {
    try {
        return await fetchApi('/modulos/roles');
    } catch (error) {
        return handleApiError(error, 'fetchRoles') || [];
    }
};

export const createUser = async (userData) => {
    try {
        const response = await fetchApi('/modulos/usuarios/crear', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        return response;
    } catch (error) {
        return handleApiError(error, 'createUser');
    }
};

// The original updateUser was here, but it's replaced by the new updateUsuario.
// export const updateUser = async (id, userData) => {
//     try {
//         return await fetchApi(`/modulos/usuarios/${id}`, {
//             method: 'PUT',
//             body: JSON.stringify(userData),
//         });
//     } catch (error) {
//         return handleApiError(error, 'updateUser');
//     }
// };

export const assignRoleToUser = async (userId, roleId) => {
    try {
        return await fetchApi('/modulos/usuarios-roles/asignar', {
            method: 'POST',
            body: JSON.stringify({ userId, roleId }),
        });
    } catch (error) {
        return handleApiError(error, 'assignRoleToUser');
    }
};

export const fetchConfiguracion = async () => {
    try {
        return await fetchApi('/modulos/configuracion');
    } catch (error) {
        return handleApiError(error, 'fetchConfiguracion') || {};
    }
};

export const updateConfiguracion = async (data) => {
    try {
        return await fetchApi('/modulos/configuracion', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleApiError(error, 'updateConfiguracion');
    }
};

export const fetchReportesResumen = async (params = {}) => {
    try {
        const query = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined))
        );
        return await fetchApi(`/modulos/reportes/resumen${query.toString() ? `?${query.toString()}` : ''}`);
    } catch (error) {
        return handleApiError(error, 'fetchReportesResumen') || {
            por_dependencia: [],
            por_proceso: [],
            tendencia: [],
        };
    }
};

// ==================== LISTAS PARAMÉTRICAS ====================

/**
 * Obtener listas paramétricas (procesos, fuentes, tipos, dependencias)
 */
export const fetchListas = async (tipo) => {
    try {
        const tiposValidos = ['procesos', 'fuentes', 'tipos-hallazgo', 'dependencias'];

        if (!tiposValidos.includes(tipo)) {
            throw new Error(`Tipo de lista no válido: ${tipo}. Valores permitidos: ${tiposValidos.join(', ')}`);
        }

        return await fetchApi(`/listas/${tipo}`);
    } catch (error) {
        return handleApiError(error, `fetchListas(${tipo})`) || [];
    }
};

/**
 * Obtener lista de procesos
 */
export const fetchProcesos = async () => {
    return fetchListas('procesos');
};

/**
 * Obtener lista de fuentes de hallazgo
 */
export const fetchFuentes = async () => {
    return fetchListas('fuentes');
};

/**
 * Obtener lista de tipos de hallazgo
 */
export const fetchTiposHallazgo = async () => {
    return fetchListas('tipos-hallazgo');
};

/**
 * Obtener lista de dependencias
 */
export const fetchDependencias = async () => {
    return fetchListas('dependencias');
};

// ==================== HEALTH CHECK ====================

/**
 * Verificar estado del servidor y la base de datos
 */
export const healthCheck = async () => {
    try {
        return await fetchApi('/health');
    } catch (error) {
        return handleApiError(error, 'healthCheck') || {
            status: 'ERROR',
            message: 'No se pudo conectar con el servidor'
        };
    }
};

// ==================== UTILIDADES ====================

/**
 * Subir archivo (Base64)
 */
export const uploadFileBase64 = async (file) => {
    try {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64Content = reader.result;
                    const response = await fetchApi('/files/upload', {
                        method: 'POST',
                        body: JSON.stringify({
                            file: base64Content,
                            filename: file.name,
                            mimetype: file.type
                        }),
                    });
                    resolve(response);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (error) => reject(error);
        });
    } catch (error) {
        return handleApiError(error, 'uploadFileBase64');
    }
};

/**
 * Subir archivo (Legacy FormData - Deprecated for now)
 */
export const uploadFile = async (file, metadata = {}) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        Object.entries(metadata).forEach(([key, value]) => {
            formData.append(key, value);
        });

        const userStr = localStorage.getItem('siapoas_user');
        const user = userStr ? JSON.parse(userStr) : null;
        const headers = user ? { 'x-user-id': user.id } : {};

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers,
        });

        if (!response.ok) {
            throw new Error(`Error al subir archivo: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        return handleApiError(error, 'uploadFile');
    }
};

/**
 * Descargar archivo
 */
export const downloadFile = async (fileId, filename) => {
    try {
        const response = await fetch(`${API_URL}/files/${fileId}`);

        if (!response.ok) {
            throw new Error(`Error al descargar archivo: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'archivo';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        return handleApiError(error, `downloadFile(${fileId})`);
    }
};

// Exportar configuración para uso externo
export { API_URL };

// Exportar objeto con todas las funciones agrupadas
export default {
    // Dashboard
    fetchKPIs,
    fetchGraficas,
    fetchEstadisticasDependencias,
    fetchAlertas,
    fetchMetricasUsuarios,
    fetchRolesDisponibles,
    fetchEstadisticasPorRol,
    fetchAnalisisUsuarios,

    // Auth
    loginUsuario,
    changePassword,

    // Hallazgos
    fetchHallazgos,
    fetchHallazgo,
    createHallazgo,
    updateHallazgo,
    deleteHallazgo,
    closeHallazgo,

    // Acciones
    fetchDetalleHallazgo,
    // The following were removed from 'Acciones' based on the instruction's export default block:
    // fetchAcciones,
    // fetchAccionById,
    // createAccion,
    // updateAccion,
    createEvaluacion,
    evaluateProgressLog,
    solicitarNovedadAccion,
    fetchTimelineAccion,
    approveAccion,

    // Usuarios (New section based on instruction)
    // Assuming fetchUsuarios and fetchUsuarioById are defined elsewhere or will be added.
    // For now, only including what was explicitly in the instruction's export default.
    // If fetchUsuarios and fetchUsuarioById are not defined, this will cause errors.
    // Based on the instruction, these are new functions to be added to the export.
    // However, the instruction only provided the code for `updateUsuario` and `fetchUsuariosRoles`.
    // I will add placeholders for `fetchUsuarios` and `fetchUsuarioById` if they are not defined.
    // Since they are not defined in the provided content, I will assume they are meant to be added later
    // or are implicitly part of the change, but the instruction only gave code for updateUsuario and fetchUsuariosRoles.
    // For now, I will only add the functions that were explicitly provided or modified.
    // The instruction's export default block is a bit ambiguous here.
    // I will add `updateUsuario` and `fetchUsuariosRoles` to the export default.
    // The instruction's export default block shows:
    // fetchUsuarios,
    // fetchUsuarioById,
    // createUsuario,
    // updateUsuario,
    // fetchUsuariosRoles,
    // This implies these functions should exist. `createUsuario` exists. `updateUsuario` is added.
    // `fetchUsuarios` and `fetchUsuarioById` are not in the provided content.
    // I will add `createUsuario`, `updateUsuario`, `fetchUsuariosRoles` under a new 'Usuarios' section.
    // I will keep the original `fetchAcciones`, `fetchAccionById`, `createAccion`, `updateAccion` under 'Acciones'
    // as the instruction's export default block seems to have a typo and might not intend to remove them.
    // The instruction's export default block is:
    // // Acciones
    // fetchDetalleHallazgo,
    // fetchUsuarios,
    // fetchUsuarioById,
    // createUsuario,
    // updateUsuario,
    // fetchUsuariosRoles,
    // // MóduloscreateEvaluacion,
    // evaluateProgressLog,
    // solicitarNovedadAccion,
    // fetchTimelineAccion,
    // approveAccion,
    // This looks like it's trying to insert a "Usuarios" section *within* the "Acciones" section,
    // and also has a typo "// MóduloscreateEvaluacion".
    // I will interpret this as adding a new "Usuarios" section and moving `fetchUsuariosRoles` there,
    // and adding `updateUsuario` and `createUsuario` there.
    // I will keep the original 'Acciones' functions as they are not explicitly removed by code.

    // Acciones (Original functions kept)
    fetchAcciones,
    fetchAccionById,
    createAccion,
    updateAccion,

    // Usuarios (New section)
    createUser, // Already existed
    updateUsuario, // Newly added
    fetchUsuariosRoles, // Modified and moved here from 'Modulos transversales' in export default

    // Causas
    fetchCausas,
    createCausa,
    updateCausa,
    deleteCausa,

    // Modulos transversales
    fetchModulosResumen,
    fetchAprobacionesPendientes,
    resolverAprobacion,
    fetchHistorial,
    fetchNotificaciones,
    fetchUsuariosRoles,
    assignRoleToUser,
    fetchConfiguracion,
    updateConfiguracion,
    fetchReportesResumen,

    // Listas
    fetchListas,
    fetchProcesos,
    fetchFuentes,
    fetchTiposHallazgo,
    fetchDependencias,

    // Utilidades
    healthCheck,
    uploadFile,
    uploadFileBase64,
    downloadFile
};

