import { getConnection } from '../config/db.js';
import sql from 'mssql';
import { sendServerError } from '../utils/http.js';
import { getActorUserId } from '../utils/auth.js';

/**
 * Validar si un string es un GUID válido
 */
const isValidGuid = (guid) => {
    if (!guid || guid === '') return false;
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(guid);
};

/**
 * Resuelve rol y departamento del actor, y devuelve el filtro SQL a aplicar.
 * Admin y ControlInterno ven todo (filtro vacío).
 * Líder y Consulta sólo ven su dependencia.
 * @returns {{ roleFilter: string, deptId: number|null, restricted: boolean }}
 */
const resolveRoleFilter = async (pool, actorId) => {
    if (!actorId) return { roleFilter: '', deptId: null, restricted: false };

    const userQuery = await pool.request()
        .input('userId', sql.UniqueIdentifier, actorId)
        .query(`
            SELECT u.DepartmentId, r.Name as RoleName
            FROM [Identity].[Users] u
            LEFT JOIN [Identity].[UserRoles] ur ON u.Id = ur.UserId
            LEFT JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
            WHERE u.Id = @userId
        `);

    const roles = userQuery.recordset.map(r => r.RoleName);
    const isAdmin = roles.includes('Administrador');
    const isAuditor = roles.includes('Control Interno');
    const deptId = userQuery.recordset[0]?.DepartmentId ?? null;

    if (isAdmin || isAuditor) {
        return { roleFilter: '', deptId: null, restricted: false };
    }
    if (!deptId) {
        // Sin departamento asignado → devolver filtro imposible (sin datos)
        return { roleFilter: 'AND 1 = 0', deptId: null, restricted: true };
    }
    return {
        roleFilter: 'AND am.ResponsibleUserId IN (SELECT Id FROM [Identity].[Users] WHERE DepartmentId = @userDepartmentId)',
        deptId,
        restricted: true,
    };
};

/**
 * Obtener KPIs del dashboard
 */
