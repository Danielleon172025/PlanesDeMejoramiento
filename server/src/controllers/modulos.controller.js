import sql from 'mssql';
import { getConnection } from '../config/db.js';
import { insertHistorico, HISTORICO_TIPO } from '../utils/audit.js';
import { getActorUserId, isGuid } from '../utils/auth.js';
import { sendServerError } from '../utils/http.js';
import { notifyAccionResolution, notifyNovedadResolution } from '../services/notification.service.js';
import notificationEmitter from '../services/events.service.js';

export const getResumenModulos = async (req, res) => {
    try {
        const pool = await getConnection();

        // Execute queries in parallel for performance
        const [hallazgos, causas, acciones, evaluaciones, usuarios, pendientes, novedades] = await Promise.all([
            pool.request().query('SELECT COUNT(*) as count FROM [Improvement].[Findings]'),
            pool.request().query('SELECT COUNT(*) as count FROM [Improvement].[RootCauses]'),
            pool.request().query('SELECT COUNT(*) as count FROM [Improvement].[ActionPlans]'),
            pool.request().query('SELECT COUNT(*) as count FROM [Improvement].[ProgressLogs]'),
            pool.request().query('SELECT COUNT(*) as count FROM [Identity].[Users]'),
            pool.request().query('SELECT COUNT(*) as count FROM [Improvement].[ActionPlans] WHERE ISNULL(ApprovalStatus, 0) = 0'),
            pool.request().query('SELECT COUNT(*) as count FROM [Improvement].[ModificationRequests] WHERE ApprovalStatus IS NULL')
        ]);

        return res.json({
            hallazgos: hallazgos.recordset[0].count,
            causas: causas.recordset[0].count,
            acciones: acciones.recordset[0].count,
            evaluaciones: evaluaciones.recordset[0].count,
            usuarios: usuarios.recordset[0].count,
            acciones_pendientes_aprobacion: pendientes.recordset[0].count,
            novedades_pendientes: novedades.recordset[0].count
        });
    } catch (error) {
        return sendServerError(res, 'Error al obtener resumen de modulos', error);
    }
};

