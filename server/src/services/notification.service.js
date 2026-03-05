
import { getConnection } from '../config/db.js';
import { sendEmail, getEmailTemplate } from '../utils/mailer.js';
import sql from 'mssql';

/**
 * Obtener correos de una dependencia
 */
const getEmailsByDependencia = async (dependenciaId) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('dependenciaId', sql.Int, dependenciaId)
            .query(`
                SELECT DISTINCT m.Email
                FROM aspnet_Membership m
                INNER JOIN perfil_usuario p ON m.UserId = p.per_usu_usuario
                WHERE p.per_usu_dependencia = @dependenciaId
                AND m.Email IS NOT NULL AND m.Email <> ''
            `);
        return result.recordset.map(r => r.Email);
    } catch (error) {
        console.error('[Notification] Error fetching emails for dependency:', error);
        return [];
    }
};

/**
 * Obtener correo de un usuario específico
 */
const getEmailByUserId = async (userId) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
                SELECT Email
                FROM aspnet_Membership
                WHERE UserId = @userId
            `);
        return result.recordset[0]?.Email;
    } catch (error) {
        console.error('[Notification] Error fetching email for user:', error);
        return null;
    }
};

/**
 * Notificar Asignación de Acción
 */
export const notifyAccionAssigned = async (accion) => {
    try {
        const emails = await getEmailsByDependencia(accion.dependenciaId);
        if (emails.length === 0) return;

        const subject = `Nueva Acción de Mejora Asignada - ${accion.id}`;
        const body = `
            <p>Se ha asignado una nueva acción de mejora a su dependencia.</p>
            <div class="info-box">
                <strong>Actividad:</strong> ${accion.actividad}<br/>
                <strong>Fecha Inicio:</strong> ${accion.fechaInicio}<br/>
                <strong>Fecha Fin:</strong> ${accion.fechaFin}<br/>
            </div>
            <p>Por favor ingrese al sistema para gestionar esta acción.</p>
            <a href="${process.env.FRONTEND_URL}/acciones" class="btn">Ver Acciones</a>
        `;

        const html = getEmailTemplate('Nueva Acción Asignada', body);

        // Enviar a todos los usuarios de la dependencia
        for (const email of emails) {
            await sendEmail(email, subject, html);
        }
    } catch (error) {
        console.error('[Notification] Error notifying assignment:', error);
    }
};

/**
 * Notificar Aprobación/Rechazo de Acción
 */
export const notifyAccionResolution = async (accionId, approved, observaciones) => {
    try {
        const pool = await getConnection();
        // Obtener datos de la acción para saber a quién notificar (creador o responsable)
        // Por ahora notificamos a la dependencia responsable
        const result = await pool.request()
            .input('id', sql.Int, accionId)
            .query(`
                SELECT acc_mej_actividad, acc_mej_dependencia_responsable
                FROM acciones_mejoramiento
                WHERE acc_mej_id = @id
            `);

        if (result.recordset.length === 0) return;
        const accion = result.recordset[0];

        const emails = await getEmailsByDependencia(accion.acc_mej_dependencia_responsable);
        if (emails.length === 0) return;

        const estadoString = approved ? 'APROBADA' : 'RECHAZADA';
        const subject = `Acción de Mejora ${estadoString} - ${accionId}`;
        const colorClass = approved ? 'info-box' : 'warning-box';

        const body = `
            <p>La acción de mejora ha sido <strong>${estadoString}</strong>.</p>
            <div class="${colorClass}">
                <strong>Actividad:</strong> ${accion.acc_mej_actividad}<br/>
                <strong>Observaciones:</strong> ${observaciones || 'Ninguna'}<br/>
            </div>
            <a href="${process.env.FRONTEND_URL}/acciones" class="btn">Ver Detalles</a>
        `;

        const html = getEmailTemplate(`Acción ${estadoString}`, body);

        for (const email of emails) {
            await sendEmail(email, subject, html);
        }

    } catch (error) {
        console.error('[Notification] Error notifying resolution:', error);
    }
};

/**
 * Notificar Nueva Novedad (Solicitud de cambio)
 * Se notifica a los aprobadores (Planeación)
 */
export const notifyNovedadCreated = async (novedad) => {
    try {
        // TODO: Definir quiénes son los aprobadores. Por ahora usaremos una variable de entorno o un rol específico si existiera.
        // Asumiremos que se notifica a un correo administrativo configurado
        const adminEmail = process.env.ADMIN_EMAIL_NOTIFICATIONS;
        if (!adminEmail) return;

        const subject = `Nueva Novedad Reportada - Acción ${novedad.accionId}`;
        const body = `
            <p>Se ha reportado una nueva novedad (solicitud de cambio) para una acción de mejora.</p>
            <div class="info-box">
                <strong>Justificación:</strong> ${novedad.justificacion}<br/>
                <strong>Fecha Solicitud:</strong> ${new Date().toLocaleDateString()}<br/>
            </div>
            <p>Se requiere su revisión para aprobar o rechazar esta solicitud.</p>
            <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Ir al Dashboard</a>
        `;

        const html = getEmailTemplate('Nueva Novedad', body);
        await sendEmail(adminEmail, subject, html);

    } catch (error) {
        console.error('[Notification] Error notifying novedad:', error);
    }
};

/**
 * Notificar Resolución de Novedad
 */
export const notifyNovedadResolution = async (novedadId, approved, observaciones) => {
    try {
        const pool = await getConnection();
        // Obtener datos de la novedad y la acción asociada
        const result = await pool.request()
            .input('id', sql.Int, novedadId)
            .query(`
                SELECT n.acc_mej_nov_justificacion, am.acc_mej_dependencia_responsable, am.acc_mej_actividad
                FROM acciones_mejoramiento_novedad n
                INNER JOIN acciones_mejoramiento am ON n.acc_mej_nov_accion_mejoramiento = am.acc_mej_id
                WHERE n.acc_mej_nov_id = @id
            `);

        if (result.recordset.length === 0) return;
        const data = result.recordset[0];

        const emails = await getEmailsByDependencia(data.acc_mej_dependencia_responsable);
        if (emails.length === 0) return;

        const estadoString = approved ? 'APROBADA' : 'RECHAZADA';
        const subject = `Novedad ${estadoString} - Solicitud de Cambio`;

        const body = `
            <p>La solicitud de novedad (cambio) para la acción de mejora ha sido <strong>${estadoString}</strong>.</p>
            <div class="info-box">
                <strong>Acción:</strong> ${data.acc_mej_actividad}<br/>
                <strong>Justificación Original:</strong> ${data.acc_mej_nov_justificacion}<br/>
                <strong>Observaciones Aprobador:</strong> ${observaciones || 'Ninguna'}<br/>
            </div>
        `;

        const html = getEmailTemplate(`Novedad ${estadoString}`, body);

        for (const email of emails) {
            await sendEmail(email, subject, html);
        }

    } catch (error) {
        console.error('[Notification] Error notifying novedad resolution:', error);
    }
};

/**
 * Verificar y notificar acciones próximas a vencer
 * (Se puede ejecutar mediante un Cron Job o endpoint manual)
 */
export const checkAndNotifyExpiringActions = async () => {
    try {
        const pool = await getConnection();
        // Buscar acciones que vencen en los próximos 30 días y no están cerradas
        const result = await pool.request().query(`
            SELECT 
                am.acc_mej_id as id,
                am.acc_mej_actividad as actividad,
                am.acc_mej_fecha_fin as fechaFin,
                am.acc_mej_dependencia_responsable as dependenciaId,
                d.dep_dependencia as dependenciaNombre,
                DATEDIFF(day, GETDATE(), am.acc_mej_fecha_fin) as diasRestantes
            FROM acciones_mejoramiento am
            LEFT JOIN dependencia d ON am.acc_mej_dependencia_responsable = d.dep_id
            WHERE am.acc_mej_fecha_cierre IS NULL
            AND am.acc_mej_fecha_fin BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE())
        `);

        console.log(`[Expiration Check] Found ${result.recordset.length} actions expiring soon.`);

        let sentCount = 0;
        for (const accion of result.recordset) {
            const emails = await getEmailsByDependencia(accion.dependenciaId);
            if (emails.length === 0) continue;

            // Determinar urgencia y color
            let urgencia = 'Baja';
            let color = '#4caf50'; // Verde (default/lejana)

            // Lógica de semáforo
            if (accion.diasRestantes <= 7) {
                urgencia = 'ALTA';
                color = '#f44336'; // Rojo
            } else if (accion.diasRestantes <= 15) {
                urgencia = 'MEDIA';
                color = '#ff9800'; // Naranja
            } else {
                urgencia = 'BAJA'; // 15-30 días
            }

            const subject = `Alerta de Vencimiento: Acción ${accion.id} vence en ${accion.diasRestantes} días`;
            const body = `
                <p>La siguiente acción de mejora está próxima a vencer.</p>
                <div class="info-box" style="border-left: 4px solid ${color}">
                    <strong>ID:</strong> ${accion.id}<br/>
                    <strong>Actividad:</strong> ${accion.actividad}<br/>
                    <strong>Dependencia:</strong> ${accion.dependenciaNombre}<br/>
                    <strong>Vence el:</strong> ${new Date(accion.fechaFin).toLocaleDateString()}<br/>
                    <strong>Días Restantes:</strong> <span style="color:${color}; font-weight:bold">${accion.diasRestantes}</span><br/>
                </div>
                <p>Prioridad: <strong>${urgencia}</strong></p>
                <p>Por favor gestione esta acción antes de la fecha límite para evitar incumplimientos.</p>
                <a href="${process.env.FRONTEND_URL}/acciones" class="btn">Gestionar Acción</a>
            `;

            const html = getEmailTemplate(`Vencimiento Próximo (${urgencia})`, body);

            for (const email of emails) {
                await sendEmail(email, subject, html);
            }
            sentCount++;
        }

        return { processed: result.recordset.length, sent: sentCount };
    } catch (error) {
        console.error('[Notification] Error checking expiration:', error);
        throw error;
    }
};
