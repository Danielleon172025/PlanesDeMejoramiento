import { getConnection } from '../config/db.js';
import sql from 'mssql';

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const SYSTEM_USER_ID = '0'; // Changed to 0 since IDs might be integers

// Keep the old isGuid for compatibility with other controllers
export const isGuid = (value) => typeof value === 'string' && GUID_REGEX.test(value);

// We use isValidId specifically for getActorUserId to allow Database IDs (7, 12, etc)
export const isValidId = (value) => {
    if (!value) return false;
    // Allow both GUIDs and numeric strings
    if (typeof value === 'string' && GUID_REGEX.test(value)) return true;
    if (!isNaN(parseInt(value, 10))) return true;
    return false;
};

export const getActorUserId = (req) => {
    const candidates = [
        req.headers['x-user-id'],
        req.headers['x-actor-user'],
        req.body?.userId,
        req.query?.userId,
    ];

    const found = candidates.find((candidate) => isValidId(candidate));
    return found || SYSTEM_USER_ID;
};

export const ROLES = {
    ADMINISTRADOR: 'Administrador',
    CONTROL_INTERNO: 'Control Interno',
    LIDER: 'Líder',
    CONSULTA: 'Consulta'
};

export const getUserRole = async (userId) => {
    if (!isGuid(userId)) return null;

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
                SELECT TOP 1 r.Name
                FROM [Identity].[UserRoles] ur
                INNER JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
                WHERE ur.UserId = @userId
            `);

        return result.recordset.length > 0 ? result.recordset[0].Name : null;
    } catch (error) {
        console.error('Error fetching user role:', error);
        return null;
    }
};
