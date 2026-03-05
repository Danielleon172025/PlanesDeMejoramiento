-- ==============================================================================
-- SIAPOAS: Add ApprovalStatus to ActionPlans
-- Tabla: [Improvement].[ActionPlans]
-- ==============================================================================

USE [siapoas] -- Ajusta al nombre de tu base de datos
GO

IF NOT EXISTS(SELECT 1 FROM sys.columns 
          WHERE Name = N'ApprovalStatus'
          AND Object_ID = Object_ID(N'[Improvement].[ActionPlans]'))
BEGIN
    -- Añadir columna ApprovalStatus
    -- 0: Formulada (Pendiente de Aprobación)
    -- 1: Aprobada (En Ejecución)
    -- 2: Rechazada
    ALTER TABLE [Improvement].[ActionPlans] 
    ADD [ApprovalStatus] INT NOT NULL DEFAULT 0;

    PRINT 'Columna ApprovalStatus agregada a [Improvement].[ActionPlans].';
END
ELSE
BEGIN
    PRINT 'La columna ApprovalStatus ya existe en [Improvement].[ActionPlans].';
END
GO
