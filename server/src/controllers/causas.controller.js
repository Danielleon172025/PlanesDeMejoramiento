import sql from 'mssql';
import { getConnection } from '../config/db.js';
import { insertHistorico, HISTORICO_TIPO } from '../utils/audit.js';
import { getActorUserId } from '../utils/auth.js';
import { sendServerError } from '../utils/http.js';

export const getCausas = async (req, res) => {
    try {
        const { hallazgoId } = req.query;
        const pool = await getConnection();
        let query = `
            SELECT
                ca.Id as id,
                ca.Description as descripcion,
                ca.FindingId as hallazgo_id,
                ca.AttachmentUrl as archivo,
                ca.CreatedAt as fecha_creacion,
                u.FullName as usuario,
                ISNULL((
                    SELECT COUNT(*)
                    FROM [Improvement].[ActionPlans] am
                    WHERE am.RootCauseId = ca.Id
                ), 0) as total_acciones
            FROM [Improvement].[RootCauses] ca
            LEFT JOIN [Identity].[Users] u ON ca.CreatedById = u.Id
            WHERE 1=1
        `;
        const request = pool.request();
        if (hallazgoId) {
            query += ' AND ca.FindingId = @hallazgoId';
            request.input('hallazgoId', sql.Int, Number.parseInt(hallazgoId, 10));
        }
        query += ' ORDER BY ca.Id DESC';
        const result = await request.query(query);
        return res.json(result.recordset);
    } catch (error) {
        return sendServerError(res, 'Error al obtener causas', error);
    }
};

export const createCausa = async (req, res) => {
    try {
        const { hallazgo_id, descripcion, archivo } = req.body;
        if (!hallazgo_id || !descripcion) {
            return res.status(400).json({ error: 'hallazgo_id y descripcion son obligatorios' });
        }

        const actor = getActorUserId(req);
        const pool = await getConnection();
        const request = pool.request()
            .input('hallazgoId', sql.Int, Number.parseInt(hallazgo_id, 10))
            .input('descripcion', sql.VarChar(1000), descripcion)
            .input('archivo', sql.VarChar(1000), archivo || null)
            .input('usuario', sql.UniqueIdentifier, actor);

        const inserted = await request.query(`
            INSERT INTO [Improvement].[RootCauses] (
                Description,
                FindingId,
                AttachmentUrl,
                CreatedById,
                CreatedAt,
                AnalysisMethod
            )
            OUTPUT INSERTED.Id as id
            VALUES (
                @descripcion,
                @hallazgoId,
                @archivo,
                @usuario,
                GETDATE(),
                'N/A' -- Default AnalysisMethod unless provided
            )
        `);

        // Removed insertHistorico since the legacy table was not migrated

        return res.status(201).json({
            id: inserted.recordset[0].id,
            message: 'Causa creada correctamente',
        });
    } catch (error) {
        return sendServerError(res, 'Error al crear causa', error);
    }
};

export const updateCausa = async (req, res) => {
    try {
        const causaId = Number.parseInt(req.params.id, 10);
        const { descripcion, archivo } = req.body;
        const actor = getActorUserId(req);
        const pool = await getConnection();

        const current = await pool.request()
            .input('id', sql.Int, causaId)
            .query(`
                SELECT Id, FindingId, Description, AttachmentUrl, CreatedAt, CreatedById
                FROM [Improvement].[RootCauses]
                WHERE Id = @id
            `);
        if (current.recordset.length === 0) {
            return res.status(404).json({ error: 'Causa no encontrada' });
        }
        const row = current.recordset[0];
        const nextDescripcion = descripcion ?? row.Description;
        const nextArchivo = archivo ?? row.AttachmentUrl;

        await pool.request()
            .input('id', sql.Int, causaId)
            .input('descripcion', sql.VarChar(1000), nextDescripcion)
            .input('archivo', sql.VarChar(1000), nextArchivo)
            .query(`
                UPDATE [Improvement].[RootCauses]
                SET
                    Description = @descripcion,
                    AttachmentUrl = @archivo
                WHERE Id = @id
            `);

        // Removed insertHistorico since legacy table was not migrated

        return res.json({ message: 'Causa actualizada correctamente' });
    } catch (error) {
        return sendServerError(res, 'Error al actualizar causa', error);
    }
};

export const deleteCausa = async (req, res) => {
    try {
        const causaId = Number.parseInt(req.params.id, 10);
        const actor = getActorUserId(req);
        const pool = await getConnection();

        const current = await pool.request()
            .input('id', sql.Int, causaId)
            .query(`
                SELECT Id, FindingId, Description, AttachmentUrl, CreatedAt, CreatedById
                FROM [Improvement].[RootCauses]
                WHERE Id = @id
            `);
        if (current.recordset.length === 0) {
            return res.status(404).json({ error: 'Causa no encontrada' });
        }
        const row = current.recordset[0];

        const acciones = await pool.request()
            .input('id', sql.Int, causaId)
            .query('SELECT COUNT(*) as total FROM [Improvement].[ActionPlans] WHERE RootCauseId = @id');
        if (acciones.recordset[0].total > 0) {
            return res.status(409).json({
                error: 'No se puede eliminar la causa porque tiene acciones asociadas',
            });
        }

        await pool.request()
            .input('id', sql.Int, causaId)
            .query('DELETE FROM [Improvement].[RootCauses] WHERE Id = @id');

        // Removed insertHistorico since legacy table was not migrated

        return res.json({ message: 'Causa eliminada correctamente' });
    } catch (error) {
        return sendServerError(res, 'Error al eliminar causa', error);
    }
};
