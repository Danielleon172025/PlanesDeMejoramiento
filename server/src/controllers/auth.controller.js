import { getConnection } from '../config/db.js';
import sql from 'mssql';
import { sendServerError } from '../utils/http.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Cache simple para la configuración. Ideal para no consultar la DB en cada intento de login,
// pero esto implica que si se actualiza la DB hay que reiniciar el servidor o limpiar cache.
let ssoConfigCache = null;
let ssoConfigCacheTime = 0;

/**
 * Obtener la configuración SSO de la base de datos (con cache de 5 minutos)
 */
const getSSOConfig = async () => {
    // Retornar cache si aún es válido (5 minutos)
    if (ssoConfigCache && (Date.now() - ssoConfigCacheTime < 5 * 60 * 1000)) {
        return ssoConfigCache;
    }

    const pool = await getConnection();
    const result = await pool.request().query(`
        SELECT TOP 1 TenantId, ClientId, ClientSecret, RedirectUri 
        FROM [Identity].[SSOConfiguration] 
        WHERE IsActive = 1
    `);

    if (result.recordset.length === 0) {
        throw new Error('Configuración SSO (Microsoft) no encontrada o inactiva en la base de datos.');
    }

    ssoConfigCache = result.recordset[0];
    ssoConfigCacheTime = Date.now();

    return ssoConfigCache;
};

/**
 * Endpoint 1: Obtener la URL de Autorización (Paso 1 del flujo OAuth2)
 */
export const getMicrosoftAuthUrl = async (req, res) => {
    try {
        const config = await getSSOConfig();

        // Generar un state aleatorio para seguridad CSRF
        const state = crypto.randomBytes(16).toString('hex');

        // Scopes mínimos: openid (para JWT), profile y email.
        const scopes = 'openid profile email';

        // URL de Autorización
        // Using common tenant if 'common'/'organizations' is set, otherwise specific TenantId
        const authority = config.TenantId === 'common'
            ? 'https://login.microsoftonline.com/common'
            : `https://login.microsoftonline.com/${config.TenantId}`;

        const authUrl = `${authority}/oauth2/v2.0/authorize` +
            `?client_id=${config.ClientId}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(config.RedirectUri)}` +
            `&response_mode=query` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&state=${state}`;

        res.json({ url: authUrl, state });

    } catch (error) {
        return sendServerError(res, 'Error al generar URL de autenticación Microsoft', error);
    }
};

/**
 * Endpoint 2: Manejar el Callback (Paso 2 y 3 del flujo OAuth2)
 */
export const handleMicrosoftCallback = async (req, res) => {
    try {
        const { code } = req.body; // El código que devolvió Microsoft

        if (!code) {
            return res.status(400).json({ error: 'Falta el código de autorización.' });
        }

        const config = await getSSOConfig();

        const authority = config.TenantId === 'common'
            ? 'https://login.microsoftonline.com/common'
            : `https://login.microsoftonline.com/${config.TenantId}`;

        const tokenUrl = `${authority}/oauth2/v2.0/token`;

        // Preparar cuerpo de la petición URL-Encoded
        const bodyParams = new URLSearchParams();
        bodyParams.append('client_id', config.ClientId);
        bodyParams.append('scope', 'openid profile email');
        bodyParams.append('code', code);
        bodyParams.append('redirect_uri', config.RedirectUri);
        bodyParams.append('grant_type', 'authorization_code');
        bodyParams.append('client_secret', config.ClientSecret);

        // 1. Intercambiar código por Access Token
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: bodyParams
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Error desde Microsoft:', tokenData);
            return res.status(401).json({ error: 'Fallo al autenticar contra Microsoft Entra ID', details: tokenData.error_description });
        }

        const accessToken = tokenData.access_token;

        // 2. Extraer información del usuario (Desde Graph API o del ID Token)
        // Por confiabilidad, consultaremos Microsoft Graph usando el access token
        const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const graphData = await graphResponse.json();

        if (!graphResponse.ok) {
            return res.status(401).json({ error: 'Fallo al obtener perfil de Microsoft', details: graphData });
        }

        const userEmail = graphData.userPrincipalName || graphData.mail;

        if (!userEmail) {
            return res.status(400).json({ error: 'No se pudo obtener el correo de la cuenta Microsoft.' });
        }

        // 3. Validar contra la Base de Datos SIAPOAS
        const pool = await getConnection();
        const userResult = await pool.request()
            .input('email', sql.NVarChar(256), userEmail)
            .query(`
                SELECT TOP 1 
                    u.Id, 
                    u.FullName, 
                    u.Email, 
                    ISNULL(r.Name, 'No Role') as Role
                FROM [Identity].[Users] u
                LEFT JOIN [Identity].[UserRoles] ur ON u.Id = ur.UserId
                LEFT JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
                WHERE u.Email = @email AND u.IsActive = 1
            `);

        if (userResult.recordset.length === 0) {
            return res.status(403).json({
                error: 'Usuario no autorizado.',
                message: `El correo ${userEmail} está autenticado en Microsoft, pero no está registrado ni activo en Siapoas. Contacta a un administrador.`
            });
        }

        const user = userResult.recordset[0];

        // 4. Retornar los datos del usuario logueado
        // Aquí no estamos firmando otro JWT local (ya que el app original parece depender del ID retornado al Storage local para auth, o si usaban JWT, se debía firmar aquí)
        // Solo retornamos los datos necesarios para la app.

        res.json({
            message: 'Autenticación exitosa',
            user: {
                id: user.Id,
                nombre: user.FullName,
                email: user.Email,
                rol: user.Role
            },
            ms_token: accessToken // Opcional enviarlo al cliente
        });

    } catch (error) {
        return sendServerError(res, 'Error en el proceso de callback de Microsoft', error);
    }
};