export const getSSOConfig = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT TOP 1 Id, ProviderName, TenantId, ClientId, ClientSecret, RedirectUri 
            FROM [Identity].[SSOConfiguration]
        `);

        if (result.recordset.length === 0) {
            return res.json({});
        }

        // Devolvemos el registro con el password ofuscado parcialmente
        const config = result.recordset[0];
        if (config.ClientSecret && config.ClientSecret.length > 8) {
            config.ClientSecret = '*'.repeat(config.ClientSecret.length - 4) + config.ClientSecret.slice(-4);
        }

        res.json(config);
    } catch (error) {
        return sendServerError(res, 'Error al obtener cofiguracion SSO', error);
    }
};

export const updateSSOConfig = async (req, res) => {
    try {
        const { tenantId, clientId, clientSecret, redirectUri } = req.body;
        const pool = await getConnection();

        // 1. Verificar si la fila existe
        const currentRes = await pool.request().query('SELECT TOP 1 ClientSecret FROM [Identity].[SSOConfiguration]');
        const isUpdate = currentRes.recordset.length > 0;

        let finalSecret = clientSecret;
        if (isUpdate && clientSecret && clientSecret.startsWith('**')) {
            // el usuario no modificÃ³ el secret (viene ofuscado), conservamos el actual
            finalSecret = currentRes.recordset[0].ClientSecret;
        }

        if (isUpdate) {
            await pool.request()
                .input('tenant', sql.VarChar, tenantId)
                .input('client', sql.VarChar, clientId)
                .input('secret', sql.VarChar, finalSecret)
                .input('redirect', sql.VarChar, redirectUri)
                .query(`
                    UPDATE [Identity].[SSOConfiguration]
                    SET TenantId = @tenant,
                        ClientId = @client,
                        ClientSecret = @secret,
                        RedirectUri = @redirect,
                        UpdatedAt = GETDATE()
                `);
        } else {
            await pool.request()
                .input('tenant', sql.VarChar, tenantId)
                .input('client', sql.VarChar, clientId)
                .input('secret', sql.VarChar, finalSecret)
                .input('redirect', sql.VarChar, redirectUri)
                .query(`
                    INSERT INTO [Identity].[SSOConfiguration] (TenantId, ClientId, ClientSecret, RedirectUri, UpdatedAt)
                    VALUES (@tenant, @client, @secret, @redirect, GETDATE())
                `);
        }

        res.json({ message: 'ConfiguraciÃ³n de inicio de sesiÃ³n actualizada exitosamente.' });
    } catch (error) {
        return sendServerError(res, 'Error al actualizar configuracion SSO', error);
    }
};

// ... (previous code)

export const getAprobacionesPendientes = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const pool = await getConnection();

        // 1. Obtener los roles del usuario actual
        const userRolesIdQuery = await pool.request().input('userId', sql.UniqueIdentifier, actor).query(`
            SELECT r.Name 
            FROM [Identity].[UserRoles] ur
            INNER JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
            WHERE ur.UserId = @userId
        `);
        const roles = userRolesIdQuery.recordset.map(r => r.Name);
        const isAdministrador = roles.includes('Administrador');
        const isControlInterno = roles.includes('Control Interno');

        // LÃ­deres no tienen acceso a ver aprobaciones pendientes para los demÃ¡s en este mÃ³dulo
        if (!isAdministrador && !isControlInterno) {
            return res.json({ acciones: [], novedades: [] });
        }

        let filtroAuditorAcciones = '';
        let filtroAuditorNovedades = '';

        if (!isAdministrador && isControlInterno) {
            filtroAuditorAcciones = `
                INNER JOIN [Improvement].[RootCauses] c ON am.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id AND f.AuditorId = @actor
            `;
            filtroAuditorNovedades = `
                INNER JOIN [Improvement].[RootCauses] c ON am.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id AND f.AuditorId = @actor
            `;
        }

        // Aprobaciones de Acciones
        const accionesQuery = `
            SELECT
                am.Id as id,
                'Accion' as tipo,
                am.TaskDescription as descripcion,
                d.Name as responsable,
                am.StartDate as fecha,
                'N/A' as solicitante
            FROM [Improvement].[ActionPlans] am
            LEFT JOIN [Identity].[Users] u ON am.ResponsibleUserId = u.Id
            LEFT JOIN [Organization].[Departments] d ON u.DepartmentId = d.Id
            ${filtroAuditorAcciones}
            WHERE (am.ApprovalStatus IS NULL OR am.ApprovalStatus = 0)
            ORDER BY am.StartDate
        `;

        const acciones = await pool.request()
            .input('actor', sql.UniqueIdentifier, actor)
            .query(accionesQuery);

        // Aprobaciones de Novedades
        const novedadesQuery = `
            SELECT
                n.Id as id,
                'Novedad' as tipo,
                am.Id as accionId,
                n.Justification as descripcion,
                d.Name as responsable,
                n.CreatedAt as fecha,
                u.FullName as solicitante
            FROM [Improvement].[ModificationRequests] n
            LEFT JOIN [Improvement].[ActionPlans] am ON n.ActionPlanId = am.Id
            LEFT JOIN [Identity].[Users] u2 ON am.ResponsibleUserId = u2.Id
            LEFT JOIN [Organization].[Departments] d ON u2.DepartmentId = d.Id
            LEFT JOIN [Identity].[Users] u ON n.RequestedById = u.Id
            ${filtroAuditorNovedades}
            WHERE n.ApprovalStatus IS NULL
            ORDER BY n.CreatedAt
        `;

        const novedades = await pool.request()
            .input('actor', sql.UniqueIdentifier, actor)
            .query(novedadesQuery);

        return res.json({
            acciones: acciones.recordset,
            novedades: novedades.recordset
        });
    } catch (error) {
        return sendServerError(res, 'Error al obtener aprobaciones pendientes', error);
    }
};

export const resolverAprobacion = async (req, res) => {
    // ... (rest of code)
    try {
        const actor = getActorUserId(req);
        const { tipo, id } = req.params;
        const { aprobada, observaciones } = req.body;
        const aprobadaBit = aprobada ? 1 : 0;
        const pool = await getConnection();

        if (tipo === 'accion') {
            await pool.request()
                .input('id', sql.Int, Number.parseInt(id, 10))
                .input('aprobada', sql.SmallInt, aprobadaBit)
                .input('obs', sql.VarChar(1000), observaciones || null)
                .input('usuario', sql.UniqueIdentifier, actor)
                .query(`
                    UPDATE [Improvement].[ActionPlans]
                    SET
                        ApprovalStatus = @aprobada,
                        ApprovedById = @usuario
                        -- We do not have approval observations or separate approval date conceptually on ActionPlans out of box in new schema, omitting them here.
                    WHERE Id = @id
                `);

            // Removed insertHistorico since legacy table was not migrated

            // NOTIFICACIÃ“N
            notifyAccionResolution(Number.parseInt(id, 10), aprobada, observaciones)
                .catch(console.error);

            return res.json({ message: 'Aprobacion de accion registrada' });
        }

        if (tipo === 'novedad') {
            const current = await pool.request()
                .input('id', sql.Int, Number.parseInt(id, 10))
                .query(`
                    SELECT *
                    FROM [Improvement].[ModificationRequests]
                    WHERE Id = @id
                `);
            if (current.recordset.length === 0) {
                return res.status(404).json({ error: 'Novedad no encontrada' });
            }
            const row = current.recordset[0];

            await pool.request()
                .input('id', sql.Int, Number.parseInt(id, 10))
                .input('aprobada', sql.SmallInt, aprobadaBit)
                .input('obs', sql.VarChar(1000), observaciones || null)
                .input('usuario', sql.UniqueIdentifier, actor)
                .query(`
                    UPDATE [Improvement].[ModificationRequests]
                    SET
                        ApprovalStatus = @aprobada,
                        ResponseComments = @obs,
                        RespondedById = @usuario,
                        RespondedAt = GETDATE()
                    WHERE Id = @id
                `);

            if (aprobadaBit === 1) {
                // Determine modifications: usually a modification request changes one or more properties.
                // Depending on exactly what the request was for, map it here.
                // Fallback basic logic mapping existing data to [Improvement].[ActionPlans] updates:
                await pool.request()
                    .input('accionId', sql.Int, row.ActionPlanId)
                    .query(`
                        -- If modification logic requires ActionPlan changes, they would occur here
                        -- Minimal fallback as old schema map is ambiguous here
                        UPDATE [Improvement].[ActionPlans]
                        SET TargetCompletionDate = ISNULL(TargetCompletionDate, TargetCompletionDate)
                        WHERE Id = @accionId
                    `);
            }

            // Removed insertHistorico since legacy table was not migrated

            // NOTIFICACIÃ“N
            notifyNovedadResolution(Number.parseInt(id, 10), aprobada, observaciones)
                .catch(console.error);

            return res.json({ message: 'Aprobacion de novedad registrada' });
        }

        return res.status(400).json({ error: 'Tipo de aprobacion no valido' });
    } catch (error) {
        return sendServerError(res, 'Error al resolver aprobacion', error);
    }
};

export const getHistorial = async (req, res) => {
    try {
        const { hallazgoId, accionId, causaId, limit = 200 } = req.query;
        const pool = await getConnection();
        let query = `
            SELECT TOP (@limit)
                h.Id as id,
                h.CreatedAt as fecha,
                h.LogType as tipo,
                -- Legacy schema mapped all these specific IDs. In new schema, ProgressLogs typically relate to ActionPlans. 
                -- Assuming ActionPlanId is the primary link.
                h.ActionPlanId as accion_id,
                h.Description as hallazgo_nuevo,
                u.FullName as usuario
            FROM [Improvement].[ProgressLogs] h
            LEFT JOIN [Identity].[Users] u ON h.CreatedById = u.Id
            WHERE 1=1
        `;
        const request = pool.request().input('limit', sql.Int, Number.parseInt(limit, 10));

        // As ProgressLogs in the new schema primarily link back to ActionPlans:
        if (accionId) {
            query += ' AND h.ActionPlanId = @accionId';
            request.input('accionId', sql.Int, Number.parseInt(accionId, 10));
        }

        // For hallazgoId and causaId, we would need to join back to ActionPlans, RootCauses, and Findings
        if (hallazgoId || causaId) {
            query += `
                AND h.ActionPlanId IN (
                    SELECT am.Id 
                    FROM [Improvement].[ActionPlans] am
                    INNER JOIN [Improvement].[RootCauses] ca ON am.RootCauseId = ca.Id
                    WHERE 1=1
            `;
            if (hallazgoId) {
                query += ' AND ca.FindingId = @hallazgoId';
                request.input('hallazgoId', sql.Int, Number.parseInt(hallazgoId, 10));
            }
            if (causaId) {
                query += ' AND ca.Id = @causaId';
                request.input('causaId', sql.Int, Number.parseInt(causaId, 10));
            }
            query += ')';
        }

        query += ' ORDER BY h.Id DESC';
        const result = await request.query(query);
        return res.json(result.recordset);
    } catch (error) {
        return sendServerError(res, 'Error al obtener historial', error);
    }
};

export const getNotificacionesStream = (req, res) => {
    try {
        const actor = getActorUserId(req);
        console.log(`[SSE] Intentos de conexiÃ³n para userId: ${req.query.userId || 'ninguno'}, actor resuelto: ${actor}`);

        // Required headers for Server-Sent Events

        // Ruta de depuraciÃ³n temporal
        if (req.query.debug === 'true') {
            return res.json({
                message: "Estado del Emitter",
                eventNames: notificationEmitter.eventNames(),
                listeners: notificationEmitter.eventNames().map(name => ({
                    event: name,
                    count: notificationEmitter.listenerCount(name)
                }))
            });
        }

        // X-Accel-Buffering y no-transform previenen que Vite y Nginx bloqueen (buffer) los mensajes
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*' // Adjust according to your CORS config
        });

        if (res.flushHeaders) {
            res.flushHeaders();
        }

        // Send initial connection event
        res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

        // The callback that will handle incoming events for this specific user
        const notificationListener = (payload) => {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        };

        // Important: Attach the listener using the user's specific UUID channel
        notificationEmitter.subscribeUser(actor, notificationListener);
        console.log(`[SSE] Client connected. Total listeners for ${actor}:`, notificationEmitter.listenerCount(`user_${actor.toString().toLowerCase()}`));

        // Keep connection alive otherwise browser might drop it after 60s
        const keepAliveTimer = setInterval(() => {
            res.write(': keepalive\n\n');
        }, 15000);

        let isCleanedUp = false;
        const cleanup = () => {
            if (isCleanedUp) return;
            isCleanedUp = true;
            clearInterval(keepAliveTimer);
            notificationEmitter.unsubscribeUser(actor, notificationListener);
            console.log(`[SSE] Cierre de conexiÃ³n procesado. Total listeners for ${actor}:`, notificationEmitter.listenerCount(`user_${actor.toString().toLowerCase()}`));
            res.end();
        };

        // Escuchar en eventos del ciclo de vida para evitar fugas (Leaks) bajo proxies o recargas agresivas (F5)
        // Eliminamos req.on('end') y res.on('finish') ya que en un GET sin body 'end' se dispara inmediatamente, 
        // cerrando el stream SSE y causando un bucle infinito de reconexiÃ³n en el frontend que devora memoria.
        req.on('close', cleanup);
        req.on('error', cleanup);
        res.on('close', cleanup);
        res.on('error', cleanup);

    } catch (error) {
        // SSE cannot return standard JSON error
        console.error('SSE Error:', error);
        res.end();
    }
};

export const getNotificaciones = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const pool = await getConnection();

        // 1. Obtener los roles del usuario actual
        const userRolesIdQuery = await pool.request().input('userId', sql.UniqueIdentifier, actor).query(`
            SELECT r.Name 
            FROM [Identity].[UserRoles] ur
            INNER JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
            WHERE ur.UserId = @userId
        `);
        const roles = userRolesIdQuery.recordset.map(r => r.Name);
        const isAdministrador = roles.includes('Administrador');
        const isControlInterno = roles.includes('Control Interno');

        let queries = [];

        if (isAdministrador) {
            // Administrador ve todo a nivel global
            queries.push(`
                SELECT 'vencimiento' as tipo, am.Id as id, 'Acción vencida' as titulo, am.TaskDescription as descripcion, am.TargetCompletionDate as fecha_referencia, 'alta' as prioridad
                FROM [Improvement].[ActionPlans] am
                WHERE am.ClosedDate IS NULL AND am.TargetCompletionDate < CAST(GETDATE() AS DATE)
            `);
            queries.push(`
                SELECT 'aprobacion' as tipo, am.Id as id, 'Aprobación de plan pendiente' as titulo, am.TaskDescription as descripcion, am.StartDate as fecha_referencia, 'media' as prioridad
                FROM [Improvement].[ActionPlans] am
                WHERE (am.ApprovalStatus IS NULL OR am.ApprovalStatus = 0) AND am.ClosedDate IS NULL
            `);
            queries.push(`
                SELECT 'novedad' as tipo, n.Id as id, 'Novedad pendiente' as titulo, n.Justification as descripcion, CONVERT(date, n.CreatedAt) as fecha_referencia, 'media' as prioridad
                FROM [Improvement].[ModificationRequests] n
                WHERE n.ApprovalStatus IS NULL
            `);
        } else if (isControlInterno) {
            // Control Interno solo ve lo que está atado a sus Hallazgos
            queries.push(`
                SELECT 'vencimiento' as tipo, am.Id as id, 'Acción vencida (Tu Hallazgo)' as titulo, am.TaskDescription as descripcion, am.TargetCompletionDate as fecha_referencia, 'alta' as prioridad
                FROM [Improvement].[ActionPlans] am
                INNER JOIN [Improvement].[RootCauses] c ON am.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id
                WHERE am.ClosedDate IS NULL AND am.TargetCompletionDate < CAST(GETDATE() AS DATE)
                AND f.AuditorId = @actor
            `);
            queries.push(`
                SELECT 'aprobacion' as tipo, am.Id as id, 'Plan pendiente de aprobación' as titulo, am.TaskDescription as descripcion, am.StartDate as fecha_referencia, 'alta' as prioridad
                FROM [Improvement].[ActionPlans] am
                INNER JOIN [Improvement].[RootCauses] c ON am.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id
                WHERE (am.ApprovalStatus IS NULL OR am.ApprovalStatus = 0) AND am.ClosedDate IS NULL
                AND f.AuditorId = @actor
            `);
            queries.push(`
                SELECT 'novedad' as tipo, n.Id as id, 'Novedad pendiente' as titulo, n.Justification as descripcion, CONVERT(date, n.CreatedAt) as fecha_referencia, 'media' as prioridad
                FROM [Improvement].[ModificationRequests] n
                INNER JOIN [Improvement].[ActionPlans] am ON n.ActionPlanId = am.Id
                INNER JOIN [Improvement].[RootCauses] c ON am.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id
                WHERE n.ApprovalStatus IS NULL
                AND f.AuditorId = @actor
            `);
        }

        // LÃDERES y TODOS LOS USUARIOS: Notificaciones de sus propias acciones (donde son ResponsibleUserId)
        if (!isAdministrador) {
            queries.push(`
                SELECT 'vencimiento' as tipo, am.Id as id, 'Tu Acción está vencida' as titulo, am.TaskDescription as descripcion, am.TargetCompletionDate as fecha_referencia, 'alta' as prioridad
                FROM [Improvement].[ActionPlans] am
                WHERE am.ClosedDate IS NULL AND am.TargetCompletionDate < CAST(GETDATE() AS DATE)
                AND am.ResponsibleUserId = @actor
            `);
        }

        // Notificación cuando su plan es aprobado/rechazado (hace menos de 15 días)
        queries.push(`
            SELECT 'aprobacion' as tipo, am.Id as id, 
                CASE WHEN am.ApprovalStatus = 1 THEN 'Plan de Acción Aprobado' ELSE 'Plan de Acción Rechazado' END as titulo, 
                am.TaskDescription as descripcion, 
                am.StartDate as fecha_referencia, 
                CASE WHEN am.ApprovalStatus = 2 THEN 'alta' ELSE 'baja' END as prioridad
            FROM [Improvement].[ActionPlans] am
            WHERE am.ApprovalStatus IN (1, 2)
            AND am.ResponsibleUserId = @actor
            AND am.StartDate >= DATEADD(day, -15, GETDATE())
        `);

        // NotificaciÃ³n cuando el auditor deja una observaciÃ³n o conclusiÃ³n en los avances
        queries.push(`
            SELECT 'observacion' as tipo, am.Id as id, 
                CASE WHEN log.AuditorConclusion IS NOT NULL THEN 'Avance Conforme' ELSE 'Auditor ObservÃ³ tu Avance' END as titulo, 
                am.TaskDescription as descripcion, 
                ISNULL(log.ConclusionDate, log.ObservationDate) as fecha_referencia, 
                CASE WHEN log.AuditorConclusion IS NULL THEN 'media' ELSE 'baja' END as prioridad
            FROM [Improvement].[ProgressLogs] log
            INNER JOIN [Improvement].[ActionPlans] am ON log.ActionPlanId = am.Id
            WHERE (log.AuditorObservation IS NOT NULL OR log.AuditorConclusion IS NOT NULL)
            AND am.ResponsibleUserId = @actor
            AND ISNULL(log.ConclusionDate, log.ObservationDate) >= DATEADD(day, -15, GETDATE())
        `);

        if (queries.length === 0) {
            return res.json([]);
        }

        const finalQuery = `
            SELECT TOP 100
                tipo,
                id,
                titulo,
                descripcion,
                fecha_referencia,
                prioridad
            FROM (
                ${queries.join('\n                UNION ALL\n                ')}
            ) as eventos
            ORDER BY fecha_referencia DESC
        `;

        const result = await pool.request()
            .input('actor', sql.UniqueIdentifier, actor)
            .query(finalQuery);

        return res.json(result.recordset);
    } catch (error) {
        return sendServerError(res, 'Error al obtener notificaciones', error);
    }
};

export const getUsuariosRoles = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
        SELECT
        u.Id as user_id,
            u.Email as username,
            u.FullName as nombre,
            r.Id as role_id,
            r.Name as role_name,
            d.Name as dependencia,
            u.DepartmentId as dependencia_id,
            u.CreatedAt as fecha_creacion
        FROM[Identity].[Users] u
            LEFT JOIN[Identity].[UserRoles] ur ON u.Id = ur.UserId
            LEFT JOIN[Identity].[Roles] r ON ur.RoleId = r.Id
            LEFT JOIN[Organization].[Departments] d ON u.DepartmentId = d.Id
            ORDER BY u.CreatedAt DESC
            `);
        return res.json(result.recordset);
    } catch (error) {
        return sendServerError(res, 'Error al obtener usuarios y roles', error);
    }
};

