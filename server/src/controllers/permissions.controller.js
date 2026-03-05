import sql from 'mssql';
import { getConnection } from '../config/db.js';
import { getActorUserId } from '../utils/auth.js';
import { sendServerError } from '../utils/http.js';

/**
 * GET /api/permisos
 * Devuelve todos los roles con sus permisos asignados organizados por módulo.
 * Solo para Administrador.
 */
export const getAllPermissions = async (req, res) => {
    try {
        const pool = await getConnection();

        const [roles, permissions, assigned] = await Promise.all([
            pool.request().query(`SELECT Id, Name FROM [Identity].[Roles] ORDER BY Name`),
            pool.request().query(`SELECT Id, Name, Module, Description FROM [Identity].[Permissions] ORDER BY Module, Name`),
            pool.request().query(`SELECT RoleId, PermissionId FROM [Identity].[RolePermissions]`),
        ]);

        return res.json({
            roles: roles.recordset,
            permissions: permissions.recordset,
            assigned: assigned.recordset,
        });
    } catch (error) {
        return sendServerError(res, 'Error al obtener permisos', error);
    }
};

/**
 * PUT /api/permisos/:roleId
 * Reemplaza todos los permisos de un rol con la nueva lista.
 * Solo para Administrador.
 */
export const saveRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissionIds } = req.body; // array de GUIDs/IDs

        if (!roleId) {
            return res.status(400).json({ error: 'Falta el RoleId' });
        }

        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Eliminar asignaciones actuales del rol
            await transaction.request()
                .input('roleId', sql.UniqueIdentifier, roleId)
                .query(`DELETE FROM [Identity].[RolePermissions] WHERE RoleId = @roleId`);

            // 2. Insertar nueva lista
            if (Array.isArray(permissionIds) && permissionIds.length > 0) {
                for (const permId of permissionIds) {
                    await transaction.request()
                        .input('roleId', sql.UniqueIdentifier, roleId)
                        .input('permId', sql.Int, parseInt(permId))
                        .query(`INSERT INTO [Identity].[RolePermissions] (RoleId, PermissionId) VALUES (@roleId, @permId)`);
                }
            }

            await transaction.commit();
            return res.json({ message: 'Permisos actualizados correctamente' });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (error) {
        return sendServerError(res, 'Error al guardar permisos', error);
    }
};

/**
 * GET /api/permisos/me
 * Devuelve el set de permisos del usuario actual.
 * Cualquier usuario autenticado.
 */
export const getMyPermissions = async (req, res) => {
    try {
        const userId = getActorUserId(req);
        const pool = await getConnection();

        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
                SELECT DISTINCT p.Name, p.Module
                FROM [Identity].[Permissions] p
                JOIN [Identity].[RolePermissions] rp ON rp.PermissionId = p.Id
                JOIN [Identity].[UserRoles] ur ON ur.RoleId = rp.RoleId
                WHERE ur.UserId = @userId
            `);

        // Agrupar por módulo para facilitar uso en frontend
        const permissionsByModule = {};
        for (const row of result.recordset) {
            if (!permissionsByModule[row.Module]) {
                permissionsByModule[row.Module] = [];
            }
            const action = row.Name.split('.')[1]; // 'hallazgos.ver' → 'ver'
            permissionsByModule[row.Module].push(action);
        }

        return res.json(permissionsByModule);
    } catch (error) {
        return sendServerError(res, 'Error al obtener permisos del usuario', error);
    }
};
