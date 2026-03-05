// server/src/controllers/acciones.controller.js (VERSIÓN CORRECTA CON perfil_usuario)
import { getConnection } from '../config/db.js';
import sql from 'mssql';
import { insertHistorico, HISTORICO_TIPO } from '../utils/audit.js';
import { getActorUserId } from '../utils/auth.js';
import { sendServerError } from '../utils/http.js';
import { notifyAccionAssigned, notifyNovedadCreated, checkAndNotifyExpiringActions } from '../services/notification.service.js';
import { sendActionAssignedEmail, sendObservationEmail, sendActionCreatedEmail } from '../services/email.service.js';
import notificationEmitter from '../services/events.service.js';

export const getDetalleHallazgo = async (req, res) => {
    try {
        const pool = await getConnection();
        const { id } = req.params;
        const hallazgoId = parseInt(id, 10);

        // 1. Obtener datos del Hallazgo
        const hallazgoQuery = pool.request()
            .input('id', sql.Int, hallazgoId)
            .query(`
                SELECT 
                    pmh.Id as pla_mej_hal_id,
                    pmh.ReferenceCode as pla_mej_hal_numero,
                    pmh.DiscoveryDate as pla_mej_hal_fecha,
                    pmh.Description as pla_mej_hal_hallazgo,
                    pmh.BusinessImpact as pla_mej_hal_efecto,
                    fh.Name as fuente,
                    p.Name as proceso,
                    c.Name as tipo_hallazgo,
                    a.FullName as auditor_nombre
                FROM [Improvement].[Findings] pmh
                LEFT JOIN [Improvement].[FindingSources] fh ON pmh.SourceId = fh.Id
                LEFT JOIN [Organization].[Departments] p ON pmh.DepartmentId = p.Id
                LEFT JOIN [Improvement].[FindingCategories] c ON pmh.CategoryId = c.Id
                LEFT JOIN [Identity].[Users] a ON pmh.AuditorId = a.Id
                WHERE pmh.Id = @id
            `);

        // 2. Obtener Causas asociadas
        const causasQuery = pool.request()
            .input('id', sql.Int, hallazgoId)
            .query(`
                SELECT 
                    ca.Id as id,
                    ca.Description as causa,
                    ca.FindingId as hallazgo_id,
                    pmh.BusinessImpact as efecto
                FROM [Improvement].[RootCauses] ca
                LEFT JOIN [Improvement].[Findings] pmh ON ca.FindingId = pmh.Id
                WHERE ca.FindingId = @id
                ORDER BY ca.Id
            `);

        // Ejecutar Hallazgo y Causas en paralelo
        const [resultHallazgo, resultCausas] = await Promise.all([hallazgoQuery, causasQuery]);

        if (resultHallazgo.recordset.length === 0) {
            return res.status(404).json({ error: 'Hallazgo no encontrado' });
        }

        const causas = resultCausas.recordset;

        // Si no hay causas, retornar temprano
        if (causas.length === 0) {
            return res.json({
                hallazgo: resultHallazgo.recordset[0],
                causas: []
            });
        }

        const causaIds = causas.map(c => c.id);

        // 3. Obtener TODAS las Acciones para estas causas
        // Usamos una consulta IN para evitar loops.
        // Nota: MSSQL no soporta arrays nativos en IN parametrizado fácilmente sin tipos de tabla,
        // pero podemos construir la lista de IDs dinámicamente si son seguros (ints) o pasarlos como string CSV.
        // Dado que son ints generados internamente, construiremos la query segura.

        const accionesQueryContent = `
            SELECT 
                am.Id as id,
                am.RootCauseId as causa_id,
                am.TaskDescription as accion,
                am.ExpectedOutcome as descripcionMetas,
                am.UnitOfMeasureName as denominacionUnidad,
                am.TargetQuantity as entregablesTotales,
                am.StartDate as fechaInicio,
                am.TargetCompletionDate as fechaFin,
                am.ClosedDate as fechaCierre,
                am.CreatedAt as fechaAprobacion,
                NULL as observacionesAprobacion,
                d.Name as responsable,
                am.ResponsibleUserId as responsableUserId,
                CASE 
                    WHEN am.ApprovalStatus = 0 THEN 'Pendiente Aprobación'
                    WHEN am.ApprovalStatus = 2 THEN 'Rechazada'
                    WHEN am.ClosedDate IS NOT NULL THEN 'Cerrada'
                    WHEN am.TargetCompletionDate < GETDATE() THEN 'Vencida'
                    WHEN am.TargetCompletionDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE()) THEN 'Próxima'
                    ELSE 'En Ejecución'
                END as estado,
                am.ApprovalStatus as approvalStatus
            FROM [Improvement].[ActionPlans] am
            LEFT JOIN [Identity].[Users] u ON am.ResponsibleUserId = u.Id
            LEFT JOIN [Organization].[Departments] d ON u.DepartmentId = d.Id
            WHERE am.RootCauseId IN (${causaIds.join(',')})
            ORDER BY am.StartDate
        `;

        const resultAcciones = await pool.request().query(accionesQueryContent);
        const acciones = resultAcciones.recordset;

        let evaluaciones = [];
        if (acciones.length > 0) {
            const accionIds = acciones.map(a => a.id);

            // 4. Obtener TODAS las Evaluaciones para estas acciones
            const evaluacionesQueryContent = `
                SELECT 
                    ame.Id as id,
                    ame.ActionPlanId as accion_id,
                    ame.PhysicalAdvanceQuantity as entregablesRealizados,
                    ame.QualitativeNotes as avanceCualitativo,
                    ame.LogDate as fecha,
                    
                    ame.EvidenceUrl as archivo,
                    ame.ReplyAttachmentUrl as archivoReplica,
                    
                    ame.AuditorObservation as observaciones,
                    ame.ObservationDate as fechaObservaciones,
                    ame.LeaderReply as replica,
                    ame.ReplyDate as fechaReplica,
                    ame.AuditorConclusion as conclusion,
                    ame.ConclusionDate as fechaConclusion,
                    
                    u1.FullName as usuarioCreador,
                    u2.FullName as usuarioObservaciones,
                    NULL as usuarioReplica,
                    NULL as usuarioConclusion
                    
                FROM [Improvement].[ProgressLogs] ame
                LEFT JOIN [Identity].[Users] u1 ON ame.CreatedById = u1.Id
                LEFT JOIN [Identity].[Users] u2 ON ame.ObservationById = u2.Id
                
                WHERE ame.ActionPlanId IN (${accionIds.join(',')})
                ORDER BY ame.LogDate DESC
            `;

            const resultEvaluaciones = await pool.request().query(evaluacionesQueryContent);
            evaluaciones = resultEvaluaciones.recordset;
        }

        // ==========================================
        // ENSAMBLAR DATOS EN MEMORIA
        // ==========================================

        // Helper para convertir tipos numéricos
        const parseNumericSafe = (value) => {
            if (value === null || value === undefined || value === '') return 0;
            const parsed = parseFloat(String(value).replace(',', '.').trim());
            return isNaN(parsed) ? 0 : parsed;
        };

        // Agrupar evaluaciones por acción
        const evaluacionesMap = evaluations => {
            const map = {}; // accionId -> [evaluaciones]
            evaluations.forEach(ev => {
                if (!map[ev.accion_id]) map[ev.accion_id] = [];
                map[ev.accion_id].push(ev);
            });
            return map;
        };
        const evasByAccion = evaluacionesMap(evaluaciones);

        // Procesar acciones y adjuntar sus evaluaciones
        const accionesProcesadas = acciones.map(accion => {
            const misEvaluacionesRaw = evasByAccion[accion.id] || [];

            // Obtener último avance (la última por fecha DESC)
            const ultimaEval = misEvaluacionesRaw.length > 0 ? misEvaluacionesRaw[0] : null;
            const entregablesRealizadosFromEval = ultimaEval ? parseNumericSafe(ultimaEval.entregablesRealizados) : 0;
            const entregablesTotales = parseNumericSafe(accion.entregablesTotales);

            // Calcular porcentaje para cada evaluación
            const misEvaluaciones = misEvaluacionesRaw.map(ev => {
                const entregablesEval = parseNumericSafe(ev.entregablesRealizados);
                const porcentajeEval = entregablesTotales > 0
                    ? Math.round((entregablesEval / entregablesTotales) * 100 * 100) / 100
                    : 0;

                return {
                    id: ev.id,
                    fecha: ev.fecha,
                    entregablesRealizados: entregablesEval,
                    avancePorcentual: porcentajeEval,
                    soporteAvance: ev.avanceCualitativo,
                    archivoAdjunto: ev.archivo,
                    archivoReplicaAdjunto: ev.archivoReplica,
                    observaciones: ev.observaciones,
                    fechaObservaciones: ev.fechaObservaciones,
                    replica: ev.replica,
                    fechaReplica: ev.fechaReplica,
                    conclusion: ev.conclusion,
                    fechaConclusion: ev.fechaConclusion,
                    usuarioCreador: ev.usuarioCreador,
                    usuarioObservaciones: ev.usuarioObservaciones,
                    usuarioReplica: ev.usuarioReplica,
                    usuarioConclusion: ev.usuarioConclusion
                };
            });

            // Calcular avance final de la acción
            let avanceFinal = 0;
            if (entregablesTotales > 0) {
                avanceFinal = (entregablesRealizadosFromEval / entregablesTotales) * 100;
            }

            return {
                ...accion,
                entregablesRealizados: entregablesRealizadosFromEval,
                entregablesTotales: entregablesTotales,
                avance: Math.round(avanceFinal * 100) / 100,
                evaluaciones: misEvaluaciones
            };
        });

        // Agrupar acciones por causa
        const accionesByCausa = {}; // causaId -> [acciones]
        accionesProcesadas.forEach(acc => {
            if (!accionesByCausa[acc.causa_id]) accionesByCausa[acc.causa_id] = [];
            accionesByCausa[acc.causa_id].push(acc);
        });

        // Ensamblar respuesta final
        const causasFinal = causas.map(causa => ({
            id: causa.id,
            causa: causa.causa,
            efecto: causa.efecto,
            hallazgo_id: causa.hallazgo_id,
            acciones: accionesByCausa[causa.id] || []
        }));

        res.json({
            hallazgo: resultHallazgo.recordset[0],
            causas: causasFinal
        });

    } catch (error) {
        return sendServerError(res, 'Error al obtener detalle del hallazgo', error);
    }
};

