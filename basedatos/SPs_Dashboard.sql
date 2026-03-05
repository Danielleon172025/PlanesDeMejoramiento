USE [SIAPOAS]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Dashboard AI
-- Create date: 2026-02-13
-- Description:	Obtiene los KPIs generales para el Dashboard
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_dashboard_kpis_generales]
AS
BEGIN
	SET NOCOUNT ON;

	SELECT 
		(SELECT COUNT(*) FROM plan_mejoramiento_hallazgo) as total_hallazgos,
		(SELECT COUNT(*) FROM acciones_mejoramiento) as total_acciones,
		(SELECT COUNT(*) FROM acciones_mejoramiento WHERE acc_mej_fecha_cierre IS NOT NULL) as acciones_cerradas,
		-- Avance Global (puede refinarse con lógica de peso si existe)
		CASE 
			WHEN (SELECT COUNT(*) FROM acciones_mejoramiento) = 0 THEN 0
			ELSE CAST((SELECT COUNT(*) FROM acciones_mejoramiento WHERE acc_mej_fecha_cierre IS NOT NULL) * 100.0 / (SELECT COUNT(*) FROM acciones_mejoramiento) AS DECIMAL(5,2))
		END as avance_global
END
GO

-- =============================================
-- Description:	Obtiene el listado de hallazgos con filtros
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_dashboard_hallazgos_listado]
	@Year INT = NULL,
	@ProcesoId INT = NULL,
	@FuenteId INT = NULL
AS
BEGIN
	SET NOCOUNT ON;

	SELECT 
		h.pla_mej_hal_id as id,
		h.pla_mej_hal_numero as numero,
		h.pla_mej_hal_fecha as fecha,
		h.pla_mej_hal_hallazgo as descripcion,
		f.fue_hal_fuente as fuente_nombre,
		p.pro_proceso as proceso_nombre,
		-- Subconsultas para conteos rápidos
		(SELECT COUNT(*) FROM acciones_mejoramiento am 
			JOIN causas_antecedentes ca ON am.acc_mej_causa_antecedente = ca.cau_ant_id 
			WHERE ca.cau_ant_hallazgo = h.pla_mej_hal_id) as total_acciones,
		(SELECT COUNT(*) FROM acciones_mejoramiento am 
			JOIN causas_antecedentes ca ON am.acc_mej_causa_antecedente = ca.cau_ant_id 
			WHERE ca.cau_ant_hallazgo = h.pla_mej_hal_id AND am.acc_mej_fecha_cierre IS NOT NULL) as acciones_cerradas
	FROM plan_mejoramiento_hallazgo h
	LEFT JOIN fuente_hallazgo f ON h.pla_mej_hal_fuente = f.fue_hal_id
	LEFT JOIN proceso p ON h.pla_mej_hal_proceso = p.pro_id
	WHERE 
		(@Year IS NULL OR YEAR(h.pla_mej_hal_fecha) = @Year) AND
		(@ProcesoId IS NULL OR h.pla_mej_hal_proceso = @ProcesoId) AND
		(@FuenteId IS NULL OR h.pla_mej_hal_fuente = @FuenteId)
	ORDER BY h.pla_mej_hal_fecha DESC
END
GO

-- =============================================
-- Description:	Obtiene datos para gráfica de Hallazgos por Proceso
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_dashboard_grafica_proceso]
AS
BEGIN
	SET NOCOUNT ON;

	SELECT TOP 10
		p.pro_proceso as name,
		COUNT(h.pla_mej_hal_id) as hallazgos
	FROM plan_mejoramiento_hallazgo h
	INNER JOIN proceso p ON h.pla_mej_hal_proceso = p.pro_id
	GROUP BY p.pro_proceso
	ORDER BY hallazgos DESC
END
GO

-- =============================================
-- Description:	Obtiene datos para gráfica de Estado de Acciones
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_dashboard_grafica_estado_acciones]
AS
BEGIN
	SET NOCOUNT ON;

	SELECT 
		'Cerradas' as name, 
		COUNT(*) as value 
	FROM acciones_mejoramiento 
	WHERE acc_mej_fecha_cierre IS NOT NULL
	
	UNION ALL
	
	SELECT 
		'Pendientes' as name, 
		COUNT(*) as value 
	FROM acciones_mejoramiento 
	WHERE acc_mej_fecha_cierre IS NULL
END
GO