/**
 * Endpoint 3: Autenticación Local (Correo y Contraseña)
 */
export const loginLocal = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
        }

        const pool = await getConnection();

        // 1. Buscar usuario por email
        const userResult = await pool.request()
            .input('email', sql.NVarChar(256), email)
            .query(`
                SELECT TOP 1 
                    u.Id, 
                    u.FullName, 
                    u.Email, 
                    u.PasswordHash,
                    u.IsActive,
                    ISNULL(u.MustChangePassword, 0) as MustChangePassword,
                    ISNULL(r.Name, 'No Role') as Role
                FROM [Identity].[Users] u
                LEFT JOIN [Identity].[UserRoles] ur ON u.Id = ur.UserId
                LEFT JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
                WHERE u.Email = @email AND u.IsActive = 1
            `);

        if (userResult.recordset.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo.' });
        }

        const user = userResult.recordset[0];
        const storedHash = user.PasswordHash;

        // 2. Validar contraseña con Bcrypt
        const isValid = await bcrypt.compare(password, storedHash);

        if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // 3. Verificamos si exige cambio de contraseña
        if (user.MustChangePassword) {
            return res.status(200).json({
                requirePasswordChange: true,
                email: user.Email,
                message: 'Debes cambiar tu contraseña antes de continuar.'
            });
        }

        // 4. Retornar usuario autenticado
        res.json({
            message: 'Autenticación exitosa',
            user: {
                id: user.Id,
                nombre: user.FullName,
                email: user.Email,
                rol: user.Role
            }
        });

    } catch (error) {
        return sendServerError(res, 'Error en login local', error);
    }
};

/**
 * Endpoint 4b: Recuperación de Contraseña (Olvidé mi clave)
 * Genera una contraseña temporal, la envía por correo y obliga al cambio al siguiente login.
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'El correo electrónico es requerido.' });
        }

        const pool = await getConnection();

        // 1. Verificar que el usuario exista y esté activo
        const userResult = await pool.request()
            .input('email', sql.NVarChar(256), email)
            .query(`
                SELECT TOP 1 Id, FullName, Email
                FROM [Identity].[Users]
                WHERE Email = @email AND IsActive = 1
            `);

        // Por seguridad, siempre retornamos el mismo mensaje (no revelar si el correo existe)
        if (userResult.recordset.length === 0) {
            return res.json({ message: 'Si el correo está registrado, recibirás una contraseña temporal.' });
        }

        const user = userResult.recordset[0];

        // 2. Generar contraseña temporal segura (letras + números + símbolo)
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
        let tempPassword = '';
        const bytes = crypto.randomBytes(10);
        for (const byte of bytes) {
            tempPassword += chars[byte % chars.length];
        }

        // 3. Hashear la contraseña temporal
        const salt = await bcrypt.genSalt(10);
        const tempHash = await bcrypt.hash(tempPassword, salt);

        // 4. Guardar en BD y marcar como obligatorio el cambio
        await pool.request()
            .input('id', sql.Int, user.Id)
            .input('hash', sql.NVarChar(500), tempHash)
            .query(`
                UPDATE [Identity].[Users]
                SET PasswordHash = @hash, MustChangePassword = 1
                WHERE Id = @id
            `);

        // 5. Enviar correo con la contraseña temporal
        const { sendPasswordResetEmail } = await import('../services/email.service.js');
        await sendPasswordResetEmail(user.Email, user.FullName, tempPassword);

        res.json({ message: 'Si el correo está registrado, recibirás una contraseña temporal.' });

    } catch (error) {
        return sendServerError(res, 'Error al procesar recuperación de contraseña', error);
    }
};

/**
 * Endpoint 4: Cambio de Contraseña Obligatorio
 */
export const changePassword = async (req, res) => {
    try {
        const { email, oldPassword, newPassword } = req.body;

        if (!email || !oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Faltan datos para el cambio de contraseña' });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la anterior' });
        }

        const pool = await getConnection();

        // 1. Buscar usuario y verificar datos
        const userResult = await pool.request()
            .input('email', sql.NVarChar(256), email)
            .query(`
                SELECT TOP 1 
                    u.Id, 
                    u.FullName, 
                    u.Email, 
                    u.PasswordHash,
                    ISNULL(r.Name, 'No Role') as Role
                FROM [Identity].[Users] u
                LEFT JOIN [Identity].[UserRoles] ur ON u.Id = ur.UserId
                LEFT JOIN [Identity].[Roles] r ON ur.RoleId = r.Id
                WHERE u.Email = @email AND u.IsActive = 1
            `);

        if (userResult.recordset.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
        }

        const user = userResult.recordset[0];

        // 2. Validar contraseña anterior
        const isValid = await bcrypt.compare(oldPassword, user.PasswordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        // 3. Generar nuevo hash
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        // 4. Actualizar en BD y quitar bandera de obligatoriedad
        await pool.request()
            .input('id', user.Id)
            .input('hash', newHash)
            .query(`
                UPDATE [Identity].[Users]
                SET PasswordHash = @hash, MustChangePassword = 0
                WHERE Id = @id
            `);

        // 5. Iniciar sesión automáticamente
        res.json({
            message: 'Contraseña actualizada exitosamente',
            user: {
                id: user.Id,
                nombre: user.FullName,
                email: user.Email,
                rol: user.Role
            }
        });

    } catch (error) {
        return sendServerError(res, 'Error al cambiar contraseña', error);
    }
};