export const createAccion = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const {
            causa_id,
            actividad,
            descripcion_meta,
            denominacion_unidad,
            unidad,
            fecha_inicio,
            fecha_fin,
            dependencia_responsable,
            impacto,
        } = req.body;

        if (!causa_id || !actividad || !descripcion_meta || !fecha_inicio || !fecha_fin || !dependencia_responsable) {
            return res.status(400).json({
                error: 'causa_id, actividad, descripcion_meta, fecha_inicio, fecha_fin y dependencia_responsable son obligatorios',
            });
        }

        const pool = await getConnection();

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

        // Si no es admin ni auditor, forzamos que la dependencia sea la suya
        let dependenciaEfectiva = dependencia_responsable;
        if (!isAdministrador && !isControlInterno) {
            if (!userDepartmentId) {
                return res.status(403).json({ error: 'Acceso denegado: Usuario no tiene un departamento asignado.' });
            }
            dependenciaEfectiva = userDepartmentId;
        }

        const inserted = await pool.request()
            .input('causaId', sql.Int, Number.parseInt(causa_id, 10))
            .input('actividad', sql.VarChar(1000), actividad)
            .input('meta', sql.VarChar(1000), descripcion_meta)
            .input('denominacion', sql.VarChar(1000), denominacion_unidad || null)
            .input('unidad', sql.Decimal(11, 2), unidad ?? null)
            .input('fechaInicio', sql.Date, fecha_inicio)
            .input('fechaFin', sql.Date, fecha_fin)
            .input('dependencia', sql.Int, Number.parseInt(dependenciaEfectiva, 10))
            .input('impacto', sql.VarChar(1000), impacto || null)
            .query(`
                INSERT INTO [Improvement].[ActionPlans] (
                    RootCauseId,
                    TaskDescription,
                    ExpectedOutcome,
                    UnitOfMeasureName,
                    TargetQuantity,
                    StartDate,
                    TargetCompletionDate,
                    ImprovementImpact,
                    ApprovalStatus,
                    ResponsibleUserId,
                    CreatedAt
                )
                OUTPUT INSERTED.Id as id
                VALUES (
                    @causaId,
                    @actividad,
                    @meta,
                    @denominacion,
                    @unidad,
                    @fechaInicio,
                    @fechaFin,
                    @impacto,
                    0,
                    (SELECT TOP 1 Id FROM [Identity].[Users] WHERE DepartmentId = @dependencia),
                    GETDATE()
                )
            `);

        // Removed insertHistorico since legacy table was not migrated

        // NOTIFICACIÓN FRONTEND
        notifyAccionAssigned({
            id: inserted.recordset[0].id,
            dependenciaId: Number.parseInt(dependenciaEfectiva, 10),
            actividad: actividad,
            fechaInicio: fecha_inicio,
            fechaFin: fecha_fin
        }).catch(console.error);

        // NOTIFICACIONES Y CORREO AL AUDITOR ASIGNADO
        pool.request()
            .input('accionId', sql.Int, inserted.recordset[0].id)
            .query(`
                SELECT 
                    aud.Id as AuditorId,
                    aud.Email as AuditorEmail,
                    aud.FullName as AuditorName,
                    f.ReferenceCode as HallazgoRef,
                    lider.FullName as LiderName,
                    d.Name as DependenciaName
                FROM [Improvement].[ActionPlans] am
                INNER JOIN [Improvement].[RootCauses] c ON am.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id
                LEFT JOIN [Identity].[Users] aud ON f.AuditorId = aud.Id
                LEFT JOIN [Identity].[Users] lider ON f.LeaderId = lider.Id
                LEFT JOIN [Organization].[Departments] d ON f.DepartmentId = d.Id
                WHERE am.Id = @accionId
            `).then(mailInfo => {
                if (mailInfo.recordset.length > 0) {
                    const info = mailInfo.recordset[0];

                    // Disparar Notificación SSE al Auditor
                    if (info.AuditorId) {
                        notificationEmitter.emitUserEvent(info.AuditorId, {
                            type: 'info',
                            title: 'Plan de Acción Formulado',
                            message: `Ref: ${info.HallazgoRef}\nDependencia: ${info.DependenciaName || 'N/A'}\nLíder: ${info.LiderName || 'N/A'}\nActividad: ${actividad}\nVencimiento: ${fecha_fin}`,
                            linkUrl: `/acciones`
                        });
                    }

                    // Enviar correo
                    if (info.AuditorEmail) {
                        sendActionCreatedEmail(info.AuditorEmail, info.AuditorName, {
                            numeroHallazgo: info.HallazgoRef,
                            actividad: actividad,
                            fechaFin: fecha_fin
                        }).catch(err => console.error('Error enviando correo de generacion de accion:', err));
                    }
                }
            }).catch(e => console.error('Error enviando notificacion al auditor:', e));

        return res.status(201).json({
            id: inserted.recordset[0].id,
            message: 'Accion creada correctamente',
        });
    } catch (error) {
        return sendServerError(res, 'Error al crear accion', error);
    }
};

