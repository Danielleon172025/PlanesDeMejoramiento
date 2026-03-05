import { getActorUserId, getUserRole, SYSTEM_USER_ID } from '../utils/auth.js';
import { sendServerError } from '../utils/http.js';
import { getConnection } from '../config/db.js';
import sql from 'mssql';

/**
 * Middleware para requerir roles específicos
 * @param {string[]} allowedRoles - Arreglo con los nombres de los roles permitidos
 */
export const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = getActorUserId(req);

            // Log para debug
            // console.log(`Validating access for userId: ${userId} requiring roles: ${allowedRoles.join(', ')}`);

            if (userId === SYSTEM_USER_ID && process.env.NODE_ENV !== 'production') {
                // Warning en desarrollo: el request no trajo X-User-Id
                console.warn('WARN: Petición sin usuario especifico, usando SYSTEM_USER_ID. RBAC restrictivo podría fallar.');
            }

            const roleName = await getUserRole(userId);

            if (!roleName) {
                return res.status(403).json({ error: 'Acceso denegado. El usuario no posee un rol asignado.' });
            }

            if (!allowedRoles.includes(roleName)) {
                return res.status(403).json({
                    error: 'Acceso denegado. No cuentas con los permisos necesarios para realizar esta acción.',
                    required: allowedRoles,
                    currentRole: roleName
                });
            }

            // Inyectar rol en request
            req.userRole = roleName;
            next();
        } catch (error) {
            return sendServerError(res, 'Error de autorización', error);
        }
    };
};

/**
 * Middleware para requerir un permiso específico en un módulo.
 * Ejemplo de uso: requirePermission('hallazgos', 'crear')
 * @param {string} moduleName - Nombre del módulo (ej. 'hallazgos', 'acciones')
 * @param {string} actionName - Acción requerida ('ver', 'crear', 'editar', 'eliminar')
 */
export const requirePermission = (moduleName, actionName) => {
    return async (req, res, next) => {
        try {
            const userId = getActorUserId(req);

            if (userId === SYSTEM_USER_ID && process.env.NODE_ENV !== 'production') {
                console.warn('WARN: Petición sin usuario especifico, usando SYSTEM_USER_ID. Control de permisos fallará.');
            }

            const pool = await getConnection();

            const permissionFullName = `${moduleName}.${actionName}`;

            // Consulta directa para verificar si el usuario tiene este permiso
            const result = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .input('permName', sql.NVarChar, permissionFullName)
                .query(`
                    SELECT TOP 1 1 as AccessGranted
                    FROM [Identity].[Permissions] p
                    JOIN [Identity].[RolePermissions] rp ON rp.PermissionId = p.Id
                    JOIN [Identity].[UserRoles] ur ON ur.RoleId = rp.RoleId
                    WHERE ur.UserId = @userId AND p.Name = @permName
                `);

            if (result.recordset.length === 0) {
                return res.status(403).json({
                    error: 'Acceso denegado. No cuentas con los permisos necesarios para realizar esta acción.',
                    requiredPermission: permissionFullName
                });
            }

            // Inyectar el rol temporalmente para mantener compatibilidad con algunos controladores legado si lo usan
            req.userRole = await getUserRole(userId);

            next();
        } catch (error) {
            return sendServerError(res, 'Error validando permisos', error);
        }
    }
};
