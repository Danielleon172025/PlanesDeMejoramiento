-- ==============================================================================
-- SCRIPT DE CREACIÓN DE ÍNDICES PARA OPTIMIZACIÓN DE RENDIMIENTO
-- Base de datos: [Migration]
-- Este script crea índices no agrupados basados en los filtros y JOINs 
-- utilizados frecuentemente por los controladores del backend (Node.js).
-- ==============================================================================

USE [Migration];
GO

BEGIN TRANSACTION;

-- ==============================================================================
-- 1. ESQUEMA: Identity
-- ==============================================================================

-- Mejora las consultas que filtran usuarios por su dependencia
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_DepartmentId' AND object_id = OBJECT_ID('[Identity].[Users]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_DepartmentId 
    ON [Identity].[Users] (DepartmentId);
END

-- ==============================================================================
-- 2. ESQUEMA: Improvement (Hallazgos y Causas)
-- ==============================================================================

-- Acelera los filtros por proceso (dependencia) y fuente
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Findings_DepartmentId' AND object_id = OBJECT_ID('[Improvement].[Findings]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Findings_DepartmentId 
    ON [Improvement].[Findings] (DepartmentId);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Findings_SourceId' AND object_id = OBJECT_ID('[Improvement].[Findings]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Findings_SourceId 
    ON [Improvement].[Findings] (SourceId);
END

-- Acelera la ordenación y filtros por fecha de descubrimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Findings_DiscoveryDate' AND object_id = OBJECT_ID('[Improvement].[Findings]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Findings_DiscoveryDate 
    ON [Improvement].[Findings] (DiscoveryDate DESC);
END

-- Acelera significativamente la obtención de causas por hallazgo (Foreign Key)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RootCauses_FindingId' AND object_id = OBJECT_ID('[Improvement].[RootCauses]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_RootCauses_FindingId 
    ON [Improvement].[RootCauses] (FindingId);
END

-- ==============================================================================
-- 3. ESQUEMA: Improvement (Acciones de Mejora)
-- ==============================================================================

-- Acelera la búsqueda de acciones asociadas a una causa raíz (Foreign Key)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ActionPlans_RootCauseId' AND object_id = OBJECT_ID('[Improvement].[ActionPlans]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ActionPlans_RootCauseId 
    ON [Improvement].[ActionPlans] (RootCauseId);
END

-- Mejora las vistas y consultas agrupadas por creador/responsable
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ActionPlans_ResponsibleUserId' AND object_id = OBJECT_ID('[Improvement].[ActionPlans]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ActionPlans_ResponsibleUserId 
    ON [Improvement].[ActionPlans] (ResponsibleUserId);
END

-- Índice compuesto para fechas (crucial para el Dashboard y filtrados de expiración/vencimiento)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ActionPlans_Dates' AND object_id = OBJECT_ID('[Improvement].[ActionPlans]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ActionPlans_Dates 
    ON [Improvement].[ActionPlans] (StartDate, TargetCompletionDate, ClosedDate)
    INCLUDE (ApprovalStatus); -- Incluido para evitar lookups en vistas de aprobaciones
END

-- Acelera consultas de notificaciones pendientes de aprobación
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ActionPlans_ApprovalStatus' AND object_id = OBJECT_ID('[Improvement].[ActionPlans]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ActionPlans_ApprovalStatus 
    ON [Improvement].[ActionPlans] (ApprovalStatus)
    WHERE ApprovalStatus = 0 OR ApprovalStatus IS NULL; -- Índice filtrado para mayor eficiencia (solo pendientes)
END

-- ==============================================================================
-- 4. ESQUEMA: Improvement (Seguimientos / Logs y Novedades)
-- ==============================================================================

-- Acelera la carga del Timeline y Evaluaciones de las Acción de Mejora (Foreign Key)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProgressLogs_ActionPlanId' AND object_id = OBJECT_ID('[Improvement].[ProgressLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ProgressLogs_ActionPlanId 
    ON [Improvement].[ProgressLogs] (ActionPlanId, LogDate DESC);
END

-- Acelera los reportes de métricas (Control Interno vs Creador)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProgressLogs_CreatedById' AND object_id = OBJECT_ID('[Improvement].[ProgressLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ProgressLogs_CreatedById 
    ON [Improvement].[ProgressLogs] (CreatedById);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProgressLogs_ObservationById' AND object_id = OBJECT_ID('[Improvement].[ProgressLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ProgressLogs_ObservationById 
    ON [Improvement].[ProgressLogs] (ObservationById)
    WHERE ObservationById IS NOT NULL; -- Promueve index scan eficiente solo en los observados
END

-- Acelera las consultas de novedades y aprobaciones pendientes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ModificationRequests_ActionPlanId' AND object_id = OBJECT_ID('[Improvement].[ModificationRequests]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ModificationRequests_ActionPlanId 
    ON [Improvement].[ModificationRequests] (ActionPlanId);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ModificationRequests_ApprovalStatus' AND object_id = OBJECT_ID('[Improvement].[ModificationRequests]'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ModificationRequests_ApprovalStatus 
    ON [Improvement].[ModificationRequests] (ApprovalStatus)
    WHERE ApprovalStatus IS NULL; -- Filtrado para aprobaciones pendientes
END

COMMIT TRANSACTION;
PRINT 'Indices creados exitosamente.';
GO