export const updateAccion = async (req, res) => {
    try {
        const accionId = Number.parseInt(req.params.id, 10);
        const actor = getActorUserId(req);
        const pool = await getConnection();

        const current = await pool.request()
            .input('id', sql.Int, accionId)
            .query('SELECT * FROM [Improvement].[ActionPlans] WHERE Id = @id');
        if (current.recordset.length === 0) {
            return res.status(404).json({ error: 'Accion no encontrada' });
        }
        const row = current.recordset[0];

        let existingDependencia = null;
        if (row.ResponsibleUserId) {
            const depQuery = await pool.request()
                .input('userId', sql.UniqueIdentifier, row.ResponsibleUserId)
                .query('SELECT DepartmentId FROM [Identity].[Users] WHERE Id = @userId');
            if (depQuery.recordset.length > 0) {
                existingDependencia = depQuery.recordset[0].DepartmentId;
            }
        }

        const next = {
            actividad: req.body.actividad ?? row.TaskDescription,
            meta: req.body.descripcion_meta ?? row.ExpectedOutcome,
            denominacion: req.body.denominacion_unidad ?? row.UnitOfMeasureName,
            unidad: req.body.unidad ?? row.TargetQuantity,
            fechaInicio: req.body.fecha_inicio ?? row.StartDate,
            fechaFin: req.body.fecha_fin ?? row.TargetCompletionDate,
            dependencia: req.body.dependencia_responsable ?? existingDependencia,
            fechaCierre: req.body.fecha_cierre ?? row.ClosedDate,
            impacto: req.body.impacto ?? row.ImprovementImpact,
        };

        // Validar: no se puede cerrar si el avance no es 100%
        const intentaCerrar = req.body.fecha_cierre && !row.ClosedDate;
        if (intentaCerrar) {
            const avanceResult = await pool.request()
                .input('accionId', sql.Int, accionId)
                .query(`
                    SELECT
                        ISNULL((
                            SELECT TOP 1 PhysicalAdvanceQuantity
                            FROM [Improvement].[ProgressLogs]
                            WHERE ActionPlanId = @accionId
                            ORDER BY LogDate DESC
                        ), 0) AS ultimoAvance,
                        ISNULL(TargetQuantity, 0) AS meta
                    FROM [Improvement].[ActionPlans]
                    WHERE Id = @accionId
                `);

            if (avanceResult.recordset.length > 0) {
                const { ultimoAvance, meta } = avanceResult.recordset[0];
                const avancePct = meta > 0 ? (ultimoAvance / meta) * 100 : 0;
                if (avancePct < 100) {
                    return res.status(400).json({
                        error: `No se puede cerrar la acción. El avance actual es ${Math.round(avancePct)}% y debe ser del 100% para poder cerrarla.`
                    });
                }
            }
        }

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

        // Si no es admin ni auditor, forzamos que la dependencia re-asignada sea la suya (o rechazar si intentan cambiarla)
        // Por seguridad, un Líder no debería poder reasignar a otro departamento.
        let dependenciaEfectivaUpdate = next.dependencia;
        if (!isAdministrador && !isControlInterno) {
            if (!userDepartmentId) {
                return res.status(403).json({ error: 'Acceso denegado: Usuario no tiene departamento asignado.' });
            }
            dependenciaEfectivaUpdate = userDepartmentId;
        }

        await pool.request()
            .input('id', sql.Int, accionId)
            .input('actividad', sql.VarChar(1000), next.actividad)
            .input('meta', sql.VarChar(1000), next.meta)
            .input('denominacion', sql.VarChar(1000), next.denominacion || null)
            .input('unidad', sql.Decimal(11, 2), next.unidad ?? null)
            .input('fechaInicio', sql.Date, next.fechaInicio)
            .input('fechaFin', sql.Date, next.fechaFin)
            .input('dependencia', sql.Int, Number.parseInt(dependenciaEfectivaUpdate, 10))
            .input('fechaCierre', sql.Date, next.fechaCierre || null)
            .input('impacto', sql.VarChar(1000), next.impacto || null)
            .query(`
                UPDATE [Improvement].[ActionPlans]
                SET
                    TaskDescription = @actividad,
                    ExpectedOutcome = @meta,
                    UnitOfMeasureName = @denominacion,
                    TargetQuantity = @unidad,
                    StartDate = @fechaInicio,
                    TargetCompletionDate = @fechaFin,
                    ResponsibleUserId = (SELECT TOP 1 Id FROM [Identity].[Users] WHERE DepartmentId = @dependencia),
                    ClosedDate = @fechaCierre,
                    ImprovementImpact = @impacto
                WHERE Id = @id
            `);

        // Removed insertHistorico since legacy table was not migrated


        return res.json({ message: 'Accion actualizada correctamente' });
    } catch (error) {
        return sendServerError(res, 'Error al actualizar accion', error);
    }
};

