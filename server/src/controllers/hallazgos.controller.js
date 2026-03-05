import sql from 'mssql';
import { getConnection } from '../config/db.js';
import { insertHistorico, HISTORICO_TIPO } from '../utils/audit.js';
import { getActorUserId } from '../utils/auth.js';
import { sendServerError } from '../utils/http.js';
import { sendFindingAssignedEmail } from '../services/email.service.js';
import notificationEmitter from '../services/events.service.js';

export const getKPIs = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM [Improvement].[Findings]) as total_hallazgos,
                (SELECT COUNT(*) 
                 FROM [Improvement].[ActionPlans] am
                 INNER JOIN [Improvement].[RootCauses] ca ON am.RootCauseId = ca.Id) as total_acciones,
                (SELECT COUNT(*) 
                 FROM [Improvement].[ActionPlans] 
                 WHERE ClosedDate IS NOT NULL) as acciones_cerradas,
                (SELECT CAST(
                    COUNT(CASE WHEN ClosedDate IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)
                AS DECIMAL(5,2))
                 FROM [Improvement].[ActionPlans]) as avance_global
        `);

        const kpis = result.recordset[0];
        return res.json({
            total_hallazgos: kpis.total_hallazgos || 0,
            total_acciones: kpis.total_acciones || 0,
            acciones_cerradas: kpis.acciones_cerradas || 0,
            avance_global: Number.parseFloat(kpis.avance_global || 0).toFixed(1),
        });
    } catch (error) {
        return sendServerError(res, 'Error al obtener KPIs', error);
    }
};

export const getGraficas = async (req, res) => {
    try {
        const pool = await getConnection();
        const resultProcesos = await pool.request().query(`
            SELECT TOP 8
                p.Name as name,
                COUNT(DISTINCT pmh.Id) as hallazgos
            FROM [Organization].[Departments] p
            LEFT JOIN [Improvement].[Findings] pmh ON p.Id = pmh.DepartmentId
            GROUP BY p.Name, p.Id
            HAVING COUNT(DISTINCT pmh.Id) > 0
            ORDER BY hallazgos DESC
        `);

        const resultEstados = await pool.request().query(`
            SELECT 
                CASE 
                    WHEN ClosedDate IS NOT NULL THEN 'Cerradas'
                    WHEN TargetCompletionDate < GETDATE() THEN 'Vencidas'
                    WHEN TargetCompletionDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE()) THEN 'Proximas'
                    ELSE 'En Tiempo'
                END as name,
                COUNT(*) as value
            FROM [Improvement].[ActionPlans]
            WHERE ApprovalStatus = 1
            GROUP BY CASE 
                WHEN ClosedDate IS NOT NULL THEN 'Cerradas'
                WHEN TargetCompletionDate < GETDATE() THEN 'Vencidas'
                WHEN TargetCompletionDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE()) THEN 'Proximas'
                ELSE 'En Tiempo'
            END
        `);

        return res.json({
            procesos: resultProcesos.recordset,
            estados: resultEstados.recordset,
        });
    } catch (error) {
        return sendServerError(res, 'Error al obtener graficas', error);
    }
};

export const getHallazgos = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const pool = await getConnection();
        const { proceso, fuente, year } = req.query;

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

        // Si no es admin ni auditor, extraemos su departamento para filtrar obligatoriamente
        const userDepartmentId = userQuery.recordset[0]?.DepartmentId;
        const requiresDepartmentFilter = !isAdministrador && !isControlInterno;

        let query = `
            SELECT
                pmh.Id as id,
                pmh.ReferenceCode as numero,
                pmh.DiscoveryDate as fecha,
                pmh.Description as descripcion,
                fh.Name as fuente_nombre,
                p.Name as proceso_nombre,
                (SELECT COUNT(*) 
                 FROM [Improvement].[ActionPlans] am
                 INNER JOIN [Improvement].[RootCauses] ca ON am.RootCauseId = ca.Id
                 WHERE ca.FindingId = pmh.Id) as total_acciones,
                (SELECT COUNT(*) 
                 FROM [Improvement].[ActionPlans] am
                 INNER JOIN [Improvement].[RootCauses] ca ON am.RootCauseId = ca.Id
                 WHERE ca.FindingId = pmh.Id 
                 AND am.ClosedDate IS NOT NULL) as acciones_cerradas,
                pmh.AuditorId as auditor_id,
                u.FullName as auditor_nombre
            FROM [Improvement].[Findings] pmh
            LEFT JOIN [Improvement].[FindingSources] fh ON pmh.SourceId = fh.Id
            LEFT JOIN [Organization].[Departments] p ON pmh.DepartmentId = p.Id
            LEFT JOIN [Identity].[Users] u ON pmh.AuditorId = u.Id
            WHERE 1=1
        `;

        const request = pool.request();

        // 1. Filtro Obligatorio de Seguridad (Aislamiento por Dependencia)
        if (requiresDepartmentFilter) {
            if (!userDepartmentId) {
                // Si el usuario no tiene departamento asignado y es Líder/Consulta, no ve nada.
                return res.json([]);
            }
            query += ` AND (
                pmh.DepartmentId = @userDepartmentId
                OR pmh.Id IN (
                    SELECT ca.FindingId 
                    FROM [Improvement].[ActionPlans] am
                    INNER JOIN [Improvement].[RootCauses] ca ON am.RootCauseId = ca.Id
                    INNER JOIN [Identity].[Users] resp ON am.ResponsibleUserId = resp.Id
                    WHERE resp.DepartmentId = @userDepartmentId
                )
            )`;
            request.input('userDepartmentId', sql.Int, userDepartmentId);
        }

        // 2. Filtros de Búsqueda Normales (Los líderes no pueden usar el filtro de proceso, 
        // pero lo ignoramos ya que el filtro obligatorio prevalece)
        if (proceso) {
            query += ' AND pmh.DepartmentId = @proceso';
            request.input('proceso', sql.Int, Number.parseInt(proceso, 10));
        }
        if (fuente) {
            query += ' AND pmh.SourceId = @fuente';
            request.input('fuente', sql.Int, Number.parseInt(fuente, 10));
        }
        if (year) {
            query += ' AND YEAR(pmh.DiscoveryDate) = @year';
            request.input('year', sql.Int, Number.parseInt(year, 10));
        }

        query += ' ORDER BY pmh.DiscoveryDate DESC';
        const result = await request.query(query);
        return res.json(result.recordset);
    } catch (error) {
        return sendServerError(res, 'Error al obtener hallazgos', error);
    }
};

export const getHallazgoById = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const pool = await getConnection();
        const id = Number.parseInt(req.params.id, 10);

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

        let query = `
            SELECT 
                pmh.Id as id,
                pmh.ReferenceCode as numero,
                pmh.DiscoveryDate as fecha,
                pmh.Description as descripcion,
                pmh.BusinessImpact as efecto,
                fh.Name as fuente,
                p.Name as proceso,
                pmh.AuditorId as auditor_id,
                u.FullName as auditor_nombre
            FROM [Improvement].[Findings] pmh
            LEFT JOIN [Improvement].[FindingSources] fh ON pmh.SourceId = fh.Id
            LEFT JOIN [Organization].[Departments] p ON pmh.DepartmentId = p.Id
            LEFT JOIN [Identity].[Users] u ON pmh.AuditorId = u.Id
            WHERE pmh.Id = @id
        `;

        const request = pool.request().input('id', sql.Int, id);

        if (requiresDepartmentFilter) {
            if (!userDepartmentId) return res.status(403).json({ error: 'Acceso denegado: Usuario no tiene un departamento asignado.' });
            query += ` AND (
                pmh.DepartmentId = @userDepartmentId
                OR pmh.Id IN (
                    SELECT ca.FindingId 
                    FROM [Improvement].[ActionPlans] am
                    INNER JOIN [Improvement].[RootCauses] ca ON am.RootCauseId = ca.Id
                    INNER JOIN [Identity].[Users] resp ON am.ResponsibleUserId = resp.Id
                    WHERE resp.DepartmentId = @userDepartmentId
                )
            )`;
            request.input('userDepartmentId', sql.Int, userDepartmentId);
        }

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Hallazgo no encontrado' });
        }
        return res.json(result.recordset[0]);
    } catch (error) {
        return sendServerError(res, 'Error al obtener hallazgo', error);
    }
};

export const createHallazgo = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const {
            numero,
            fecha,
            descripcion,
            fuente_id,
            tipo_hallazgo_id,
            efecto,
            proceso_id,
            fila,
            auditor_id,
        } = req.body;

        if (!descripcion || !fuente_id || !tipo_hallazgo_id || !proceso_id || !auditor_id) {
            return res.status(400).json({
                error: 'descripcion, fuente_id, tipo_hallazgo_id, proceso_id y auditor_id son obligatorios',
            });
        }

        const pool = await getConnection();
        const request = pool.request()
            .input('numero', sql.VarChar(13), numero || null)
            .input('fecha', sql.Date, fecha || new Date())
            .input('descripcion', sql.VarChar(1000), descripcion)
            .input('fuente', sql.Int, Number.parseInt(fuente_id, 10))
            .input('tipoHallazgo', sql.Int, Number.parseInt(tipo_hallazgo_id, 10))
            .input('efecto', sql.VarChar(1000), efecto || null)
            .input('proceso', sql.Int, Number.parseInt(proceso_id, 10))
            .input('fila', sql.VarChar(10), fila || null)
            .input('auditor', sql.UniqueIdentifier, auditor_id);

        const inserted = await request.query(`
            INSERT INTO [Improvement].[Findings] (
                ReferenceCode,
                DiscoveryDate,
                Description,
                SourceId,
                CategoryId,
                BusinessImpact,
                DepartmentId,
                RowReference,
                ReportedById,
                AuditorId,
                Status,
                CreatedAt
            )
            OUTPUT INSERTED.Id as id
            VALUES (
                @numero,
                @fecha,
                @descripcion,
                @fuente,
                @tipoHallazgo,
                @efecto,
                @proceso,
                @fila,
                (SELECT TOP 1 Id FROM [Identity].[Users] WHERE Id = '${actor}' OR Email = '${actor}'),
                @auditor,
                0,
                GETDATE()
            )
        `);

        const hallazgoId = inserted.recordset[0].id;
        // Removed insertHistorico since legacy table was not migrated

        // CORREO ELECTRÓNICO (AUDITOR) Y NOTIFICACIÓN SSE
        pool.request()
            .input('hallazgoId', sql.Int, hallazgoId)
            .query(`
                SELECT 
                    u.Id as AuditorUserId,
                    u.Email as AuditorEmail,
                    u.FullName as AuditorName,
                    f.ReferenceCode as HallazgoRef,
                    d.Name as Dependencia,
                    f.DiscoveryDate as Fecha,
                    f.Description as Descripcion
                FROM [Improvement].[Findings] f
                INNER JOIN [Identity].[Users] u ON f.AuditorId = u.Id
                LEFT JOIN [Organization].[Departments] d ON f.DepartmentId = d.Id
                WHERE f.Id = @hallazgoId
            `).then(mailInfo => {
                if (mailInfo.recordset.length > 0) {
                    const info = mailInfo.recordset[0];

                    // Notificación en Tiempo Real (SSE)
                    if (info.AuditorUserId) {
                        notificationEmitter.emitUserEvent(info.AuditorUserId, {
                            type: 'info',
                            title: 'Nuevo Hallazgo Asignado',
                            message: `Ref: ${info.HallazgoRef}\nDependencia: ${info.Dependencia || 'N/A'}\nDescripción: ${info.Descripcion || 'Sin descripción'}\nFecha: ${info.Fecha ? info.Fecha.toISOString().split('T')[0] : 'N/A'}`,
                            linkUrl: `/hallazgos`
                        });
                    }

                    // Notificación por Email
                    if (info.AuditorEmail) {
                        sendFindingAssignedEmail(info.AuditorEmail, info.AuditorName, {
                            numeroHallazgo: info.HallazgoRef,
                            proceso: info.Dependencia,
                            fecha: info.Fecha ? info.Fecha.toISOString().split('T')[0] : 'N/A'
                        }).catch(err => console.error('Error enviando correo de asignacion de auditoria:', err));
                    }
                }
            }).catch(e => console.error('Error consultando para correo auditoria:', e));

        return res.status(201).json({
            id: hallazgoId,
            message: 'Hallazgo creado correctamente',
        });
    } catch (error) {
        return sendServerError(res, 'Error al crear hallazgo', error);
    }
};

export const updateHallazgo = async (req, res) => {
    try {
        const hallazgoId = Number.parseInt(req.params.id, 10);
        const actor = getActorUserId(req);
        const pool = await getConnection();

        const current = await pool.request()
            .input('id', sql.Int, hallazgoId)
            .query(`
                SELECT *
                FROM [Improvement].[Findings]
                WHERE Id = @id
            `);
        if (current.recordset.length === 0) {
            return res.status(404).json({ error: 'Hallazgo no encontrado' });
        }
        const row = current.recordset[0];

        const next = {
            numero: req.body.numero ?? row.ReferenceCode,
            fecha: req.body.fecha ?? row.DiscoveryDate,
            descripcion: req.body.descripcion ?? row.Description,
            fuente: req.body.fuente_id ?? row.SourceId,
            tipoHallazgo: req.body.tipo_hallazgo_id ?? row.CategoryId,
            efecto: req.body.efecto ?? row.BusinessImpact,
            proceso: req.body.proceso_id ?? row.DepartmentId,
            fila: req.body.fila ?? row.RowReference,
            auditor: req.body.auditor_id ?? row.AuditorId,
        };

        await pool.request()
            .input('id', sql.Int, hallazgoId)
            .input('numero', sql.VarChar(13), next.numero || null)
            .input('fecha', sql.Date, next.fecha || null)
            .input('descripcion', sql.VarChar(1000), next.descripcion)
            .input('fuente', sql.Int, Number.parseInt(next.fuente, 10))
            .input('tipoHallazgo', sql.Int, Number.parseInt(next.tipoHallazgo, 10))
            .input('efecto', sql.VarChar(1000), next.efecto || null)
            .input('proceso', sql.Int, Number.parseInt(next.proceso, 10))
            .input('fila', sql.VarChar(10), next.fila || null)
            .input('auditor', sql.UniqueIdentifier, next.auditor)
            .query(`
                UPDATE [Improvement].[Findings]
                SET
                    ReferenceCode = @numero,
                    DiscoveryDate = @fecha,
                    Description = @descripcion,
                    SourceId = @fuente,
                    CategoryId = @tipoHallazgo,
                    BusinessImpact = @efecto,
                    DepartmentId = @proceso,
                    RowReference = @fila,
                    AuditorId = @auditor
                WHERE Id = @id
            `);

        // Removed insertHistorico since legacy table was not migrated

        return res.json({ message: 'Hallazgo actualizado correctamente' });
    } catch (error) {
        return sendServerError(res, 'Error al actualizar hallazgo', error);
    }
};

export const deleteHallazgo = async (req, res) => {
    try {
        const hallazgoId = Number.parseInt(req.params.id, 10);
        const actor = getActorUserId(req);
        const pool = await getConnection();

        const current = await pool.request()
            .input('id', sql.Int, hallazgoId)
            .query('SELECT * FROM [Improvement].[Findings] WHERE Id = @id');
        if (current.recordset.length === 0) {
            return res.status(404).json({ error: 'Hallazgo no encontrado' });
        }
        const row = current.recordset[0];

        const dependencias = await pool.request()
            .input('id', sql.Int, hallazgoId)
            .query(`
                SELECT COUNT(*) as total
                FROM [Improvement].[RootCauses]
                WHERE FindingId = @id
            `);
        if (dependencias.recordset[0].total > 0) {
            return res.status(409).json({
                error: 'No se puede eliminar el hallazgo porque tiene causas y acciones asociadas',
            });
        }

        await pool.request()
            .input('id', sql.Int, hallazgoId)
            .query('DELETE FROM [Improvement].[Findings] WHERE Id = @id');

        // Removed insertHistorico since legacy table was not migrated

        return res.json({ message: 'Hallazgo eliminado correctamente' });
    } catch (error) {
        return sendServerError(res, 'Error al eliminar hallazgo', error);
    }
};

export const closeHallazgo = async (req, res) => {
    try {
        const hallazgoId = Number.parseInt(req.params.id, 10);
        // const actor = getActorUserId(req); // Podría usarse para auditoría si es necesario registrar quién lo cerró
        const pool = await getConnection();

        // 1. Verificar si existe
        const current = await pool.request()
            .input('id', sql.Int, hallazgoId)
            .query('SELECT * FROM [Improvement].[Findings] WHERE Id = @id');

        if (current.recordset.length === 0) {
            return res.status(404).json({ error: 'Hallazgo no encontrado' });
        }

        // 2. Cerrar solo las acciones que tengan avance del 100%
        // Una acción está al 100% cuando su último PhysicalAdvanceQuantity >= TargetQuantity
        await pool.request()
            .input('hallazgoId', sql.Int, hallazgoId)
            .query(`
                UPDATE a
                SET a.ClosedDate = GETDATE()
                FROM [Improvement].[ActionPlans] a
                INNER JOIN [Improvement].[RootCauses] c ON a.RootCauseId = c.Id
                WHERE c.FindingId = @hallazgoId
                AND a.ClosedDate IS NULL
                AND a.TargetQuantity > 0
                AND ISNULL((
                    SELECT TOP 1 PhysicalAdvanceQuantity
                    FROM [Improvement].[ProgressLogs]
                    WHERE ActionPlanId = a.Id
                    ORDER BY LogDate DESC
                ), 0) >= a.TargetQuantity
            `);

        // Contar cuántas quedaron sin cerrar (avance < 100%)
        const pendientes = await pool.request()
            .input('hallazgoId', sql.Int, hallazgoId)
            .query(`
                SELECT COUNT(*) as total
                FROM [Improvement].[ActionPlans] a
                INNER JOIN [Improvement].[RootCauses] c ON a.RootCauseId = c.Id
                WHERE c.FindingId = @hallazgoId
                AND a.ClosedDate IS NULL
            `);

        const sinCerrar = pendientes.recordset[0]?.total ?? 0;

        return res.json({
            message: sinCerrar > 0
                ? `Hallazgo procesado. ${sinCerrar} acción(es) no se pudieron cerrar porque su avance no es del 100%.`
                : 'Hallazgo y sus acciones asociadas han sido cerradas correctamente'
        });
    } catch (error) {
        return sendServerError(res, 'Error al cerrar hallazgo', error);
    }
};