export const getKPIs = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const pool = await getConnection();
        const { startDate, endDate } = req.query;

        // Validar rol y departamento del actor
        const userQuery = await pool.request().input('userId', sql.UniqueIdentifier, actor).query(`
            SELECT u.DepartmentId, r.Name as RoleName
            FROM [Identity].[Users] u
            LEFT JOIN [Identity].[UserRoles] ur ON u.Id = ur.UserId
            LEFT JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
            WHERE u.Id = @userId
        `);

        const roles = userQuery.recordset.map(r => r.RoleName);
        const isAdministrador = roles.includes('Administrador');
        const isControlInterno = roles.includes('Control Interno');
        const userDepartmentId = userQuery.recordset[0]?.DepartmentId;
        const requiresDepartmentFilter = !isAdministrador && !isControlInterno;

        let dateFilter = "";
        let roleFilter = "";

        if (requiresDepartmentFilter) {
            if (!userDepartmentId) {
                return res.json({
                    total_hallazgos: 0, total_acciones: 0, acciones_cerradas: 0, avance_global: "0.0"
                });
            }
            roleFilter = "AND am.ResponsibleUserId IN (SELECT Id FROM [Identity].[Users] WHERE DepartmentId = @userDepartmentId)";
        }

        if (startDate && endDate) {
            dateFilter = "AND am.StartDate BETWEEN @startDate AND @endDate";
        } else if (startDate) {
            dateFilter = "AND am.StartDate >= @startDate";
        } else if (endDate) {
            dateFilter = "AND am.StartDate <= @endDate";
        }

        const request = pool.request();
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);
        if (requiresDepartmentFilter) request.input('userDepartmentId', sql.Int, userDepartmentId);

        const result = await request.query(`
            DECLARE @total_hallazgos INT = (
            SELECT COUNT(DISTINCT f.Id)
        FROM[Improvement].[Findings] f
                LEFT JOIN[Improvement].[RootCauses] rc ON f.Id = rc.FindingId
                LEFT JOIN[Improvement].[ActionPlans] am ON rc.Id = am.RootCauseId
                WHERE 1 = 1 ${dateFilter} ${roleFilter}
            );
            DECLARE @hallazgos_sin_gestion INT = (
                SELECT COUNT(DISTINCT f.Id)
                FROM [Improvement].[Findings] f
                LEFT JOIN [Improvement].[RootCauses] rc ON f.Id = rc.FindingId
                LEFT JOIN [Improvement].[ActionPlans] am ON rc.Id = am.RootCauseId
                WHERE am.Id IS NULL
            );
            DECLARE @total_acciones INT = (
    SELECT COUNT(*)
FROM[Improvement].[ActionPlans] am 
                WHERE 1 = 1 ${dateFilter} ${roleFilter}
            );
            DECLARE @acciones_sin_gestion INT = (
                SELECT COUNT(am.Id)
                FROM [Improvement].[ActionPlans] am
                LEFT JOIN [Improvement].[ProgressLogs] pl ON am.Id = pl.ActionPlanId
                WHERE pl.Id IS NULL
                ${dateFilter} ${roleFilter}
            );
            DECLARE @acciones_cerradas INT = (
    SELECT COUNT(*)
FROM[Improvement].[ActionPlans] am 
                WHERE am.ClosedDate IS NOT NULL
                ${dateFilter} ${roleFilter}
            );
            DECLARE @acciones_vencidas INT = (
    SELECT COUNT(*)
FROM[Improvement].[ActionPlans] am 
                WHERE am.ClosedDate IS NULL 
                AND am.TargetCompletionDate < GETDATE()
                ${dateFilter} ${roleFilter}
            );
            DECLARE @acciones_proximas INT = (
    SELECT COUNT(*)
FROM[Improvement].[ActionPlans] am 
                WHERE am.ClosedDate IS NULL 
                AND am.TargetCompletionDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE())
                ${dateFilter} ${roleFilter}
            );
            DECLARE @acciones_en_tiempo INT = (
    SELECT COUNT(*)
FROM[Improvement].[ActionPlans] am 
                WHERE am.ClosedDate IS NULL 
                AND am.TargetCompletionDate > DATEADD(day, 30, GETDATE())
                ${dateFilter} ${roleFilter}
            );
            DECLARE @avance_global FLOAT = (
    SELECT ISNULL(AVG(avance_calculado), 0)
FROM(
    SELECT 
                        CASE 
                            WHEN am.TargetQuantity > 0 THEN
    (CAST(ISNULL((
        SELECT TOP 1 PhysicalAdvanceQuantity
                                    FROM[Improvement].[ProgressLogs] 
                                    WHERE ActionPlanId = am.Id 
                                    ORDER BY LogDate DESC
    ), 0) AS FLOAT) / am.TargetQuantity) * 100
                            ELSE 0
END as avance_calculado
FROM[Improvement].[ActionPlans] am
                    WHERE 1 = 1 ${dateFilter} ${roleFilter}
                ) AS avances
            );
            DECLARE @entregables_totales INT = (
    SELECT ISNULL(SUM(CAST(am.TargetQuantity AS DECIMAL(11, 2))), 0)
FROM[Improvement].[ActionPlans] am
                WHERE am.TargetQuantity IS NOT NULL
                ${dateFilter} ${roleFilter}
            );
            DECLARE @entregables_completados INT = (
    SELECT ISNULL(SUM(entregables_realizados), 0)
FROM(
    SELECT 
                        am.Id,
    CAST(ISNULL((
        SELECT TOP 1 PhysicalAdvanceQuantity
                            FROM[Improvement].[ProgressLogs] 
                            WHERE ActionPlanId = am.Id 
                            ORDER BY LogDate DESC
    ), 0) AS DECIMAL(11, 2)) as entregables_realizados
FROM[Improvement].[ActionPlans] am
                    WHERE 1 = 1 ${dateFilter} ${roleFilter}
                ) AS entregas
            );
            DECLARE @procesos_afectados INT = (
    SELECT COUNT(DISTINCT f.DepartmentId)
FROM[Improvement].[Findings] f
                LEFT JOIN[Improvement].[RootCauses] rc ON f.Id = rc.FindingId
                LEFT JOIN[Improvement].[ActionPlans] am ON rc.Id = am.RootCauseId
                WHERE f.DepartmentId IS NOT NULL
                ${dateFilter} ${roleFilter}
            );
            DECLARE @dependencias_involucradas INT = (
    SELECT COUNT(DISTINCT u.DepartmentId)
FROM[Improvement].[ActionPlans] am
                LEFT JOIN[Identity].[Users] u ON am.ResponsibleUserId = u.Id
                WHERE u.DepartmentId IS NOT NULL
                ${dateFilter} ${roleFilter}
            );
            DECLARE @promedio_cumplimiento FLOAT = (
    CASE 
                    WHEN @total_acciones > 0 THEN
CAST(@acciones_cerradas AS FLOAT) / @total_acciones * 100
                    ELSE 0
END
            );
            DECLARE @tiempo_promedio_cierre INT = (
    SELECT ISNULL(AVG(DATEDIFF(day, am.StartDate, am.ClosedDate)), 0)
FROM[Improvement].[ActionPlans] am
                WHERE am.ClosedDate IS NOT NULL
                ${dateFilter}
            );

SELECT
@total_hallazgos as total_hallazgos,
    @hallazgos_sin_gestion as hallazgos_sin_gestion,
    @total_acciones as total_acciones,
    @acciones_sin_gestion as acciones_sin_gestion,
    @acciones_cerradas as acciones_cerradas,
    @acciones_vencidas as acciones_vencidas,
    @acciones_proximas as acciones_proximas,
    @acciones_en_tiempo as acciones_en_tiempo,
    CAST(@avance_global AS DECIMAL(18, 2)) as avance_global,
    @entregables_totales as entregables_totales,
    @entregables_completados as entregables_completados,
    @procesos_afectados as procesos_afectados,
    @dependencias_involucradas as dependencias_involucradas,
    CAST(@promedio_cumplimiento AS DECIMAL(18, 2)) as promedio_cumplimiento,
    @tiempo_promedio_cierre as tiempo_promedio_cierre
`);

        res.json(result.recordset[0]);

    } catch (error) {
        return sendServerError(res, 'Error al obtener KPIs', error);
    }
};