export const createEvaluacion = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const accionId = Number.parseInt(req.params.accionId, 10);
        const {
            fecha,
            avance,
            avance_cualitativo,
            archivo,
            observaciones,
            replica,
            conclusion,
            archivo_replica,
        } = req.body;

        const pool = await getConnection();
        const inserted = await pool.request()
            .input('accionId', sql.Int, accionId)
            .input('fecha', sql.Date, fecha || new Date())
            .input('avance', sql.Decimal(11, 2), avance ?? null)
            .input('avanceCualitativo', sql.VarChar(1000), avance_cualitativo || null)
            .input('archivo', sql.VarChar(1000), archivo || null)
            .input('observaciones', sql.VarChar(1000), observaciones || null)
            .input('replica', sql.VarChar(1000), replica || null)
            .input('conclusion', sql.VarChar(1000), conclusion || null)
            .input('archivoReplica', sql.VarChar(1000), archivo_replica || null)
            .input('usuario', sql.UniqueIdentifier, actor)
            .query(`
                INSERT INTO [Improvement].[ProgressLogs] (
                    ActionPlanId,
                    LogDate,
                    PhysicalAdvanceQuantity,
                    CompletionPercentage,
                    QualitativeNotes,
                    EvidenceUrl,
                    AuditorObservation,
                    LeaderReply,
                    AuditorConclusion,
                    ReplyAttachmentUrl,
                    CreatedById,
                    ObservationById,
                    ObservationDate,
                    ReplyDate,
                    ConclusionDate,
                    CreatedAt
                )
                OUTPUT INSERTED.Id as id
                VALUES (
                    @accionId,
                    @fecha,
                    ISNULL(@avance, 0),
                    0, -- CompletionPercentage (calculated elsewhere if needed)
                    @avanceCualitativo,
                    @archivo,
                    @observaciones,
                    @replica,
                    @conclusion,
                    @archivoReplica,
                    @usuario,
                    CASE WHEN @observaciones IS NULL THEN NULL ELSE @usuario END,
                    CASE WHEN @observaciones IS NULL THEN NULL ELSE @fecha END,
                    CASE WHEN @replica IS NULL THEN NULL ELSE @fecha END,
                    CASE WHEN @conclusion IS NULL THEN NULL ELSE @fecha END,
                    GETDATE()
                )
            `);

        return res.status(201).json({
            id: inserted.recordset[0].id,
            message: 'Evaluacion registrada correctamente',
        });
    } catch (error) {
        return sendServerError(res, 'Error al crear evaluacion', error);
    }
};

export const getAcciones = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const { hallazgoId, dependenciaId, estado } = req.query;
        const pool = await getConnection();

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
                am.Id as id,
                am.TaskDescription as actividad,
                am.ExpectedOutcome as descripcion_meta,
                am.TargetQuantity as unidad,
                am.StartDate as fecha_inicio,
                am.TargetCompletionDate as fecha_fin,
                am.ClosedDate as fecha_cierre,
                am.ApprovalStatus as aprobada,
                d.Name as dependencia,
                ca.FindingId as hallazgo_id,
                (
                    SELECT TOP 1 ame.PhysicalAdvanceQuantity
                    FROM [Improvement].[ProgressLogs] ame
                    WHERE ame.ActionPlanId = am.Id
                    ORDER BY ame.LogDate DESC
                ) as avance_actual
            FROM [Improvement].[ActionPlans] am
            LEFT JOIN [Identity].[Users] u ON am.ResponsibleUserId = u.Id
            LEFT JOIN [Organization].[Departments] d ON u.DepartmentId = d.Id
            LEFT JOIN [Improvement].[RootCauses] ca ON am.RootCauseId = ca.Id
            WHERE 1=1
        `;
        const request = pool.request();

        // 1. Filtro Obligatorio de Seguridad (Aislamiento por Dependencia)
        if (requiresDepartmentFilter) {
            if (!userDepartmentId) {
                return res.json([]);
            }
            query += ' AND am.ResponsibleUserId IN (SELECT Id FROM [Identity].[Users] WHERE DepartmentId = @userDepartmentId)';
            request.input('userDepartmentId', sql.Int, userDepartmentId);
        }

        // 2. Filtros de Búsqueda Normales
        if (hallazgoId) {
            query += ' AND ca.FindingId = @hallazgoId';
            request.input('hallazgoId', sql.Int, Number.parseInt(hallazgoId, 10));
        }
        if (dependenciaId) {
            query += ' AND am.ResponsibleUserId IN (SELECT Id FROM [Identity].[Users] WHERE DepartmentId = @dependenciaId)';
            request.input('dependenciaId', sql.Int, Number.parseInt(dependenciaId, 10));
        }
        if (estado === 'cerrada') {
            query += ' AND am.ClosedDate IS NOT NULL';
        } else if (estado === 'abierta') {
            query += ' AND am.ClosedDate IS NULL';
        } else if (estado === 'vencida') {
            query += ' AND am.ClosedDate IS NULL AND am.TargetCompletionDate < CONVERT(date, GETDATE())';
        }
        query += ' ORDER BY am.TargetCompletionDate ASC, am.Id DESC';
        const result = await request.query(query);
        return res.json(result.recordset);
    } catch (error) {
        return sendServerError(res, 'Error al obtener acciones', error);
    }
};

export const solicitarNovedadAccion = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const accionId = Number.parseInt(req.params.id, 10);
        const {
            fecha_propuesta,
            justificacion,
            tipo,
            actividad_propuesta,
            dependencia_responsable_propuesta,
            unidad_propuesta,
        } = req.body;

        if (!justificacion || !tipo) {
            return res.status(400).json({ error: 'justificacion y tipo son obligatorios' });
        }

        const pool = await getConnection();
        const current = await pool.request()
            .input('id', sql.Int, accionId)
            .query(`
                SELECT
                    Id as acc_mej_id,
                    TargetCompletionDate as acc_mej_fecha_fin,
                    TaskDescription as acc_mej_actividad,
                    (SELECT DepartmentId FROM [Identity].[Users] WHERE Id = ResponsibleUserId) as acc_mej_dependencia_responsable,
                    TargetQuantity as acc_mej_unidad
                FROM [Improvement].[ActionPlans]
                WHERE Id = @id
            `);
        if (current.recordset.length === 0) {
            return res.status(404).json({ error: 'Accion no encontrada' });
        }
        const row = current.recordset[0];

        // Ensure we remap 'tipo' correctly. The old schema probably used 1 for prorroga, 2 for mod.
        // Look at the migration script: CASE WHEN n.acc_mej_nov_tipo = 1 THEN 0 ELSE 1 END as RequestType
        // So 1 -> 0, anything else -> 1 for the new db
        let dbRequestType = tipo == 1 ? 0 : 1;

        const inserted = await pool.request()
            .input('accionId', sql.Int, accionId)
            .input('fechaPropuesta', sql.Date, fecha_propuesta || null)
            .input('justificacion', sql.VarChar(1000), justificacion)
            .input('usuario', sql.UniqueIdentifier, actor)
            .input('tipo', sql.Int, dbRequestType)
            .query(`
                INSERT INTO [Improvement].[ModificationRequests] (
                    ActionPlanId,
                    RequestType,
                    ProposedTargetDate,
                    Justification,
                    RequestedById,
                    ApprovalStatus,
                    CreatedAt
                )
                OUTPUT INSERTED.Id as id
                VALUES (
                    @accionId,
                    @tipo,
                    @fechaPropuesta,
                    @justificacion,
                    @usuario,
                    0,
                    GETDATE()
                )
            `);

        // Removed insertHistorico since legacy table was not migrated

        // NOTIFICACIÓN
        notifyNovedadCreated({
            accionId,
            justificacion,
            usuarioSolicitante: actor
        }).catch(console.error);

        return res.status(201).json({
            id: inserted.recordset[0].id,
            message: 'Novedad solicitada correctamente',
        });
    } catch (error) {
        return sendServerError(res, 'Error al solicitar novedad', error);
    }
};

export const getTimelineAccion = async (req, res) => {
    try {
        const accionId = Number.parseInt(req.params.id, 10);
        const pool = await getConnection();

        // Mapa de etiquetas para tipos históricos
        const HISTORICO_LABELS = {
            1: 'Hallazgo Creado',
            2: 'Hallazgo Actualizado',
            3: 'Hallazgo Eliminado',
            4: 'Causa Creada',
            5: 'Causa Actualizada',
            6: 'Causa Eliminada',
            7: 'Acción Creada',
            8: 'Acción Actualizada',
            9: 'Acción Eliminada',
            10: 'Solicitud de Aprobación',
            11: 'Aprobación Aprobada',
            12: 'Aprobación Rechazada',
            13: 'Novedad Solicitada',
            14: 'Novedad Aprobada',
            15: 'Novedad Rechazada',
        };

        const [evaluaciones, novedades, historico] = await Promise.all([
            // Evaluaciones con usuario
            pool.request()
                .input('id', sql.Int, accionId)
                .query(`
