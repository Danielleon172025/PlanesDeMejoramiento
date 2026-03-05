-- ============================================================
-- SIAPOAS: Creación de Tabla de Configuración Global del Sistema
-- ============================================================

USE [siapoas]; -- Ajustar al nombre de la BD correcta
GO

-- 1. Crear Esquema [Config] si no existe
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Config')
BEGIN
    EXEC('CREATE SCHEMA [Config]');
END
GO

-- 2. Crear Tabla [Config].[SystemParameters]
IF NOT EXISTS (SELECT * FROM sys.tables WHERE schema_id = SCHEMA_ID('Config') AND name = 'SystemParameters')
BEGIN
    CREATE TABLE [Config].[SystemParameters] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Key] VARCHAR(100) NOT NULL UNIQUE,
        [Value] NVARCHAR(MAX) NULL,
        [Description] VARCHAR(255) NULL,
        [IsConfidential] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE()
    );
END
GO

-- 3. Insertar Semillas Base para el Correo (Si no existen)
IF NOT EXISTS (SELECT 1 FROM [Config].[SystemParameters] WHERE [Key] = 'SMTP_HOST')
BEGIN
    INSERT INTO [Config].[SystemParameters] ([Key], [Value], [Description], [IsConfidential]) 
    VALUES ('SMTP_HOST', 'smtp.gmail.com', 'Servidor SMTP (Ej: smtp.gmail.com o smtp.office365.com)', 0);
    
    INSERT INTO [Config].[SystemParameters] ([Key], [Value], [Description], [IsConfidential]) 
    VALUES ('SMTP_PORT', '587', 'Puerto SMTP (Ej: 587 o 465)', 0);
    
    INSERT INTO [Config].[SystemParameters] ([Key], [Value], [Description], [IsConfidential]) 
    VALUES ('SMTP_SECURE', 'false', 'Uso de conexión segura estricta (true/false). Suele ser false para 587.', 0);
    
    INSERT INTO [Config].[SystemParameters] ([Key], [Value], [Description], [IsConfidential]) 
    VALUES ('SMTP_USER', 'tucorreo@tuempresa.com', 'Correo que enviará las notificaciones', 0);
    
    INSERT INTO [Config].[SystemParameters] ([Key], [Value], [Description], [IsConfidential]) 
    VALUES ('SMTP_PASS', '', 'Contraseña de aplicación o secreta del correo asignado', 1);
END
GO

PRINT 'Tabla de parámetros creada y variables SMTP inicializadas vacías/default.';