/**
 * KPIs personalizados del usuario autenticado (filtrados por ResponsibleUserId)
 */
export const getUserKPIs = async (req, res) => {
    try {
        const pool = await getConnection();
        const userId = req.headers['x-user-id'];

        if (!userId || !isValidGuid(userId)) {
            return res.status(400).json({ error: 'userId inválido o ausente' });
        }

        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
                DECLARE @total_acciones INT = (
                    SELECT COUNT(*) FROM [Improvement].[ActionPlans]
                    WHERE ResponsibleUserId = @userId
                );
                DECLARE @acciones_cerradas INT = (
                    SELECT COUNT(*) FROM [Improvement].[ActionPlans]
                    WHERE ResponsibleUserId = @userId AND ClosedDate IS NOT NULL
                );
                DECLARE @acciones_vencidas INT = (
                    SELECT COUNT(*) FROM [Improvement].[ActionPlans]
                    WHERE ResponsibleUserId = @userId
                      AND ClosedDate IS NULL
                      AND TargetCompletionDate < GETDATE()
                );
                DECLARE @acciones_proximas INT = (
                    SELECT COUNT(*) FROM [Improvement].[ActionPlans]
                    WHERE ResponsibleUserId = @userId
                      AND ClosedDate IS NULL
                      AND TargetCompletionDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE())
                );
                DECLARE @acciones_en_tiempo INT = (
                    SELECT COUNT(*) FROM [Improvement].[ActionPlans]
                    WHERE ResponsibleUserId = @userId
                      AND ClosedDate IS NULL
                      AND TargetCompletionDate > DATEADD(day, 30, GETDATE())
                );

                SELECT
                    @total_acciones    AS total_acciones,
                    @acciones_cerradas AS acciones_cerradas,
                    @acciones_vencidas AS acciones_vencidas,
                    @acciones_proximas AS acciones_proximas,
                    @acciones_en_tiempo AS acciones_en_tiempo;
            `);

        res.json(result.recordset[0]);
    } catch (error) {
        return sendServerError(res, 'Error al obtener KPIs de usuario', error);
    }
};

/**
 * Obtener datos para gráficas
 */
export const getGraficas = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const pool = await getConnection();
        const { startDate, endDate } = req.query;

        const { roleFilter, deptId, restricted } = await resolveRoleFilter(pool, actor);

        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = 'AND am.StartDate BETWEEN @startDate AND @endDate';
        } else if (startDate) {
            dateFilter = 'AND am.StartDate >= @startDate';
        } else if (endDate) {
            dateFilter = 'AND am.StartDate <= @endDate';
        }

        const request = pool.request();
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);
        if (deptId) request.input('userDepartmentId', sql.Int, deptId);


        const procesos = await request.query(`
SELECT
d.Name as name,
    COUNT(DISTINCT f.Id) as hallazgos
FROM[Improvement].[Findings] f
            LEFT JOIN[Organization].[Departments] d ON f.DepartmentId = d.Id
            LEFT JOIN[Improvement].[RootCauses] rc ON f.Id = rc.FindingId
            LEFT JOIN[Improvement].[ActionPlans] am ON rc.Id = am.RootCauseId
            WHERE d.Name IS NOT NULL
            ${dateFilter} ${roleFilter}
            GROUP BY d.Name
            ORDER BY COUNT(DISTINCT f.Id) DESC
    `);

        const estados = await request.query(`
SELECT
estado as name,
    COUNT(*) as value
FROM(
    SELECT 
                    CASE 
                        WHEN am.ClosedDate IS NOT NULL THEN 'Cerrada'
                        WHEN am.TargetCompletionDate < GETDATE() THEN 'Vencida'
                        WHEN am.TargetCompletionDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE()) THEN 'Próxima'
                        ELSE 'En Tiempo'
                    END as estado
                FROM[Improvement].[ActionPlans] am
                WHERE 1 = 1 ${dateFilter} ${roleFilter}
) AS estados_calculados
            GROUP BY estado
    `);

        const topDependencias = await request.query(`
            SELECT TOP 10
d.Name as name,
    COUNT(am.Id) as acciones
