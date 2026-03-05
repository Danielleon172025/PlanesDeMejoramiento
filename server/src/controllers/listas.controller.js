// server/src/controllers/listas.controller.js
import { getConnection } from '../config/db.js';
import { sendServerError } from '../utils/http.js';

/**
 * Obtener listas paramétricas (catálogos)
 */
export const getListas = async (req, res) => {
    try {
        const pool = await getConnection();
        const { tipo } = req.params;

        let query = '';

        switch (tipo) {
            case 'procesos':
                query = `
                    SELECT 
                        Id as id, 
                        Name as nombre,
                        Code as abreviatura
                    FROM [Organization].[Departments] 
                    ORDER BY Name
                `;
                break;

            case 'fuentes':
                query = `
                    SELECT 
                        Id as id, 
                        Name as nombre
                    FROM [Improvement].[FindingSources] 
                    WHERE IsActive = 1
                    ORDER BY Name
                `;
                break;

            case 'dependencias':
                // In new schema, 'proceso' and 'dependencia' are both [Organization].[Departments]
                query = `
                    SELECT 
                        Id as id, 
                        Name as nombre
                    FROM [Organization].[Departments] 
                    ORDER BY Name
                `;
                break;

            case 'tipos-hallazgo':
                query = `
                    SELECT 
                        Id as id, 
                        Name as nombre
                    FROM [Improvement].[FindingCategories] 
                    ORDER BY Name
                `;
                break;

            default:
                return res.status(400).json({
                    error: 'Tipo de lista no válido',
                    tiposDisponibles: ['procesos', 'fuentes', 'dependencias', 'tipos-hallazgo']
                });
        }

        const result = await pool.query(query);
        res.json(result.recordset);

    } catch (error) {
        return sendServerError(res, 'Error al obtener lista', error);
    }
};