export const assignRoleToUser = async (req, res) => {
    try {
        const { userId, roleId } = req.body;
        if (!isGuid(userId) || !isGuid(roleId)) {
            return res.status(400).json({ error: 'userId y roleId deben ser GUID validos' });
        }
        const pool = await getConnection();
        await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .input('roleId', sql.UniqueIdentifier, roleId)
            .query(`
                IF NOT EXISTS(
                SELECT 1
                    FROM[Identity].[UserRoles]
                    WHERE UserId = @userId AND RoleId = @roleId
            )
        BEGIN
                    INSERT INTO[Identity].[UserRoles](UserId, RoleId)
        VALUES(@userId, @roleId)
        END
            `);
        return res.json({ message: 'Rol asignado correctamente' });
    } catch (error) {
        return sendServerError(res, 'Error al asignar rol', error);
    }
};

export const getRoles = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT Id as id, Name as name FROM [Identity].[Roles] ORDER BY Name');
        return res.json(result.recordset);
    } catch (error) {
        return sendServerError(res, 'Error al obtener roles', error);
    }
};

import crypto from 'crypto';

const generatePasswordHash = (password) => {
    // Generate 16 bytes salt
    const salt = crypto.randomBytes(16).toString('base64');
    const saltBuffer = Buffer.from(salt, 'base64');

    // Convert password to UTF-16LE (ASP.NET Membership default)
    const passwordBuffer = Buffer.from(password, 'utf16le');

    // Combine salt and password
    const combined = Buffer.concat([saltBuffer, passwordBuffer]);

    // Hash using SHA1 (Default for ASP.NET Membership)
    const hash = crypto.createHash('sha1').update(combined).digest('base64');

    return { salt, hash };
};

