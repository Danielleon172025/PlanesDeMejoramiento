import nodemailer from 'nodemailer';
import { getSmtpConfig } from './config.service.js';

/**
 * Creates and returns a Nodemailer Transporter instance based on DB configuration.
 * @returns {Promise<nodemailer.Transporter|null>} The configured transporter or null on error
 */
const getTransporter = async () => {
    try {
        const config = await getSmtpConfig();

        if (!config || !config.host || !config.user || !config.pass) {
            console.warn('Incomplete SMTP configuration found in Database. Email service is disabled.');
            return null;
        }

        return nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure, // true para 465, false para 587 (con STARTTLS)
            auth: {
                user: config.user,
                pass: config.pass
            },
            tls: {
                ciphers: 'DEFAULT', // Usar ciphers estándar de TLS en vez del antiguo SSLv3
                rejectUnauthorized: false // Ignorar fallos de certificados (muy útil si hay proxy/firewall de por medio)
            },
            requireTLS: true, // Obligar al servidor a usar conexión cifrada TLS (STARTTLS en puertos como 587)
            family: 4 // Forzar TCP sobre IPv4
        });
    } catch (error) {
        console.error('Failed to create Nodemailer transporter:', error);
        return null;
    }
};

/**
 * Generic function to send an HTML email.
 * @param {string} to Recipient email address
 * @param {string} subject Email subject
 * @param {string} htmlContent HTML content of the email
 * @returns {Promise<boolean>} True if sent successfully, False otherwise
 */