FROM[Improvement].[ActionPlans] am
            LEFT JOIN[Identity].[Users] u ON am.ResponsibleUserId = u.Id
            LEFT JOIN[Organization].[Departments] d ON u.DepartmentId = d.Id
            WHERE d.Name IS NOT NULL
            ${dateFilter} ${roleFilter}
            GROUP BY d.Name
            ORDER BY COUNT(am.Id) DESC
    `);

        const eficienciaMensual = await request.query(`
            WITH Meses AS(
        SELECT 
                    DATEADD(MONTH, -n, GETDATE()) as fecha_mes
                FROM(
            SELECT 0 as n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL 
                    SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL 
                    SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL 
                    SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
        ) nums
    )
SELECT
DATENAME(month, m.fecha_mes) + ' ' + CAST(YEAR(m.fecha_mes) AS VARCHAR(4)) as mes,
    ISNULL(creadas.total, 0) as acciones,
    ISNULL(cerradas.total, 0) as cerradas
            FROM Meses m
            LEFT JOIN(
        SELECT 
                    YEAR(am.StartDate) as anio,
        MONTH(am.StartDate) as mes,
        COUNT(*) as total
                FROM[Improvement].[ActionPlans] am
                WHERE am.StartDate >= DATEADD(MONTH, -12, GETDATE())
                ${roleFilter}
                GROUP BY YEAR(am.StartDate), MONTH(am.StartDate)
    ) creadas ON YEAR(m.fecha_mes) = creadas.anio AND MONTH(m.fecha_mes) = creadas.mes
            LEFT JOIN(
        SELECT 
                    YEAR(am.ClosedDate) as anio,
        MONTH(am.ClosedDate) as mes,
        COUNT(*) as total
                FROM[Improvement].[ActionPlans] am
                WHERE am.ClosedDate >= DATEADD(MONTH, -12, GETDATE())
                AND am.ClosedDate IS NOT NULL
                ${roleFilter}
                GROUP BY YEAR(am.ClosedDate), MONTH(am.ClosedDate)
    ) cerradas ON YEAR(m.fecha_mes) = cerradas.anio AND MONTH(m.fecha_mes) = cerradas.mes
            ORDER BY m.fecha_mes ASC
    `);


        res.json({
            procesos: procesos.recordset,
            estados: estados.recordset,
            top_dependencias: topDependencias.recordset,
            eficiencia_mensual: eficienciaMensual.recordset
        });

    } catch (error) {
        return sendServerError(res, 'Error al obtener graficas', error);
    }
};

/**
 * Obtener estadísticas por dependencia
 */
export const getEstadisticasPorDependencia = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const pool = await getConnection();

        const { roleFilter, deptId } = await resolveRoleFilter(pool, actor);

        const request = pool.request();
        if (deptId) request.input('userDepartmentId', sql.Int, deptId);

        const result = await request.query(`
SELECT
d.Name as dependencia,
    COUNT(am.Id) as total_acciones,
    SUM(CASE WHEN am.ClosedDate IS NOT NULL THEN 1 ELSE 0 END) as acciones_cerradas,
    SUM(CASE WHEN am.ClosedDate IS NULL AND am.TargetCompletionDate < GETDATE() THEN 1 ELSE 0 END) as acciones_vencidas,
    CAST(AVG(
        CASE 
                        WHEN am.TargetQuantity > 0 THEN
        (CAST(ISNULL((
            SELECT TOP 1 PhysicalAdvanceQuantity
                                FROM[Improvement].[ProgressLogs] 
                                WHERE ActionPlanId = am.Id 
                                ORDER BY LogDate DESC
        ), 0) AS FLOAT) / am.TargetQuantity) * 100
                        ELSE 0
                    END
    ) AS DECIMAL(5, 2)) as avance_promedio
FROM[Improvement].[ActionPlans] am
            LEFT JOIN[Identity].[Users] u ON am.ResponsibleUserId = u.Id
            LEFT JOIN[Organization].[Departments] d ON u.DepartmentId = d.Id
            WHERE d.Name IS NOT NULL
            ${roleFilter}
            GROUP BY d.Name
            ORDER BY COUNT(am.Id) DESC
    `);

        res.json(result.recordset);

    } catch (error) {
        return sendServerError(res, 'Error al obtener estadisticas por dependencia', error);
    }
};

/**
 * Obtener alertas y notificaciones
 */
export const getAlertas = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const pool = await getConnection();

        const { roleFilter, deptId } = await resolveRoleFilter(pool, actor);

        const request = pool.request();
        if (deptId) request.input('userDepartmentId', sql.Int, deptId);

        const result = await request.query(`
SELECT
'vencida' as tipo,
    am.Id as id,
    am.TaskDescription as descripcion,
    d.Name as responsable,
    am.TargetCompletionDate as fecha,
    DATEDIFF(day, am.TargetCompletionDate, GETDATE()) as dias_vencidos
