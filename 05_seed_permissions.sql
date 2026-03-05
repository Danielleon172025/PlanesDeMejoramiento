-- ============================================================
-- SIAPOAS: Seed de Permisos y Asignación Inicial por Rol
-- Módulos: hallazgos, acciones, seguimientos, replicas,
--          novedades, usuarios, config, dashboard,
--          reportes, calendario, permisos
-- ============================================================

USE [Migration]
GO

-- --------------------------------------------------------
-- 1. LIMPIAR TABLAS
-- --------------------------------------------------------
DELETE FROM [Identity].[RolePermissions];
DELETE FROM [Identity].[Permissions];
GO

-- --------------------------------------------------------
-- 2. CATÁLOGO COMPLETO DE PERMISOS
--    Convención: {modulo}.{accion}
-- --------------------------------------------------------
INSERT INTO [Identity].[Permissions] (Name, Module, Description) VALUES

-- HALLAZGOS / Planes de Mejoramiento
('hallazgos.ver',           'hallazgos',    'Ver Planes de Mejoramiento'),
('hallazgos.crear',         'hallazgos',    'Crear Planes de Mejoramiento'),
('hallazgos.editar',        'hallazgos',    'Editar Planes de Mejoramiento'),
('hallazgos.eliminar',      'hallazgos',    'Eliminar Planes de Mejoramiento'),

-- ACCIONES / Planes de Acción
('acciones.ver',            'acciones',     'Ver Planes de Acción'),
('acciones.crear',          'acciones',     'Crear Planes de Acción'),
('acciones.editar',         'acciones',     'Editar Planes de Acción'),
('acciones.eliminar',       'acciones',     'Eliminar Planes de Acción'),

-- SEGUIMIENTOS / Avances (Líder registra, Auditor evalúa)
('seguimientos.ver',        'seguimientos', 'Ver Seguimientos y Avances'),
('seguimientos.crear',      'seguimientos', 'Registrar Avances de Seguimiento (Líder)'),
('seguimientos.editar',     'seguimientos', 'Evaluar Avances (Auditor / Control Interno)'),
('seguimientos.eliminar',   'seguimientos', 'Eliminar Seguimientos'),

-- RÉPLICAS / Intercambio Líder-Auditor sobre observaciones
('replicas.ver',            'replicas',     'Ver Réplicas'),
('replicas.crear',          'replicas',     'Dar Réplica a Observación del Auditor (Líder)'),
('replicas.editar',         'replicas',     'Observar / Dar Conformidad a Réplica del Líder (Auditor)'),

-- NOVEDADES / Solicitud y Aprobación de Cambios
('novedades.ver',           'novedades',    'Ver Novedades y Solicitudes de Cambio'),
('novedades.crear',         'novedades',    'Solicitar Novedad o Cambio (Líder)'),
('novedades.editar',        'novedades',    'Aprobar o Rechazar Novedad (Auditor / Control Interno)'),
('novedades.eliminar',      'novedades',    'Eliminar Novedad'),

-- USUARIOS / Gestión de Usuarios
('usuarios.ver',            'usuarios',     'Ver Gestión de Usuarios'),
('usuarios.crear',          'usuarios',     'Crear Usuarios'),
('usuarios.editar',         'usuarios',     'Editar Usuarios'),
('usuarios.eliminar',       'usuarios',     'Eliminar Usuarios'),

-- PERMISOS / Gestión de Roles y Permisos
('permisos.ver',            'permisos',     'Ver Roles y Permisos'),
('permisos.editar',         'permisos',     'Editar Asignación de Permisos por Rol'),

-- CONFIGURACIÓN / Paramétricas del Sistema
('config.ver',              'config',       'Ver Configuración y Paramétricas'),
('config.crear',            'config',       'Crear Parámetros'),
('config.editar',           'config',       'Editar Parámetros'),
('config.eliminar',         'config',       'Eliminar Parámetros'),

-- DASHBOARD
('dashboard.ver',           'dashboard',    'Ver Dashboard Ejecutivo'),

-- REPORTES
('reportes.ver',            'reportes',     'Ver Reportes y Exportaciones'),
('reportes.crear',          'reportes',     'Generar / Exportar Reportes'),

-- CALENDARIO
('calendario.ver',          'calendario',   'Ver Calendario de Vencimientos'),
('calendario.editar',       'calendario',   'Gestionar Eventos del Calendario');

GO

-- --------------------------------------------------------
-- 3. ASIGNACIÓN POR ROL
--    Ajusta GUIDs si los tuyos son diferentes.
-- --------------------------------------------------------
DECLARE @Admin          UNIQUEIDENTIFIER = '09D0E331-F5F9-4E5C-ADF0-2FA0E4F889AF';
DECLARE @Lider          UNIQUEIDENTIFIER = '7A11DD0D-865B-42FC-8ED5-404A38F2D17D';
DECLARE @Consulta       UNIQUEIDENTIFIER = 'B970A0CB-9504-476A-AD18-7A8643374E60';
DECLARE @ControlInterno UNIQUEIDENTIFIER = '3561C5BC-DF0B-469C-8511-E697766CA6D3';