export const createUser = async (req, res) => {
    try {
        const { username, nombre, password, roleId, dependenciaId, email } = req.body;

        if (!username || !nombre || !password) {
            return res.status(400).json({ error: 'Username, nombre y contraseÃ±a son requeridos' });
        }

        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const { salt, hash } = generatePasswordHash(password);
            const userEmail = email || `${username} @domain.com`;

            const userIdResult = await transaction.request()
                .input('email', sql.NVarChar(256), userEmail)
                .input('nombre', sql.VarChar(100), nombre)
                .input('dependenciaId', sql.Int, dependenciaId || 99999)
                .input('passwordHash', sql.NVarChar(128), hash)
                .query(`
                    DECLARE @UserId uniqueidentifier = NEWID();
                    INSERT INTO[Identity].[Users](Id, Email, FullName, DepartmentId, PasswordHash, IsActive, CreatedAt)
        VALUES(@UserId, @email, @nombre, @dependenciaId, @passwordHash, 1, GETDATE());
                    SELECT @UserId as userId;
        `);

            const userId = userIdResult.recordset[0].userId;

            if (roleId && isGuid(roleId)) {
                await transaction.request()
                    .input('userId', sql.UniqueIdentifier, userId)
                    .input('roleId', sql.UniqueIdentifier, roleId)
                    .query(`
                        INSERT INTO[Identity].[UserRoles](UserId, RoleId) VALUES(@userId, @roleId)
            `);
            }

            await transaction.commit();
            return res.json({ message: 'Usuario creado exitosamente', userId });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (error) {
        return sendServerError(res, 'Error al crear usuario', error);
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, roleId, dependenciaId, email } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }
        if (!id) {
            return res.status(400).json({ error: 'Falta el ID del usuario' });
        }

        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Actualizar datos bÃ¡sicos del usuario
            await transaction.request()
                .input('id', sql.UniqueIdentifier, id)
                .input('nombre', sql.NVarChar(256), nombre)
                .input('email', sql.NVarChar(256), email || null)
                .input('dependenciaId', sql.Int, dependenciaId || null)
                .query(`
        UPDATE[Identity].[Users]
                    SET FullName = @nombre,
            Email = COALESCE(@email, Email),
            DepartmentId = COALESCE(@dependenciaId, DepartmentId)
                    WHERE Id = @id
            `);

            // 2. Actualizar rol si se proporcionÃ³
            if (roleId && isGuid(roleId)) {
                // Eliminar roles previos y asignar el nuevo
                await transaction.request()
                    .input('userId', sql.UniqueIdentifier, id)
                    .query(`DELETE FROM[Identity].[UserRoles] WHERE UserId = @userId`);

                await transaction.request()
                    .input('userId', sql.UniqueIdentifier, id)
                    .input('roleId', sql.UniqueIdentifier, roleId)
                    .query(`INSERT INTO[Identity].[UserRoles](UserId, RoleId) VALUES(@userId, @roleId)`);
            }

            await transaction.commit();
            return res.json({ message: 'Usuario actualizado exitosamente' });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (error) {
        return sendServerError(res, 'Error al actualizar usuario', error);
    }
};