FROM[Improvement].[ActionPlans] am
            LEFT JOIN[Identity].[Users] u ON am.ResponsibleUserId = u.Id
            LEFT JOIN[Organization].[Departments] d ON u.DepartmentId = d.Id
            WHERE am.ClosedDate IS NULL 
            AND am.TargetCompletionDate < GETDATE()
            ${roleFilter}
            
            UNION ALL

SELECT
'proxima' as tipo,
    am.Id as id,
    am.TaskDescription as descripcion,
    d.Name as responsable,
    am.TargetCompletionDate as fecha,
    DATEDIFF(day, GETDATE(), am.TargetCompletionDate) as dias_restantes
FROM[Improvement].[ActionPlans] am
            LEFT JOIN[Identity].[Users] u ON am.ResponsibleUserId = u.Id
            LEFT JOIN[Organization].[Departments] d ON u.DepartmentId = d.Id
            WHERE am.ClosedDate IS NULL 
            AND am.TargetCompletionDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE())
            ${roleFilter}
            
            ORDER BY fecha ASC
    `);

        res.json(result.recordset);

    } catch (error) {
        return sendServerError(res, 'Error al obtener alertas', error);
    }
};

/**
 * Obtener métricas por usuario con filtros y paginación
 * ✅ BASE: perfil_usuario (TODOS los usuarios)
 */
export const getMetricasUsuarios = async (req, res) => {
    try {
        const pool = await getConnection();

        const requestedPage = Number.parseInt(req.query.page, 10);
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const page = Number.isNaN(requestedPage) ? 1 : Math.max(1, requestedPage);
        const limit = Number.isNaN(requestedLimit) ? 10 : Math.min(Math.max(1, requestedLimit), 100);
        const offset = (page - 1) * limit;

        const roleIdParam = req.query.rol;
        const roleId = isValidGuid(roleIdParam) ? roleIdParam : null;
        const searchTerm = req.query.search || '';
        const { startDate, endDate } = req.query;

        let dateFilter = "";
        if (startDate && endDate) {
            dateFilter = "AND ame.LogDate BETWEEN @startDate AND @endDate";
        } else if (startDate) {
            dateFilter = "AND ame.LogDate >= @startDate";
        } else if (endDate) {
            dateFilter = "AND ame.LogDate <= @endDate";
        }

        // ✅ Count query - Base: perfil_usuario
        let countQuery = `
            SELECT COUNT(DISTINCT p.Id) as total
FROM[Identity].[Users] p
            WHERE p.Id IS NOT NULL
    `;

        if (roleId) {
            countQuery = `
                SELECT COUNT(DISTINCT p.Id) as total