INSERT INTO [Identity].[RolePermissions] (RoleId, PermissionId)
SELECT r.RoleId, p.Id
FROM (VALUES

    -- ===========================================================
    -- ADMINISTRADOR: acceso total a todos los módulos
    -- ===========================================================
    (@Admin, 'hallazgos.ver'),      (@Admin, 'hallazgos.crear'),    (@Admin, 'hallazgos.editar'),    (@Admin, 'hallazgos.eliminar'),
    (@Admin, 'acciones.ver'),       (@Admin, 'acciones.crear'),     (@Admin, 'acciones.editar'),     (@Admin, 'acciones.eliminar'),
    (@Admin, 'seguimientos.ver'),   (@Admin, 'seguimientos.crear'), (@Admin, 'seguimientos.editar'), (@Admin, 'seguimientos.eliminar'),
    (@Admin, 'replicas.ver'),       (@Admin, 'replicas.crear'),     (@Admin, 'replicas.editar'),
    (@Admin, 'novedades.ver'),      (@Admin, 'novedades.crear'),    (@Admin, 'novedades.editar'),    (@Admin, 'novedades.eliminar'),
    (@Admin, 'usuarios.ver'),       (@Admin, 'usuarios.crear'),     (@Admin, 'usuarios.editar'),     (@Admin, 'usuarios.eliminar'),
    (@Admin, 'permisos.ver'),       (@Admin, 'permisos.editar'),
    (@Admin, 'config.ver'),         (@Admin, 'config.crear'),       (@Admin, 'config.editar'),       (@Admin, 'config.eliminar'),
    (@Admin, 'dashboard.ver'),
    (@Admin, 'reportes.ver'),       (@Admin, 'reportes.crear'),
    (@Admin, 'calendario.ver'),     (@Admin, 'calendario.editar'),

    -- ===========================================================
    -- CONTROL INTERNO (AUDITOR)
    --   · Crea y evalúa Hallazgos
    --   · Evalúa Avances de Acciones
    --   · Observa/concluye Réplicas del Líder
    --   · Aprueba/rechaza Novedades
    --   · Ve Dashboard, Reportes y Calendario
    --   · NO gestiona usuarios ni configuración
    -- ===========================================================
    (@ControlInterno, 'hallazgos.ver'),    (@ControlInterno, 'hallazgos.crear'),  (@ControlInterno, 'hallazgos.editar'),
    (@ControlInterno, 'acciones.ver'),     (@ControlInterno, 'acciones.editar'),
    (@ControlInterno, 'seguimientos.ver'), (@ControlInterno, 'seguimientos.editar'),
    (@ControlInterno, 'replicas.ver'),     (@ControlInterno, 'replicas.editar'),
    (@ControlInterno, 'novedades.ver'),    (@ControlInterno, 'novedades.editar'),
    (@ControlInterno, 'dashboard.ver'),
    (@ControlInterno, 'reportes.ver'),     (@ControlInterno, 'reportes.crear'),
    (@ControlInterno, 'calendario.ver'),

    -- ===========================================================
    -- LÍDER (RESPONSABLE)
    --   · Solo lectura de Hallazgos
    --   · Crea y edita sus Acciones
    --   · Registra Avances (no evalúa)
    --   · Da Réplica a observaciones del Auditor
    --   · Solicita Novedades (no aprueba)
    --   · Ve Dashboard, Reportes y Calendario
    --   · NO accede a Usuarios, Configuración ni Permisos
    -- ===========================================================
    (@Lider, 'hallazgos.ver'),
    (@Lider, 'acciones.ver'),       (@Lider, 'acciones.crear'),     (@Lider, 'acciones.editar'),
    (@Lider, 'seguimientos.ver'),   (@Lider, 'seguimientos.crear'),
    (@Lider, 'replicas.ver'),       (@Lider, 'replicas.crear'),
    (@Lider, 'novedades.ver'),      (@Lider, 'novedades.crear'),
    (@Lider, 'dashboard.ver'),
    (@Lider, 'reportes.ver'),
    (@Lider, 'calendario.ver'),

    -- ===========================================================
    -- CONSULTA: solo lectura en módulos principales
    -- ===========================================================
    (@Consulta, 'hallazgos.ver'),
    (@Consulta, 'acciones.ver'),
    (@Consulta, 'seguimientos.ver'),
    (@Consulta, 'replicas.ver'),
    (@Consulta, 'novedades.ver'),
    (@Consulta, 'dashboard.ver'),
    (@Consulta, 'reportes.ver'),
    (@Consulta, 'calendario.ver')

) AS r(RoleId, PermName)
JOIN [Identity].[Permissions] p ON p.Name = r.PermName;
GO

PRINT '✅ Permisos sembrados correctamente para todos los módulos.';
