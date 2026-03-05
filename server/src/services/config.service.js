import { getConnection } from '../config/db.js';
import sql from 'mssql';

/**
 * Retrieves a specific system parameter from the Config.SystemParameters table.
 * @param {string} key The parameter key to search for
 * @param {string} defaultValue Optional default value if the key is not found
 * @returns {Promise<string>} The value of the configuration parameter
 */
export const getSystemConfig = async (key, defaultValue = null) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('key', sql.VarChar(100), key)
            .query('SELECT Value FROM [Config].[SystemParameters] WHERE [Key] = @key');

        if (result.recordset.length > 0) {
            return result.recordset[0].Value;
        }

        return defaultValue;
    } catch (error) {
        console.error(`Error reading config parameter [${key}]:`, error);
        return defaultValue;
    }
};

/**
 * Retrieves all SMTP-related configuration parameters.
 * @returns {Promise<Object>} An object containing the SMTP configuration
 */
export const getSmtpConfig = async () => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT [Key], [Value] 
            FROM [Config].[SystemParameters] 
            WHERE [Key] LIKE 'SMTP_%'
        `);

        const config = {};
        result.recordset.forEach(row => {
            config[row.Key] = row.Value;
        });

        // Parse boolean if applicable
        if (config.SMTP_SECURE) {
            config.SMTP_SECURE = config.SMTP_SECURE.toLowerCase() === 'true';
        }

        // Return a structured object matching what Nodemailer expects
        return {
            host: config.SMTP_HOST,
            port: Number.parseInt(config.SMTP_PORT, 10),
            secure: config.SMTP_SECURE || false,
            user: config.SMTP_USER,
            pass: config.SMTP_PASS
        };
    } catch (error) {
        console.error('Error reading SMTP parameters from DB:', error);
        return null;
    }
};
