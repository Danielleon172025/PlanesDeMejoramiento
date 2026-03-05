-- ==============================================================================
-- SCRIPT DE CREACIÓN DE TABLA PARA CONFIGURACIÓN DE SSO (MICROSOFT)
-- Base de datos: [Migration]
-- Este script crea la tabla que almacenará dinámicamente las credenciales 
-- y parámetros (Tenant, Client ID, Secret, Redirect) para OAuth 2.0.
-- ==============================================================================

USE [Migration];
GO

BEGIN TRANSACTION;

-- 1. Crear tabla de configuración SSO
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SSOConfiguration' AND schema_id = SCHEMA_ID('Identity'))
BEGIN
    CREATE TABLE [Identity].[SSOConfiguration] (
        Id INT PRIMARY KEY IDENTITY(1,1),
        ProviderName VARCHAR(50) NOT NULL DEFAULT 'Microsoft',
        TenantId VARCHAR(100) NOT NULL,
        ClientId VARCHAR(100) NOT NULL,
        ClientSecret VARCHAR(255) NOT NULL,
        RedirectUri VARCHAR(255) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        UpdatedAt DATETIME
    );
END

-- 2. Insertar un registro inicial (vacío/demo) para que la vista de Configuración pueda cargarlo y editarlo.
-- EL USUARIO/ADMIN DEBE LLENAR ESTOS DATOS REALES EN LA APLICACIÓN O BASE DE DATOS LUEGO.
IF NOT EXISTS (SELECT 1 FROM [Identity].[SSOConfiguration])
BEGIN
    INSERT INTO [Identity].[SSOConfiguration] (ProviderName, TenantId, ClientId, ClientSecret, RedirectUri, IsActive, UpdatedAt)
    VALUES (
        'Microsoft',
        'TU_TENANT_ID_AQUI',
        'TU_CLIENT_ID_AQUI',
        'TU_CLIENT_SECRET_AQUI',
        'http://localhost:5173/auth/callback', -- URL de callback del frontend (por defecto localhost)
        1,
        GETDATE()
    );
END

COMMIT TRANSACTION;
PRINT 'Tabla de Configuracion SSO creada / inicializada exitosamente.';
GO