SELECT
    'evaluacion' as tipo,
    ame.Id as id,
    NULL as logId,
    CAST(ame.LogDate as DATETIME) as fecha,
    ame.QualitativeNotes as descripcion,
    u.FullName as usuario,
    ame.EvidenceUrl as archivo
FROM [Improvement].[ProgressLogs] ame
LEFT JOIN [Identity].[Users] u ON ame.CreatedById = u.Id
WHERE ame.ActionPlanId = @id

UNION ALL

SELECT
    'observacion' as tipo,
    ame.Id as id,
    ame.Id as logId,
    CAST(ame.ObservationDate as DATETIME) as fecha,
    ame.AuditorObservation as descripcion,
    u2.FullName as usuario,
    NULL as archivo
FROM [Improvement].[ProgressLogs] ame
LEFT JOIN [Identity].[Users] u2 ON ame.ObservationById = u2.Id
WHERE ame.ActionPlanId = @id
AND ame.AuditorObservation IS NOT NULL
AND ame.AuditorObservation != ''

UNION ALL

SELECT
    'replica' as tipo,
    ame.Id as id,
    ame.Id as logId,
    CAST(ame.ReplyDate as DATETIME) as fecha,
    ame.LeaderReply as descripcion,
    u_lider.FullName as usuario,
    ame.ReplyAttachmentUrl as archivo
FROM [Improvement].[ProgressLogs] ame
LEFT JOIN [Identity].[Users] u_lider ON ame.CreatedById = u_lider.Id
WHERE ame.ActionPlanId = @id
AND ame.LeaderReply IS NOT NULL
AND ame.LeaderReply != ''

UNION ALL

SELECT
    'conclusion' as tipo,
    ame.Id as id,
    ame.Id as logId,
    CAST(ame.ConclusionDate as DATETIME) as fecha,
    ame.AuditorConclusion as descripcion,
    u_aud.FullName as usuario,
    NULL as archivo
FROM [Improvement].[ProgressLogs] ame
LEFT JOIN [Identity].[Users] u_aud ON ame.ObservationById = u_aud.Id
WHERE ame.ActionPlanId = @id
AND ame.AuditorConclusion IS NOT NULL
AND ame.AuditorConclusion != ''
    `),
            // Novedades con usuario
            pool.request()
                .input('id', sql.Int, accionId)
                .query(`
SELECT
    'novedad' as tipo,
    n.Id as id,
    CONVERT(date, n.ProposedTargetDate) as fecha,
    n.Justification as descripcion,
    u.FullName as usuario
FROM [Improvement].[ModificationRequests] n
LEFT JOIN [Identity].[Users] u ON n.RequestedById = u.Id
WHERE n.ActionPlanId = @id
    `),
            // Historico was not migrated, returning empty
            { recordset: [] }
        ]);

        // Formatear histórico
        const historicoFormatted = historico.recordset.map(h => ({
            tipo: 'historico',
            id: h.id,
            fecha: h.fecha,
            descripcion: HISTORICO_LABELS[h.tipoHistorico] || `Evento Histórico(Código: ${h.tipoHistorico})`,
            usuario: h.usuario
        }));

        const timeline = [
            ...evaluaciones.recordset,
            ...novedades.recordset,
            ...historicoFormatted,
        ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        return res.json(timeline);
    } catch (error) {
        return sendServerError(res, 'Error al obtener timeline de la accion', error);
    }
};

/**
 * Obtener detalle de una acción específica por ID (incluyendo evaluaciones)
 */
export const getAccionById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        // 1. Obtener datos básicos de la acción
        const resultAccion = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query(`
SELECT
    am.Id as id,
    am.TaskDescription as accion,
    am.TaskDescription as actividad,
    am.ExpectedOutcome as descripcionMetas,
    am.ExpectedOutcome as descripcion_meta,
    am.UnitOfMeasureName as denominacionUnidad,
    am.TargetQuantity as entregablesTotales,
    am.StartDate as fechaInicio,
    am.TargetCompletionDate as fechaFin,
    am.ClosedDate as fechaCierre,
    am.CreatedAt as fechaAprobacion,
    NULL as observacionesAprobacion,
    d.Name as responsable,
    d.Id as dependenciaId,
    CASE 
        WHEN am.ApprovalStatus = 0 THEN 'Pendiente Aprobación'
        WHEN am.ApprovalStatus = 2 THEN 'Rechazada'
        WHEN am.ClosedDate IS NOT NULL THEN 'Cerrada'
        WHEN am.TargetCompletionDate < GETDATE() THEN 'Vencida'
        WHEN am.TargetCompletionDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE()) THEN 'Próxima'
        ELSE 'En Ejecución'
    END as estado,
    am.ApprovalStatus as approvalStatus,
    ISNULL((
        SELECT TOP 1 PhysicalAdvanceQuantity
        FROM [Improvement].[ProgressLogs] 
        WHERE ActionPlanId = am.Id 
        ORDER BY LogDate DESC
    ), '0') as entregablesRealizadosUltimaEval
FROM [Improvement].[ActionPlans] am
LEFT JOIN [Identity].[Users] u ON am.ResponsibleUserId = u.Id
LEFT JOIN [Organization].[Departments] d ON u.DepartmentId = d.Id
WHERE am.Id = @id
    `);

        if (resultAccion.recordset.length === 0) {
            return res.status(404).json({ error: 'Acción no encontrada' });
        }

        const accion = resultAccion.recordset[0];

        // 2. Obtener evaluaciones con usuarios
        const resultEvaluaciones = await pool.request()
            .input('accionId', sql.Int, parseInt(id))
            .query(`