FROM[Identity].[Users] p
                INNER JOIN[Identity].[UserRoles] ur ON p.Id = ur.UserId
                INNER JOIN[Identity].[Roles] r ON ur.RoleId = r.Id
                WHERE p.Id IS NOT NULL
                AND CAST(r.Id AS VARCHAR(50)) = @roleId
    `;
        }

        if (searchTerm && !roleId) {
            countQuery += ` AND p.FullName LIKE @searchTerm`;
        } else if (searchTerm && roleId) {
            countQuery += ` AND p.FullName LIKE @searchTerm`;
        }

        const countRequest = pool.request();
        if (roleId) {
            countRequest.input('roleId', sql.VarChar, roleId);
        }
        if (searchTerm) {
            countRequest.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
        }
        if (startDate) countRequest.input('startDate', sql.Date, startDate);
        if (endDate) countRequest.input('endDate', sql.Date, endDate);

        const countResult = await countRequest.query(countQuery);
        const totalUsuarios = countResult.recordset[0].total;
        const totalPages = Math.ceil(totalUsuarios / limit);

        // ✅ Main query - Base: perfil_usuario
        let mainQuery = `
            WITH TodosLosUsuarios AS(
        SELECT DISTINCT p.Id as usuario_id
                FROM[Identity].[Users] p
                WHERE p.Id IS NOT NULL
        `;

        if (roleId) {
            mainQuery += `
                AND EXISTS(
            SELECT 1 
                    FROM[Identity].[UserRoles] ur
                    INNER JOIN[Identity].[Roles] r ON ur.RoleId = r.Id
                    WHERE ur.UserId = p.Id
                    AND CAST(r.Id AS VARCHAR(50)) = @roleId
        )
        `;
        }

        if (searchTerm) {
            mainQuery += ` AND p.FullName LIKE @searchTerm`;
        }

        mainQuery += `
    ),
    MetricasUsuarios AS(
        SELECT 
                    tu.usuario_id,
        p.FullName as nombre_usuario,
        ISNULL(r.Name, 'Sin rol') as rol,
        r.Id as rol_id,

        ISNULL((
            SELECT COUNT(*)
                        FROM[Improvement].[ProgressLogs] ame
                        WHERE ame.CreatedById = tu.usuario_id
                        ${dateFilter}
        ), 0) as total_evaluaciones,

        ISNULL((
            SELECT COUNT(*)
                        FROM[Improvement].[ProgressLogs] ame
                        WHERE ame.ObservationById = tu.usuario_id
                        AND ame.AuditorObservation IS NOT NULL
                        ${dateFilter}
        ), 0) as total_observaciones,

            ISNULL((
                SELECT COUNT(*)
                        FROM[Improvement].[ProgressLogs] ame
                        WHERE ame.CreatedById = tu.usuario_id
                        AND ame.LeaderReply IS NOT NULL
                        ${dateFilter}
            ), 0) as total_replicas,

                ISNULL((
                    SELECT COUNT(*)
                        FROM[Improvement].[ProgressLogs] ame
                        WHERE ame.ObservationById = tu.usuario_id
                        AND ame.AuditorConclusion IS NOT NULL
                        ${dateFilter}
                ), 0) as total_conclusiones,

                    (
                        SELECT MAX(fecha_actividad)
FROM(
    SELECT MAX(LogDate) as fecha_actividad
                            FROM[Improvement].[ProgressLogs]
                            WHERE CreatedById = tu.usuario_id
                            
                            UNION ALL
                            
                            SELECT MAX(ObservationDate)
                            FROM[Improvement].[ProgressLogs]
                            WHERE ObservationById = tu.usuario_id
                            
                            UNION ALL
                            
                            SELECT MAX(ReplyDate)
                            FROM[Improvement].[ProgressLogs]
                            WHERE CreatedById = tu.usuario_id
                            
                            UNION ALL
                            
                            SELECT MAX(ConclusionDate)
                            FROM[Improvement].[ProgressLogs]
                            WHERE ObservationById = tu.usuario_id
) AS actividades
                    ) as ultima_actividad
                    
                FROM TodosLosUsuarios tu
                LEFT JOIN[Identity].[Users] p ON tu.usuario_id = p.Id
                LEFT JOIN[Identity].[UserRoles] ur ON tu.usuario_id = ur.UserId
                LEFT JOIN[Identity].[Roles] r ON ur.RoleId = r.Id
            )
SELECT *,
    (total_evaluaciones + total_observaciones + total_replicas + total_conclusiones) as total_acciones
            FROM MetricasUsuarios
            ORDER BY total_acciones DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
    `;

        const mainRequest = pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit);

        if (roleId) {
            mainRequest.input('roleId', sql.VarChar, roleId);
        }
        if (searchTerm) {
            mainRequest.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
        }
        if (startDate) mainRequest.input('startDate', sql.Date, startDate);
        if (endDate) mainRequest.input('endDate', sql.Date, endDate);

        const result = await mainRequest.query(mainQuery);

        res.json({
            data: result.recordset,
            pagination: {
                page,
                limit,
                total: totalUsuarios,
                totalPages
            },
            filters: {
                rol: roleId,
                search: searchTerm
            }
        });

    } catch (error) {
        return sendServerError(res, 'Error al obtener metricas de usuarios', error);
    }
};

/**
 * Obtener lista de roles disponibles
 */
export const getRolesDisponibles = async (req, res) => {
    try {
        const pool = await getConnection();

        const result = await pool.request().query(`
SELECT
r.Id as id,
    r.Name as nombre,
    r.Description as descripcion,
    COUNT(DISTINCT ur.UserId) as total_usuarios
