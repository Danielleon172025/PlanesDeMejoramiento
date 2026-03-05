import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

const initMailer = async () => {
    try {
        const nodemailer = await import('nodemailer');
        // Configuración del transporter real
        transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.office365.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });
        console.log('[Mailer] Nodemailer initialized successfully.');
    } catch (error) {
        console.warn('[Mailer] Nodemailer package not found or failed to load. Emails will be mocked (logged to console).');
        transporter = {
            sendMail: async (mailOptions) => {
                console.log('--- MOCK EMAIL SENT ---');
                console.log('To:', mailOptions.to);
                console.log('Subject:', mailOptions.subject);
                console.log('Body Preview:', mailOptions.html ? mailOptions.html.substring(0, 100) + '...' : 'No content');
                console.log('-----------------------');
                return { messageId: 'mock-id-' + Date.now() };
            }
        };
    }
};

// Initialize immediately
initMailer();

/**
 * Enviar correo electrónico
 * @param {string} to - Destinatario(s) (email)
 * @param {string} subject - Asunto
 * @param {string} html - Contenido HTML
 * @param {Array} attachments - Lista de adjuntos (opcional)
 */
export const sendEmail = async (to, subject, html, attachments = []) => {
    // Si no se ha inicializado (duda), reintentar o usar mock básico
    if (!transporter) {
        console.warn('[Mailer] Transporter not ready. Using fallback mock.');
        transporter = {
            sendMail: async () => ({ messageId: 'fallback-mock-' + Date.now() })
        };
    }

    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"SIA POAS Manager" <no-reply@csj.gov.co>',
            to,
            subject,
            html,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        if (info.messageId.startsWith('mock')) {
            console.log(`[Email Mocked] To: ${to}`);
        } else {
            console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);
        }
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email Error] Failed to send email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Obtener plantilla HTML base
 */
export const getEmailTemplate = (title, bodyContent) => {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #003366 0%, #004080 100%); color: white; padding: 25px; text-align: center; }
            .header h2 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 40px 30px; color: #444; }
            .content p { margin-bottom: 15px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #003366; color: white !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
            .btn:hover { background-color: #002244; }
            .info-box { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0; }
            .warning-box { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>${title}</h2>
            </div>
            <div class="content">
                ${bodyContent}
            </div>
            <div class="footer">
                <p>Este es un mensaje automático del sistema SIA POAS Manager.</p>
                <p>Consejo Seccional de la Judicatura - Nariño</p>
                <p style="margin-top: 10px; font-size: 11px;">Por favor, no responda a este correo.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};