export const sendEmail = async (to, subject, htmlContent) => {
    try {
        const transporter = await getTransporter();

        if (!transporter) {
            console.warn('Email transmission skipped due to missing SMTP configuration.');
            return false;
        }

        const config = await getSmtpConfig();

        const info = await transporter.sendMail({
            from: `"SIAPOAS Notificaciones" <${config.user}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });

        console.log(`Email sent successfully: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
};

/**
 * Pre-configured template for Action Assignment notifications.
 * @param {string} to Recipient email
 * @param {string} liderName Full name of the Líder
 * @param {Object} actionData Data object containing action details
 */
export const sendActionAssignedEmail = async (to, liderName, actionData) => {
    const { numeroHallazgo, actividad, fechaFin } = actionData;

    const subject = `SIAPOAS: Nueva Acción de Mejora Asignada (Ref: ${numeroHallazgo || 'N/A'})`;

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- Header CSJ -->
            <div style="background-color: #ffffff; padding: 25px 30px; border-bottom: 4px solid #359946; display: flex; align-items: center;">
                <h2 style="margin: 0; color: #1E3A6B; font-weight: 900; font-size: 24px;">Asignación de Acción de Mejora</h2>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px; color: #444; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">Hola <strong style="color: #1E3A6B;">${liderName || 'Líder de Dependencia'}</strong>,</p>
                <p style="font-size: 15px;">Se te ha asignado como responsable para la ejecución de una nueva Acción de Mejora dentro de tu departamento.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; width: 35%; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Hallazgo Ref.</th>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background-color: white; font-weight: bold; color: #359946;">${numeroHallazgo || 'No Especificado'}</td>
                        </tr>
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-transform: uppercase;">Actividad</th>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background-color: white;">${actividad}</td>
                        </tr>
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; font-size: 14px; text-transform: uppercase;">Fecha Límite</th>
                            <td style="padding: 15px 20px; background-color: white; color: #d9534f; font-weight: bold; display: flex; align-items: center;">
                                📅 ${fechaFin}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 35px;">
                    <a href="http://localhost:5173" style="background-color: #359946; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(53, 153, 70, 0.2);">Ir al Dashboard SIAPOAS</a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 40px 0 20px;">
                
                <div style="text-align: center;">
                    <p style="font-size: 12px; color: #888; margin: 0;">Consejo Superior de la Judicatura</p>
                    <p style="font-size: 11px; color: #aaa; margin: 5px 0 0;">Este es un mensaje generado automáticamente. Por favor no responda a este correo.</p>
                </div>
            </div>
        </div>
    `;

    return sendEmail(to, subject, htmlContent);
};

/**
 * Pre-configured template for Finding Assignment (Auditor) notifications.
 * @param {string} to Recipient email (Auditor)
 * @param {string} auditorName Full name of the Auditor
 * @param {Object} findingData Data object containing finding details
 */
export const sendFindingAssignedEmail = async (to, auditorName, findingData) => {
    const { numeroHallazgo, proceso, fecha } = findingData;

    const subject = `SIAPOAS: Nuevo Hallazgo Asignado para Auditoría (Ref: ${numeroHallazgo || 'N/A'})`;

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- Header CSJ -->
            <div style="background-color: #ffffff; padding: 25px 30px; border-bottom: 4px solid #359946; display: flex; align-items: center;">
                <h2 style="margin: 0; color: #1E3A6B; font-weight: 900; font-size: 24px;">Asignación de Auditoría de Hallazgo</h2>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px; color: #444; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">Hola <strong style="color: #1E3A6B;">${auditorName || 'Auditor'}</strong>,</p>
                <p style="font-size: 15px;">Se te ha asignado como <strong style="color: #1E3A6B;">Auditor Responsable</strong> para dar seguimiento y evaluar las acciones de un nuevo Hallazgo.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; width: 35%; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Ref. Hallazgo</th>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background-color: white; font-weight: bold; color: #359946;">${numeroHallazgo || 'No Especificado'}</td>
                        </tr>
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-transform: uppercase;">Dependencia</th>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background-color: white;">${proceso || 'No Especificada'}</td>
                        </tr>
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; font-size: 14px; text-transform: uppercase;">Fecha Emisión</th>
                            <td style="padding: 15px 20px; background-color: white; color: #444; display: flex; align-items: center;">
                                📅 ${fecha}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 35px;">
                    <a href="http://localhost:5173/hallazgos" style="background-color: #1E3A6B; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(30, 58, 107, 0.2);">Revisar Hallazgo en SIAPOAS</a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 40px 0 20px;">
                
                <div style="text-align: center;">
                    <p style="font-size: 12px; color: #888; margin: 0;">Consejo Superior de la Judicatura</p>
                    <p style="font-size: 11px; color: #aaa; margin: 5px 0 0;">Este es un mensaje generado automáticamente. Por favor no responda a este correo.</p>
                </div>
            </div>
        </div>
    `;

    return sendEmail(to, subject, htmlContent);
};

/**
 * Pre-configured template for Auditor observation on a progress log.
 * @param {string} to Recipient email (Lider)
 * @param {string} liderName Full name of the Lider
 * @param {Object} observationData Data object containing observation details
 */
export const sendObservationEmail = async (to, liderName, observationData) => {
    const { numeroHallazgo, actividad, observacion, auditorName } = observationData;

    const subject = `SIAPOAS: Nueva Observación de Auditoría (Ref: ${numeroHallazgo || 'N/A'})`;

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- Header CSJ (Warning Color) -->
            <div style="background-color: #ffffff; padding: 25px 30px; border-bottom: 4px solid #F59E0B; display: flex; align-items: center;">
                <h2 style="margin: 0; color: #1E3A6B; font-weight: 900; font-size: 24px;">Observación en Plan de Acción</h2>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px; color: #444; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">Hola <strong style="color: #1E3A6B;">${liderName || 'Líder de Dependencia'}</strong>,</p>
                <p style="font-size: 15px;">El auditor <strong style="color: #1E3A6B;">${auditorName || 'Asignado'}</strong> ha realizado una nueva observación sobre uno de tus avances reportados.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; width: 35%; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Hallazgo Ref.</th>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background-color: white; font-weight: bold; color: #359946;">${numeroHallazgo || 'No Especificado'}</td>
                        </tr>
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; font-size: 14px; text-transform: uppercase;">Acción</th>
                            <td style="padding: 15px 20px; background-color: white;">${actividad}</td>
                        </tr>
                    </table>
                </div>

                <!-- Observación Box -->
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #b45309; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Mensaje del Auditor:</h4>
                    <p style="margin: 0; font-style: italic; color: #92400e; font-size: 15px;">"${observacion}"</p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <a href="http://localhost:5173/acciones" style="background-color: #F59E0B; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2);">Ver Módulo de Acciones</a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 40px 0 20px;">
                
                <div style="text-align: center;">
                    <p style="font-size: 12px; color: #888; margin: 0;">Consejo Superior de la Judicatura</p>
                    <p style="font-size: 11px; color: #aaa; margin: 5px 0 0;">Este es un mensaje generado automáticamente. Por favor no responda a este correo.</p>
                </div>
            </div>
        </div>
    `;

    return sendEmail(to, subject, htmlContent);
};

/**
 * Notificación al Auditor de que el Líder ha formulado un Plan de Acción (Acción de Mejora)
 * @param {string} to Recipient email (Auditor)
 * @param {string} auditorName Full name of the Auditor
 * @param {Object} actionData Data object containing action details
 */
export const sendActionCreatedEmail = async (to, auditorName, actionData) => {
    const { numeroHallazgo, actividad, fechaFin } = actionData;

    const subject = `SIAPOAS: Nueva Acción de Mejora Formulada (Ref: ${numeroHallazgo || 'N/A'})`;

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- Header CSJ -->
            <div style="background-color: #ffffff; padding: 25px 30px; border-bottom: 4px solid #359946; display: flex; align-items: center;">
                <h2 style="margin: 0; color: #1E3A6B; font-weight: 900; font-size: 24px;">Nueva Acción Formulada</h2>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px; color: #444; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">Hola <strong style="color: #1E3A6B;">${auditorName || 'Auditor'}</strong>,</p>
                <p style="font-size: 15px;">El líder responsable ha formulado una nueva Acción de Mejora para un hallazgo que tienes asignado. Esta acción está lista para tu validación y seguimiento.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; width: 35%; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Hallazgo Ref.</th>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background-color: white; font-weight: bold; color: #359946;">${numeroHallazgo || 'No Especificado'}</td>
                        </tr>
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-transform: uppercase;">Actividad</th>
                            <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background-color: white;">${actividad}</td>
                        </tr>
                        <tr>
                            <th style="padding: 15px 20px; background-color: #1E3A6B; color: white; font-size: 14px; text-transform: uppercase;">Fecha Límite</th>
                            <td style="padding: 15px 20px; background-color: white; color: #d9534f; font-weight: bold;">
                                📅 ${fechaFin}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 35px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/acciones" style="background-color: #359946; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(53, 153, 70, 0.2);">Ir al Módulo de Acciones</a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 40px 0 20px;">
                
                <div style="text-align: center;">
                    <p style="font-size: 12px; color: #888; margin: 0;">Consejo Superior de la Judicatura</p>
                    <p style="font-size: 11px; color: #aaa; margin: 5px 0 0;">Este es un mensaje generado automáticamente. Por favor no responda a este correo.</p>
                </div>
            </div>
        </div>
    `;

    return sendEmail(to, subject, htmlContent);
};
/**
 * Plantilla de recuperación de contraseña.
 * @param {string} to Correo del usuario
 * @param {string} userName Nombre completo del usuario
 * @param {string} tempPassword Contraseña temporal generada
 */
export const sendPasswordResetEmail = async (to, userName, tempPassword) => {
    const subject = `SIAPOAS: Recuperación de Contraseña`;

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- Header -->
            <div style="background-color: #ffffff; padding: 25px 30px; border-bottom: 4px solid #1E3A6B; display: flex; align-items: center;">
                <h2 style="margin: 0; color: #1E3A6B; font-weight: 900; font-size: 24px;">🔐 Recuperación de Contraseña</h2>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px; color: #444; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">Hola <strong style="color: #1E3A6B;">${userName || 'Usuario'}</strong>,</p>
                <p style="font-size: 15px;">Recibimos una solicitud de recuperación de contraseña para tu cuenta en el sistema SIAPOAS. A continuación encontrarás tu <strong>contraseña temporal</strong>:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <div style="display: inline-block; background-color: #f0f4f8; border: 2px dashed #1E3A6B; border-radius: 8px; padding: 18px 40px;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Tu contraseña temporal</p>
                        <p style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 4px; color: #1E3A6B; font-family: 'Courier New', monospace;">${tempPassword}</p>
                    </div>
                </div>

                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>⚠️ Importante:</strong> Al iniciar sesión con esta contraseña, el sistema te solicitará de inmediato que la cambies por una contraseña personal y segura. Esta contraseña temporal no te permitirá acceder al sistema hasta que realices el cambio.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #1E3A6B; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(30, 58, 107, 0.2);">Ir al Login SIAPOAS</a>
                </div>

                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 40px 0 20px;">
                
                <p style="font-size: 13px; color: #888; text-align: center; margin: 0;">Si no solicitaste este cambio, contacta al administrador del sistema de inmediato.</p>

                <div style="text-align: center; margin-top: 15px;">
                    <p style="font-size: 12px; color: #888; margin: 0;">Consejo Superior de la Judicatura</p>
                    <p style="font-size: 11px; color: #aaa; margin: 5px 0 0;">Este es un mensaje generado automáticamente. Por favor no responda a este correo.</p>
                </div>
            </div>
        </div>
    `;

    return sendEmail(to, subject, htmlContent);
};