FROM[Identity].[Roles] r
            LEFT JOIN[Identity].[UserRoles] ur ON r.Id = ur.RoleId
            WHERE r.Name IS NOT NULL
            GROUP BY r.Id, r.Name, r.Description
            HAVING COUNT(DISTINCT ur.UserId) > 0
            ORDER BY r.Name
    `);

        res.json(result.recordset);

    } catch (error) {
        return sendServerError(res, 'Error al obtener roles', error);
    }
};

/**
 * Obtener estadísticas agregadas por rol
 */
export const getEstadisticasPorRol = async (req, res) => {
    try {
        const pool = await getConnection();
        const { startDate, endDate } = req.query;

        let dateFilter = "";
        if (startDate && endDate) {
            dateFilter = "AND ame.LogDate BETWEEN @startDate AND @endDate";
        } else if (startDate) {
            dateFilter = "AND ame.LogDate >= @startDate";
        } else if (endDate) {
            dateFilter = "AND ame.LogDate <= @endDate";
        }

        const request = pool.request();
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);

        const result = await request.query(`
            WITH TodosLosUsuarios AS(
        SELECT DISTINCT 
                    p.Id as usuario_id,
        r.Id as RoleId,
        r.Name as RoleName,
        r.Description
                FROM[Identity].[Users] p
                INNER JOIN[Identity].[UserRoles] ur ON p.Id = ur.UserId
                INNER JOIN[Identity].[Roles] r ON ur.RoleId = r.Id
                WHERE p.Id IS NOT NULL
                AND r.Name IS NOT NULL
    ),
    MetricasPorUsuario AS(
        SELECT 
                    u.usuario_id,
        u.RoleId,
        u.RoleName,
        u.Description,

        (SELECT COUNT(*)
                     FROM[Improvement].[ProgressLogs] ame
                     WHERE ame.CreatedById = u.usuario_id
                     ${dateFilter}
    ) as evaluaciones_usuario,

        (SELECT COUNT(*)
FROM[Improvement].[ProgressLogs] ame
                     WHERE ame.ObservationById = u.usuario_id
                     AND ame.AuditorObservation IS NOT NULL
                     ${dateFilter}
                    ) as observaciones_usuario,

    (SELECT COUNT(*)
FROM[Improvement].[ProgressLogs] ame
                     WHERE ame.CreatedById = u.usuario_id
                     AND ame.LeaderReply IS NOT NULL
                     ${dateFilter}
                    ) as replicas_usuario,

    (SELECT COUNT(*)
FROM[Improvement].[ProgressLogs] ame
                     WHERE ame.ObservationById = u.usuario_id
                     AND ame.AuditorConclusion IS NOT NULL
                     ${dateFilter}
                    ) as conclusiones_usuario
                    
                FROM TodosLosUsuarios u
            )
SELECT
RoleId as rol_id,
    RoleName as rol,
    Description as descripcion,
    COUNT(DISTINCT usuario_id) as total_usuarios,
    SUM(evaluaciones_usuario) as total_evaluaciones,
    SUM(observaciones_usuario) as total_observaciones,
    SUM(replicas_usuario) as total_replicas,
    SUM(conclusiones_usuario) as total_conclusiones
            FROM MetricasPorUsuario
            GROUP BY RoleId, RoleName, Description
            HAVING COUNT(DISTINCT usuario_id) > 0
            ORDER BY total_usuarios DESC
    `);

        res.json(result.recordset);

    } catch (error) {
        return sendServerError(res, 'Error al obtener estadisticas por rol', error);
    }
};

/**
 * Obtener análisis detallado de carga y tiempos por usuario (Incluye Control Interno Desglosado)
 */
export const getAnalisisUsuarios = async (req, res) => {
    try {
        const pool = await getConnection();
        const { startDate, endDate, rol, search } = req.query;

        let dateFilter = "";
        let dateFilterMonitoreo = "";
        let roleFilter = "";
        let searchFilter = "";

        // Filtros de fecha
        if (startDate && endDate) {
            dateFilter = "AND am.StartDate BETWEEN @startDate AND @endDate";
            dateFilterMonitoreo = "AND ame.LogDate BETWEEN @startDate AND @endDate";
        } else if (startDate) {
            dateFilter = "AND am.StartDate >= @startDate";
            dateFilterMonitoreo = "AND ame.LogDate >= @startDate";
        } else if (endDate) {
            dateFilter = "AND am.StartDate <= @endDate";
            dateFilterMonitoreo = "AND ame.LogDate <= @endDate";
        }

        // Filtro de rol
        if (rol) {
            roleFilter = "AND CAST(r.Id AS VARCHAR(50)) = @rol";
        }

        // Filtro de búsqueda
        if (search) {
            searchFilter = "AND p.FullName LIKE @search";
        }

        const request = pool.request();
        if (startDate) request.input('startDate', sql.Date, startDate);
        if (endDate) request.input('endDate', sql.Date, endDate);
        if (rol) request.input('rol', sql.VarChar, rol);
        if (search) request.input('search', sql.NVarChar, `%\${search}%`);

        const result = await request.query(`
            WITH MetricasAsignacion AS(
        --Métricas para Líderes y Usuarios(Dueños de acciones)
                SELECT 
                    p.Id as per_usu_usuario,
        COUNT(am.Id) as total_acciones,
        SUM(CASE WHEN am.ClosedDate IS NOT NULL THEN 1 ELSE 0 END) as cerradas,
        SUM(CASE WHEN am.ClosedDate IS NULL AND am.TargetCompletionDate < GETDATE() THEN 1 ELSE 0 END) as vencidas,
        SUM(CASE WHEN am.ClosedDate IS NULL AND am.TargetCompletionDate >= GETDATE() AND am.TargetCompletionDate <= DATEADD(day, 30, GETDATE()) THEN 1 ELSE 0 END) as proximas,
        SUM(CASE WHEN am.ClosedDate IS NULL AND am.TargetCompletionDate > DATEADD(day, 30, GETDATE()) THEN 1 ELSE 0 END) as en_tiempo,
        ISNULL(AVG(CASE WHEN am.ClosedDate IS NOT NULL THEN DATEDIFF(day, am.StartDate, am.ClosedDate) END), 0) as tiempo_promedio_cierre,
        ISNULL(MIN(CASE WHEN am.ClosedDate IS NOT NULL THEN DATEDIFF(day, am.StartDate, am.ClosedDate) END), 0) as tiempo_min_cierre,
        ISNULL(MAX(CASE WHEN am.ClosedDate IS NOT NULL THEN DATEDIFF(day, am.StartDate, am.ClosedDate) END), 0) as tiempo_max_cierre
                FROM[Identity].[Users] p
                LEFT JOIN[Improvement].[ActionPlans] am ON am.ResponsibleUserId = p.Id ${dateFilter}
                WHERE p.Id IS NOT NULL
                GROUP BY p.Id
    ),
    MetricasObservaciones AS(
        --Métricas para Control Interno(Observaciones a Evaluaciones)
                --Tiempo: Desde que está la evaluación hasta que se da la observación
                SELECT 
                    ame.ObservationById as usuario_id,
        COUNT(ame.Id) as total_observaciones,
        ISNULL(AVG(DATEDIFF(day, ame.LogDate, ame.ObservationDate)), 0) as tiempo_promedio_observacion
                FROM[Improvement].[ProgressLogs] ame
                WHERE ame.ObservationById IS NOT NULL
                ${dateFilterMonitoreo}
                GROUP BY ame.ObservationById
    ),
        MetricasConclusiones AS(
            --Métricas para Control Interno(Conclusiones a Replicas)
                --Tiempo: Desde que está la réplica hasta que se da la conclusión
                SELECT 
                    ame.ObservationById as usuario_id,
            COUNT(ame.Id) as total_conclusiones,
            ISNULL(AVG(DATEDIFF(day, ame.ReplyDate, ame.ConclusionDate)), 0) as tiempo_promedio_conclusion
                FROM[Improvement].[ProgressLogs] ame
                WHERE ame.ObservationById IS NOT NULL
                AND ame.ReplyDate IS NOT NULL
                ${dateFilterMonitoreo}
                GROUP BY ame.ObservationById
        )

