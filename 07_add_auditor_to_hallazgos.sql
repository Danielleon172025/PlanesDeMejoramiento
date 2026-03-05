-- Migration Script: Add AuditorId to ActionPlans
-- Description: Assign an auditor to a finding to restrict approval/evaluation permissions.

USE [Dashboard];
GO

-- 1. Add AuditorId column to [Improvement].[Findings]
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[Improvement].[Findings]') 
    AND name = 'AuditorId'
)
BEGIN
    ALTER TABLE [Improvement].[Findings]
    ADD [AuditorId] UNIQUEIDENTIFIER NULL;

    -- Add the foreign key constraint
    ALTER TABLE [Improvement].[Findings]
    ADD CONSTRAINT FK_Findings_AuditorId FOREIGN KEY ([AuditorId])
    REFERENCES [Identity].[Users] ([Id]);

    PRINT 'Columna AuditorId agregada a [Improvement].[Findings] exitosamente con su restriccion de llave foranea.';
END
ELSE
BEGIN
    PRINT 'La columna AuditorId ya existe en la tabla [Improvement].[Findings].';
END
GO