SELECT
    ame.Id as id,
    ame.PhysicalAdvanceQuantity as entregablesRealizados,
    ame.QualitativeNotes as avanceCualitativo,
    ame.LogDate as fecha,
    ame.EvidenceUrl as archivo,
    ame.ReplyAttachmentUrl as archivoReplica,
    ame.AuditorObservation as observaciones,
    ame.ObservationDate as fechaObservaciones,
    ame.LeaderReply as replica,
    ame.ReplyDate as fechaReplica,
    ame.AuditorConclusion as conclusion,
    ame.ConclusionDate as fechaConclusion,
    u1.FullName as usuarioCreador,
    u2.FullName as usuarioObservaciones,
    NULL as usuarioReplica,
    NULL as usuarioConclusion
FROM [Improvement].[ProgressLogs] ame
LEFT JOIN [Identity].[Users] u1 ON ame.CreatedById = u1.Id
LEFT JOIN [Identity].[Users] u2 ON ame.ObservationById = u2.Id
WHERE ame.ActionPlanId = @accionId
ORDER BY ame.LogDate DESC
    `);

        // 3. Procesar datos (lógica idéntica a getDetalleHallazgo)
        const parseNumericSafe = (value) => {
            if (value === null || value === undefined || value === '') return 0;
            const parsed = parseFloat(String(value).replace(',', '.').trim());
            return isNaN(parsed) ? 0 : parsed;
        };

        const entregablesTotales = parseNumericSafe(accion.entregablesTotales);
        const entregablesRealizadosFromEval = parseNumericSafe(accion.entregablesRealizadosUltimaEval);

        const evaluacionesProcesadas = resultEvaluaciones.recordset.map(ev => {
            const entregablesEval = parseNumericSafe(ev.entregablesRealizados);
            const porcentajeEval = entregablesTotales > 0
                ? Math.round((entregablesEval / entregablesTotales) * 100 * 100) / 100
                : 0;

            return {
                ...ev,
                entregablesRealizados: entregablesEval,
                avancePorcentual: porcentajeEval,
                soporteAvance: ev.avanceCualitativo,
                archivoAdjunto: ev.archivo,
                archivoReplicaAdjunto: ev.archivoReplica
            };
        });

        let avanceFinal = 0;
        if (entregablesTotales > 0) {
            avanceFinal = (entregablesRealizadosFromEval / entregablesTotales) * 100;
        }

        const response = {
            ...accion,
            entregablesRealizados: entregablesRealizadosFromEval,
            avance: Math.round(avanceFinal * 100) / 100,
            avance_actual: Math.round(avanceFinal * 100) / 100, // Alias para frontend
            evaluaciones: evaluacionesProcesadas
        };

        return res.json(response);

    } catch (error) {
        return sendServerError(res, 'Error al obtener detalle de la acción', error);
    }
};

export const triggerExpirationCheck = async (req, res) => {
    try {
        const result = await checkAndNotifyExpiringActions();
        res.json({ message: 'Expiration check completed', result });
    } catch (error) {
        return sendServerError(res, 'Error triggering expiration check', error);
    }
};

export const approveAccion = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const accionId = Number.parseInt(req.params.id, 10);
        const { aprobado, observaciones } = req.body; // aprobado: boolean

        if (typeof aprobado !== 'boolean') {
            return res.status(400).json({ error: 'El campo aprobado (boolean) es obligatorio' });
        }

        const pool = await getConnection();

        const current = await pool.request()
            .input('id', sql.Int, accionId)
            .query(`
                SELECT 
                    a.Id, 
                    a.ApprovalStatus,
                    f.AuditorId
                FROM [Improvement].[ActionPlans] a
                INNER JOIN [Improvement].[RootCauses] c ON a.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id
                WHERE a.Id = @id
            `);

        if (current.recordset.length === 0) {
            return res.status(404).json({ error: 'Acción no encontrada' });
        }

        const accionData = current.recordset[0];

        // Opcional: Validar que sea Administrador o el Auditor asignado
        // getActorUserId(req) nos da el ID como String, SQL lo retorna como String.
        // Necesitamos validar si el request viene de un Admin (el middleware requireRole lo asegura)
        // pero queremos dar prioridad al Auditor Asignado. Si requerimos estricto:
        const userRolesIdQuery = await pool.request().input('userId', sql.UniqueIdentifier, actor).query(`
            SELECT r.Name 
            FROM [Identity].[UserRoles] ur
            INNER JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
            WHERE ur.UserId = @userId
        `);
        const isAdministrador = userRolesIdQuery.recordset.some(r => r.Name === 'Administrador');

        if (!isAdministrador && accionData.AuditorId && accionData.AuditorId.toUpperCase() !== actor.toUpperCase()) {
            return res.status(403).json({ error: 'No tienes permiso para aprobar esta acción. Solo el Auditor asignado o un Administrador pueden hacerlo.' });
        }

        const newStatus = aprobado ? 1 : 2; // 1: Aprobada, 2: Rechazada

        await pool.request()
            .input('id', sql.Int, accionId)
            .input('status', sql.Int, newStatus)
            .query(`
                UPDATE [Improvement].[ActionPlans]
                SET ApprovalStatus = @status
                WHERE Id = @id
            `);

        // Registrar en timeline (opcional pero recomendado)
        await pool.request()
            .input('accionId', sql.Int, accionId)
            .input('usuario', sql.UniqueIdentifier, actor)
            .input('observaciones', sql.VarChar(1000), observaciones || (aprobado ? 'Acción aprobada por Control Interno' : 'Acción rechazada por Control Interno'))
            .query(`
                INSERT INTO [Improvement].[ProgressLogs] (
                    ActionPlanId,
                    LogDate,
                    PhysicalAdvanceQuantity,
                    CompletionPercentage,
                    QualitativeNotes,
                    CreatedById,
                    CreatedAt
                ) VALUES (
                    @accionId,
                    GETDATE(),
                    0,
                    0,
                    @observaciones,
                    @usuario,
                    GETDATE()
                )
            `);

        return res.json({
            message: aprobado ? 'Acción aprobada correctamente' : 'Acción rechazada correctamente',
            status: newStatus
        });
    } catch (error) {
        return sendServerError(res, 'Error al procesar la aprobación de la acción', error);
    }
};

export const evaluateProgressLog = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const logId = Number.parseInt(req.params.logId, 10);
        const { observaciones, conclusion, isConclusion } = req.body;

        if (!observaciones && !conclusion) {
            return res.status(400).json({ error: 'Se requiere observación o conclusión' });
        }

        const pool = await getConnection();

        // Verificar el Auditor responsable
        const auditorQuery = await pool.request()
            .input('logId', sql.Int, logId)
            .query(`
                SELECT 
                    f.AuditorId
                FROM [Improvement].[ProgressLogs] log
                INNER JOIN [Improvement].[ActionPlans] a ON log.ActionPlanId = a.Id
                INNER JOIN [Improvement].[RootCauses] c ON a.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id
                WHERE log.Id = @logId
            `);

        if (auditorQuery.recordset.length === 0) {
            return res.status(404).json({ error: 'Log de avance no encontrado' });
        }

        const logData = auditorQuery.recordset[0];

        const userRolesIdQuery = await pool.request().input('userId', sql.UniqueIdentifier, actor).query(`
            SELECT r.Name 
            FROM [Identity].[UserRoles] ur
            INNER JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
            WHERE ur.UserId = @userId
        `);
        const isAdministrador = userRolesIdQuery.recordset.some(r => r.Name === 'Administrador');

        if (!isAdministrador && logData.AuditorId && logData.AuditorId.toUpperCase() !== actor.toUpperCase()) {
            return res.status(403).json({ error: 'No tienes permiso para evaluar este avance. Solo el Auditor asignado o un Administrador pueden hacerlo.' });
        }

        let updateQuery = '';
        const request = pool.request()
            .input('logId', sql.Int, logId)
            .input('usuario', sql.UniqueIdentifier, actor)
            .input('fecha', sql.DateTime, new Date());

        if (isConclusion) {
            updateQuery = `
                UPDATE [Improvement].[ProgressLogs]
                SET AuditorConclusion = CASE 
                        WHEN AuditorConclusion IS NULL OR AuditorConclusion = '' THEN @conclusion 
                        ELSE AuditorConclusion + CHAR(13) + CHAR(10) + '--- Nueva Conclusión: ' + @conclusion 
                    END,
                    ConclusionDate = @fecha
                WHERE Id = @logId
            `;
            request.input('conclusion', sql.VarChar(sql.MAX), conclusion);
        } else {
            updateQuery = `
                UPDATE [Improvement].[ProgressLogs]
                SET AuditorObservation = CASE 
                        WHEN AuditorObservation IS NULL OR AuditorObservation = '' THEN @observaciones 
                        ELSE AuditorObservation + CHAR(13) + CHAR(10) + '--- Nueva Observación: ' + @observaciones 
                    END,
                    ObservationById = @usuario,
                    ObservationDate = @fecha
                WHERE Id = @logId
            `;
            request.input('observaciones', sql.VarChar(sql.MAX), observaciones);
        }

        await request.query(updateQuery);

        // Disparar correo electrónico y notificación SSE al Líder notificando la observación/conclusión
        if (!isAdministrador) {
            pool.request().input('logId', sql.Int, logId).query(`
                SELECT 
                    u.Id as LiderId,
                    u.Email as LiderEmail,
                    u.FullName as LiderName,
                    f.ReferenceCode as HallazgoRef,
                    a.TaskDescription as Actividad,
                    aud.FullName as AuditorName
                FROM [Improvement].[ProgressLogs] log
                INNER JOIN [Improvement].[ActionPlans] a ON log.ActionPlanId = a.Id
                INNER JOIN [Improvement].[RootCauses] c ON a.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id
                INNER JOIN [Identity].[Users] u ON a.ResponsibleUserId = u.Id
                LEFT JOIN [Identity].[Users] aud ON f.AuditorId = aud.Id
                WHERE log.Id = @logId
            `).then(mailInfo => {
                if (mailInfo.recordset.length > 0) {
                    const info = mailInfo.recordset[0];

                    // Disparar Notificación SSE
                    if (info.LiderId) {
                        notificationEmitter.emitUserEvent(info.LiderId, {
                            type: 'warning',
                            title: isConclusion ? 'Conclusión de Auditor' : 'Observación en Avance',
                            message: `Ref: ${info.HallazgoRef}\nActividad: ${info.Actividad}\nAuditor: ${info.AuditorName || 'asignado'}\nMensaje: "${isConclusion ? conclusion : observaciones}"`,
                            linkUrl: `/acciones`
                        });
                    }

                    // Enviar correo
                    if (info.LiderEmail) {
                        sendObservationEmail(info.LiderEmail, info.LiderName, {
                            numeroHallazgo: info.HallazgoRef,
                            actividad: info.Actividad,
                            observacion: isConclusion ? conclusion : observaciones,
                            auditorName: info.AuditorName || 'Auditor'
                        }).catch(e => console.error('Error enviando correo de observacion:', e));
                    }
                }
            }).catch(e => console.error('Error consultando para notificacion observacion:', e));
        }

        return res.json({ message: 'Evaluación de seguimiento guardada correctamente' });
    } catch (error) {
        return sendServerError(res, 'Error al guardar la evaluación del seguimiento', error);
    }
};

export const replyToObservation = async (req, res) => {
    try {
        const { accionId, logId } = req.params;
        const { replica } = req.body;
        const actor = getActorUserId(req);

        if (!replica) {
            return res.status(400).json({ error: 'La réplica es obligatoria' });
        }

        const pool = await getConnection();

        const liderQuery = await pool.request()
            .input('logId', sql.Int, logId)
            .query(`
                SELECT 
                    a.ResponsibleUserId,
                    f.AuditorId as AuditorId,
                    u.Email as AuditorEmail,
                    u.FullName as AuditorName,
                    f.ReferenceCode as HallazgoRef,
                    a.TaskDescription as Actividad,
                    lider.FullName as LiderName
                FROM [Improvement].[ProgressLogs] log
                INNER JOIN [Improvement].[ActionPlans] a ON log.ActionPlanId = a.Id
                INNER JOIN [Improvement].[RootCauses] c ON a.RootCauseId = c.Id
                INNER JOIN [Improvement].[Findings] f ON c.FindingId = f.Id
                LEFT JOIN [Identity].[Users] u ON f.AuditorId = u.Id
                LEFT JOIN [Identity].[Users] lider ON a.ResponsibleUserId = lider.Id
                WHERE log.Id = @logId
            `);

        if (liderQuery.recordset.length === 0) {
            return res.status(404).json({ error: 'Log de avance no encontrado' });
        }

        const logData = liderQuery.recordset[0];

        const userRolesIdQuery = await pool.request().input('userId', sql.UniqueIdentifier, actor).query(`
            SELECT r.Name 
            FROM [Identity].[UserRoles] ur
            INNER JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
            WHERE ur.UserId = @userId
        `);
        const isAdministrador = userRolesIdQuery.recordset.some(r => r.Name === 'Administrador');

        if (!isAdministrador && logData.ResponsibleUserId && logData.ResponsibleUserId.toUpperCase() !== actor.toUpperCase()) {
            return res.status(403).json({ error: 'No tienes permiso para dar réplica a esta observación.' });
        }

        // Actualizar el ProgressLog con la réplica (Concatenando si hay varias)
        await pool.request()
            .input('logId', sql.Int, logId)
            .input('replica', sql.VarChar(sql.MAX), replica)
            .query(`
                UPDATE [Improvement].[ProgressLogs]
                SET LeaderReply = CASE 
                        WHEN LeaderReply IS NULL OR LeaderReply = '' THEN @replica 
                        ELSE LeaderReply + CHAR(13) + CHAR(10) + '--- Nueva Réplica: ' + @replica 
                    END,
                    ReplyDate = GETDATE()
                WHERE Id = @logId
            `);

        if (logData.AuditorId) {
            notificationEmitter.emitUserEvent(logData.AuditorId, {
                type: 'info',
                title: 'Réplica de Líder',
                message: `Ref: ${logData.HallazgoRef}\nLíder: ${logData.LiderName || 'N/A'}\nActividad: ${logData.Actividad}\nMensaje: "${replica}"`,
                linkUrl: '/acciones'
            });
        }

        return res.status(200).json({ message: 'Réplica registrada correctamente' });
    } catch (error) {
        return sendServerError(res, 'Error al responder observación', error);
    }
};

/**
 * Listar todas las novedades (solicitudes de modificación) con filtro por estado.
 * Por defecto retorna las pendientes (ApprovalStatus=0).
 */
export const getNovedadesPendientes = async (req, res) => {
    try {
        const { estado } = req.query; // 'pendiente' | 'aprobada' | 'rechazada' | undefined (todas)
        const pool = await getConnection();

        let statusFilter = '';
        if (estado === 'pendiente') statusFilter = 'WHERE mr.ApprovalStatus = 0';
        else if (estado === 'aprobada') statusFilter = 'WHERE mr.ApprovalStatus = 1';
        else if (estado === 'rechazada') statusFilter = 'WHERE mr.ApprovalStatus = 2';

        const result = await pool.request().query(`
            SELECT
                mr.Id as id,
                mr.ActionPlanId as accionId,
                mr.RequestType as tipo,
                CASE mr.RequestType
                    WHEN 0 THEN 'Prórroga'
                    WHEN 1 THEN 'Modificación de la Acción'
                    WHEN 2 THEN 'Modificación de Responsable'
                    WHEN 3 THEN 'Modificación de Unidades de Medida'
                    ELSE 'Novedad'
                END as tipoNombre,
                mr.ProposedTargetDate as fechaPropuesta,
                mr.Justification as justificacion,
                mr.ApprovalStatus as estado,
                CASE mr.ApprovalStatus
                    WHEN 0 THEN 'Pendiente'
                    WHEN 1 THEN 'Aprobada'
                    WHEN 2 THEN 'Rechazada'
                END as estadoNombre,
                NULL as fechaResolucion,
                mr.ApprovalNotes as observacionesResolucion,
                mr.CreatedAt as fechaSolicitud,
                u.FullName as solicitante,
                u.Email as emailSolicitante,
                am.TaskDescription as accion,
                am.TargetCompletionDate as fechaFinActual,
                am.StartDate as fechaInicio,
                d.Name as dependencia,
                f.ReferenceCode as hallazgoRef,
                rev.FullName as revisor
            FROM [Improvement].[ModificationRequests] mr
            LEFT JOIN [Improvement].[ActionPlans] am ON mr.ActionPlanId = am.Id
            LEFT JOIN [Identity].[Users] u ON mr.RequestedById = u.Id
            LEFT JOIN [Identity].[Users] rev ON mr.ApprovedById = rev.Id
            LEFT JOIN [Identity].[Users] resp ON am.ResponsibleUserId = resp.Id
            LEFT JOIN [Organization].[Departments] d ON resp.DepartmentId = d.Id
            LEFT JOIN [Improvement].[RootCauses] rc ON am.RootCauseId = rc.Id
            LEFT JOIN [Improvement].[Findings] f ON rc.FindingId = f.Id
            ${statusFilter}
            ORDER BY mr.CreatedAt DESC
        `);

        return res.json(result.recordset);
    } catch (error) {
        return sendServerError(res, 'Error al obtener novedades', error);
    }
};

/**
 * Aprobar o rechazar una novedad.
 * Si es una prórroga aprobada, actualiza TargetCompletionDate en ActionPlans.
 */
export const resolverNovedad = async (req, res) => {
    try {
        const actor = getActorUserId(req);
        const novedadId = Number.parseInt(req.params.novedadId, 10);
        const { aprobado, observaciones } = req.body;

        if (typeof aprobado !== 'boolean') {
            return res.status(400).json({ error: 'El campo aprobado (boolean) es obligatorio.' });
        }

        const pool = await getConnection();

        // 1. Obtener la novedad
        const novedadResult = await pool.request()
            .input('id', sql.Int, novedadId)
            .query(`
                SELECT mr.*, am.TargetCompletionDate
                FROM [Improvement].[ModificationRequests] mr
                INNER JOIN [Improvement].[ActionPlans] am ON mr.ActionPlanId = am.Id
                WHERE mr.Id = @id
            `);

        if (novedadResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Novedad no encontrada.' });
        }

        const novedad = novedadResult.recordset[0];

        if (novedad.ApprovalStatus !== 0) {
            return res.status(400).json({ error: 'Esta novedad ya fue procesada.' });
        }

        const newStatus = aprobado ? 1 : 2;

        // 2. Actualizar el estado de la novedad
        await pool.request()
            .input('id', sql.Int, novedadId)
            .input('status', sql.Int, newStatus)
            .input('revisor', sql.UniqueIdentifier, actor)
            .input('obs', sql.VarChar(sql.MAX), observaciones || null)
            .input('fecha', sql.DateTime, new Date())
            .query(`
                UPDATE [Improvement].[ModificationRequests]
                SET ApprovalStatus = @status,
                    ApprovedById = @revisor,
                    ApprovalNotes = @obs
                WHERE Id = @id
            `);

        // 3. Si es prórroga aprobada: actualizar fecha de fin de la acción
        if (aprobado && novedad.RequestType === 0 && novedad.ProposedTargetDate) {
            await pool.request()
                .input('accionId', sql.Int, novedad.ActionPlanId)
                .input('nuevaFecha', sql.Date, novedad.ProposedTargetDate)
                .query(`
        UPDATE[Improvement].[ActionPlans]
                    SET TargetCompletionDate = @nuevaFecha
                    WHERE Id = @accionId
            `);
        }

        // 4. Registrar en el timeline de la acción
        const mensaje = aprobado
            ? `Novedad aprobada: ${novedad.RequestType === 0 ? 'Prórroga hasta ' + (novedad.ProposedTargetDate?.toISOString().split('T')[0] || 'N/A') : 'Solicitud aprobada'}. ${observaciones || ''} `
            : `Novedad rechazada.${observaciones || ''} `;

        await pool.request()
            .input('accionId', sql.Int, novedad.ActionPlanId)
            .input('usuario', sql.UniqueIdentifier, actor)
            .input('mensaje', sql.VarChar(1000), mensaje)
            .query(`
                INSERT INTO[Improvement].[ProgressLogs](
                ActionPlanId, LogDate, PhysicalAdvanceQuantity,
                CompletionPercentage, QualitativeNotes, CreatedById, CreatedAt
            ) VALUES(
                @accionId, GETDATE(), 0, 0, @mensaje, @usuario, GETDATE()
            )
                `);

        return res.json({
            message: aprobado ? 'Novedad aprobada correctamente.' : 'Novedad rechazada correctamente.',
            status: newStatus
        });

    } catch (error) {
        return sendServerError(res, 'Error al resolver la novedad', error);
    }
};