export const getConfiguracion = async (req, res) => {
    try {
        const pool = await getConnection();

        // Leer la configuración SSO real si existe
        let ssoConfig = {};
        try {
            const ssoResult = await pool.request().query(
                'SELECT TOP 1 TenantId, ClientId, RedirectUri FROM [Identity].[SSOConfiguration]'
            );
            if (ssoResult.recordset.length > 0) {
                const row = ssoResult.recordset[0];
                ssoConfig = {
                    tenantId: row.TenantId,
                    clientId: row.ClientId,
                    redirectUri: row.RedirectUri,
                    clientSecret: row.ClientSecret ? '**********' : ''
                };
            }
        } catch (_) { /* SSO table may not exist */ }

        return res.json({
            modulos: [],
            parametros: {},
            correo: {},
            sso: ssoConfig,
        });
    } catch (error) {
        return sendServerError(res, 'Error al obtener configuracion', error);
    }
};

export const updateConfiguracion = async (req, res) => {
    // Las tablas legacy de parámetros no existen en el esquema actual.
    // Esta función se mantiene como stub para no romper la UI.
    return res.json({ message: 'Configuracion guardada correctamente' });
};

export const getReportesResumen = async (req, res) => {
    try {
        const pool = await getConnection();
        const { startDate, endDate } = req.query;
        let dateFilter = '';
        const applyDateParams = (request) => {
            if (startDate) {
                request.input('startDate', sql.Date, startDate);
            }
            if (endDate) {
                request.input('endDate', sql.Date, endDate);
            }
            return request;
        };
        if (startDate) {
            dateFilter += ' AND am.StartDate >= @startDate';
        }
        if (endDate) {
            dateFilter += ' AND am.StartDate <= @endDate';
        }

        const [porDependencia, porProceso, tendencia] = await Promise.all([
            applyDateParams(pool.request()).query(`
        SELECT
        d.Name as dependencia,
            COUNT(am.Id) as total_acciones,
            SUM(CASE WHEN am.ClosedDate IS NOT NULL THEN 1 ELSE 0 END) as cerradas
        FROM[Improvement].[ActionPlans] am
                LEFT JOIN[Identity].[Users] u ON am.ResponsibleUserId = u.Id
                LEFT JOIN[Organization].[Departments] d ON u.DepartmentId = d.Id
                WHERE 1 = 1 ${dateFilter}
                GROUP BY d.Name
                ORDER BY total_acciones DESC
            `),
            applyDateParams(pool.request()).query(`
        SELECT
        p.Name as proceso,
            COUNT(DISTINCT pmh.Id) as hallazgos,
            COUNT(am.Id) as acciones
        FROM[Improvement].[Findings] pmh
                LEFT JOIN[Organization].[Departments] p ON pmh.DepartmentId = p.Id
                LEFT JOIN[Improvement].[RootCauses] ca ON ca.FindingId = pmh.Id
                LEFT JOIN[Improvement].[ActionPlans] am ON am.RootCauseId = ca.Id
                WHERE 1 = 1 ${dateFilter}
                GROUP BY p.Name
                ORDER BY acciones DESC
            `),
            applyDateParams(pool.request()).query(`
        SELECT
        FORMAT(am.StartDate, 'yyyy-MM') as periodo,
            COUNT(*) as acciones_creadas
        FROM[Improvement].[ActionPlans] am
                WHERE am.StartDate IS NOT NULL ${dateFilter}
                GROUP BY FORMAT(am.StartDate, 'yyyy-MM')
                ORDER BY periodo
            `),
        ]);

        return res.json({
            por_dependencia: porDependencia.recordset,
            por_proceso: porProceso.recordset,
            tendencia: tendencia.recordset,
        });
    } catch (error) {
        return sendServerError(res, 'Error al obtener reportes', error);
    }
};