SELECT
p.Id as usuario_id,
    p.FullName as nombre,
    ISNULL(r.Name, 'Sin Rol') as rol,

    --Asignación
ISNULL(ma.total_acciones, 0) as total_acciones,
    ISNULL(ma.cerradas, 0) as cerradas,
    ISNULL(ma.vencidas, 0) as vencidas,
    ISNULL(ma.proximas, 0) as proximas,
    ISNULL(ma.en_tiempo, 0) as en_tiempo,
    ISNULL(ma.tiempo_promedio_cierre, 0) as tiempo_promedio_cierre,
    ISNULL(ma.tiempo_min_cierre, 0) as tiempo_min_cierre,
    ISNULL(ma.tiempo_max_cierre, 0) as tiempo_max_cierre,

    --Seguimiento(Control Interno Desglosado)
ISNULL(mo.total_observaciones, 0) as total_observaciones,
    ISNULL(mo.tiempo_promedio_observacion, 0) as tiempo_promedio_observacion,

    ISNULL(mc.total_conclusiones, 0) as total_conclusiones,
    ISNULL(mc.tiempo_promedio_conclusion, 0) as tiempo_promedio_conclusion,

    -- % vencidas
                CASE WHEN ISNULL(ma.total_acciones, 0) > 0 
                    THEN CAST(ISNULL(ma.vencidas, 0) * 100.0 / ma.total_acciones AS DECIMAL(18, 1))
                    ELSE 0
END as porcentaje_vencidas

FROM[Identity].[Users] p
            LEFT JOIN[Identity].[UserRoles] ur ON p.Id = ur.UserId
            LEFT JOIN[Identity].[Roles] r ON ur.RoleId = r.Id
            LEFT JOIN MetricasAsignacion ma ON p.Id = ma.per_usu_usuario
            LEFT JOIN MetricasObservaciones mo ON p.Id = mo.usuario_id
            LEFT JOIN MetricasConclusiones mc ON p.Id = mc.usuario_id
            WHERE p.FullName IS NOT NULL
            ${roleFilter}
            ${searchFilter}
AND(
    ISNULL(ma.total_acciones, 0) > 0 OR 
                ISNULL(mo.total_observaciones, 0) > 0 OR 
                ISNULL(mc.total_conclusiones, 0) > 0
)
            ORDER BY(ISNULL(ma.total_acciones, 0) + ISNULL(mo.total_observaciones, 0) + ISNULL(mc.total_conclusiones, 0)) DESC
    `);

        res.json(result.recordset);

    } catch (error) {
        return sendServerError(res, 'Error al obtener analisis de usuarios', error);
    }
};
