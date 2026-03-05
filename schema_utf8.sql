USE [SIAPOAS]
GO
/****** Object:  Table [dbo].[aspnet_PersonalizationAllUsers]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_PersonalizationAllUsers](
	[PathId] [uniqueidentifier] NOT NULL,
	[PageSettings] [image] NOT NULL,
	[LastUpdatedDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[PathId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_aspnet_WebPartState_Shared]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_WebPartState_Shared]
  AS SELECT [dbo].[aspnet_PersonalizationAllUsers].[PathId], [DataSize]=DATALENGTH([dbo].[aspnet_PersonalizationAllUsers].[PageSettings]), [dbo].[aspnet_PersonalizationAllUsers].[LastUpdatedDate]
  FROM [dbo].[aspnet_PersonalizationAllUsers]
  
GO
/****** Object:  Table [dbo].[aspnet_PersonalizationPerUser]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_PersonalizationPerUser](
	[Id] [uniqueidentifier] NOT NULL,
	[PathId] [uniqueidentifier] NULL,
	[UserId] [uniqueidentifier] NULL,
	[PageSettings] [image] NOT NULL,
	[LastUpdatedDate] [datetime] NOT NULL,
PRIMARY KEY NONCLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_aspnet_WebPartState_User]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_WebPartState_User]
  AS SELECT [dbo].[aspnet_PersonalizationPerUser].[PathId], [dbo].[aspnet_PersonalizationPerUser].[UserId], [DataSize]=DATALENGTH([dbo].[aspnet_PersonalizationPerUser].[PageSettings]), [dbo].[aspnet_PersonalizationPerUser].[LastUpdatedDate]
  FROM [dbo].[aspnet_PersonalizationPerUser]
  
GO
/****** Object:  Table [dbo].[causas_antecedentes]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[causas_antecedentes](
	[cau_ant_id] [int] IDENTITY(1,1) NOT NULL,
	[cau_ant_descripcion] [varchar](1000) NULL,
	[cau_ant_hallazgo] [int] NULL,
	[cau_ant_archivo] [varchar](1000) NULL,
	[cau_ant_fecha_creacion] [datetime] NULL,
	[cau_ant_usuario] [uniqueidentifier] NULL,
 CONSTRAINT [PK_causas_antecedentes] PRIMARY KEY CLUSTERED 
(
	[cau_ant_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[plan_mejoramiento_hallazgo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[plan_mejoramiento_hallazgo](
	[pla_mej_hal_id] [int] IDENTITY(1,1) NOT NULL,
	[pla_mej_hal_numero] [varchar](13) NULL,
	[pla_mej_hal_fecha] [date] NULL,
	[pla_mej_hal_hallazgo] [varchar](1000) NULL,
	[pla_mej_hal_fuente] [int] NULL,
	[pla_mej_hal_tipo_hallazgo] [int] NULL,
	[pla_mej_hal_efecto] [varchar](1000) NULL,
	[pla_mej_hal_proceso] [int] NULL,
	[pla_mej_hal_fila] [varchar](10) NULL,
 CONSTRAINT [PK_plan_mejoramiento_hallazgo] PRIMARY KEY CLUSTERED 
(
	[pla_mej_hal_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[acciones_mejoramiento]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[acciones_mejoramiento](
	[acc_mej_id] [int] IDENTITY(1,1) NOT NULL,
	[acc_mej_actividad] [varchar](1000) NULL,
	[acc_mej_causa_antecedente] [int] NULL,
	[acc_mej_descripcion_meta] [varchar](1000) NULL,
	[acc_mej_denominacion_unidad] [varchar](1000) NULL,
	[acc_mej_unidad] [decimal](11, 2) NULL,
	[acc_mej_fecha_inicio] [date] NULL,
	[acc_mej_fecha_fin] [date] NULL,
	[acc_mej_dependencia_responsable] [int] NULL,
	[acc_mej_fecha_cierre] [date] NULL,
	[acc_mej_impacto] [varchar](1000) NULL,
	[acc_mej_aprobada] [smallint] NULL,
	[acc_mej_fecha_aprobada] [date] NULL,
	[acc_mej_observaciones_aprobada] [varchar](1000) NULL,
	[acc_mej_usuario_aprobada] [uniqueidentifier] NULL,
 CONSTRAINT [PK_acciones_mejoramiento] PRIMARY KEY CLUSTERED 
(
	[acc_mej_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_plan_mejoramiento_acciones]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[vw_plan_mejoramiento_acciones]
AS
SELECT pla_mej_hal_id
,pla_mej_hal_numero
,pla_mej_hal_hallazgo
,pla_mej_hal_fecha
,pla_mej_hal_proceso
,pla_mej_hal_efecto
,pla_mej_hal_fila
,pla_mej_hal_fuente
,pla_mej_hal_tipo_hallazgo
,(SELECT COUNT(acc_mej_id) FROM acciones_mejoramiento 
LEFT JOIN causas_antecedentes ON cau_ant_id=acc_mej_causa_antecedente
WHERE cau_ant_hallazgo=pla_mej_hal_id
) as cantidad_acciones
,(SELECT COUNT(acc_mej_id) FROM acciones_mejoramiento 
LEFT JOIN causas_antecedentes ON cau_ant_id=acc_mej_causa_antecedente
WHERE cau_ant_hallazgo=pla_mej_hal_id AND acc_mej_fecha_cierre IS NOT NULL
) as cantidad_acciones_cerradas
FROM plan_mejoramiento_hallazgo 
GO
/****** Object:  Table [dbo].[aspnet_Users]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_Users](
	[ApplicationId] [uniqueidentifier] NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[UserName] [nvarchar](256) NOT NULL,
	[LoweredUserName] [nvarchar](256) NOT NULL,
	[MobileAlias] [nvarchar](16) NULL,
	[IsAnonymous] [bit] NOT NULL,
	[LastActivityDate] [datetime] NOT NULL,
PRIMARY KEY NONCLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[perfil_usuario]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[perfil_usuario](
	[per_usu_nombre] [varchar](100) NOT NULL,
	[per_usu_dependencia] [int] NULL,
	[per_usu_usuario] [uniqueidentifier] NOT NULL,
	[per_usu_entidad] [uniqueidentifier] NULL,
	[per_usu_telefono] [bigint] NULL,
	[per_usu_extension] [int] NULL,
	[per_usu_cierre_acciones] [bit] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[aspnet_Membership]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_Membership](
	[ApplicationId] [uniqueidentifier] NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[Password] [nvarchar](128) NOT NULL,
	[PasswordFormat] [int] NOT NULL,
	[PasswordSalt] [nvarchar](128) NOT NULL,
	[MobilePIN] [nvarchar](16) NULL,
	[Email] [nvarchar](256) NULL,
	[LoweredEmail] [nvarchar](256) NULL,
	[PasswordQuestion] [nvarchar](256) NULL,
	[PasswordAnswer] [nvarchar](128) NULL,
	[IsApproved] [bit] NOT NULL,
	[IsLockedOut] [bit] NOT NULL,
	[CreateDate] [datetime] NOT NULL,
	[LastLoginDate] [datetime] NOT NULL,
	[LastPasswordChangedDate] [datetime] NOT NULL,
	[LastLockoutDate] [datetime] NOT NULL,
	[FailedPasswordAttemptCount] [int] NOT NULL,
	[FailedPasswordAttemptWindowStart] [datetime] NOT NULL,
	[FailedPasswordAnswerAttemptCount] [int] NOT NULL,
	[FailedPasswordAnswerAttemptWindowStart] [datetime] NOT NULL,
	[Comment] [ntext] NULL,
PRIMARY KEY NONCLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[aspnet_Roles]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_Roles](
	[ApplicationId] [uniqueidentifier] NOT NULL,
	[RoleId] [uniqueidentifier] NOT NULL,
	[RoleName] [nvarchar](256) NOT NULL,
	[LoweredRoleName] [nvarchar](256) NOT NULL,
	[Description] [nvarchar](256) NULL,
PRIMARY KEY NONCLUSTERED 
(
	[RoleId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[aspnet_UsersInRoles]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_UsersInRoles](
	[UserId] [uniqueidentifier] NOT NULL,
	[RoleId] [uniqueidentifier] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[UserId] ASC,
	[RoleId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vista_rbac_sia_poas]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[vista_rbac_sia_poas] AS
SELECT U.UserName, U.LoweredUserName, R.RoleName, M.IsApproved, US.per_usu_nombre, M.CreateDate


FROM dbo.aspnet_Users as U
left join dbo.aspnet_Membership as M on U.UserId = M.UserId
left join dbo.aspnet_UsersInRoles as UR on U.UserId = UR.UserId
left join dbo.aspnet_Roles as R on R.RoleId = UR.RoleId
left join dbo.perfil_usuario as US on U.UserId = US.per_usu_usuario

GO
/****** Object:  Table [dbo].[proceso]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[proceso](
	[pro_id] [int] IDENTITY(1,1) NOT NULL,
	[pro_proceso] [varchar](255) NULL,
	[pro_abreviatura] [varchar](10) NULL,
	[pro_lider] [uniqueidentifier] NULL,
	[pro_entidad] [uniqueidentifier] NULL,
	[pro_objetivo] [varchar](1000) NULL,
	[pro_fecha_creacion] [datetime] NULL,
	[pro_usuario] [uniqueidentifier] NULL,
	[pro_orden] [int] NULL,
 CONSTRAINT [PK__proceso__335E4CA6840C14B4] PRIMARY KEY CLUSTERED 
(
	[pro_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_resumen_plan_estrategico]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_resumen_plan_estrategico] AS
SELECT 
pro_ext.pro_id
,oi_ext.obj_ins_plan_estrategico
,obj_ins_id
,obj_ins_peso
,obj_est_id 
,obj_est_peso
,poa_act_id
,poa_act_peso
,	(SELECT SUM(((oe.obj_est_peso*oi.obj_ins_peso)/100)*(p.poa_act_peso*pepa.pla_est_pla_acc_peso/100))/100
		FROM poa_actividad as p
		JOIN plan_estrategico_plan_accion as pepa ON pepa.pla_est_pla_acc_id=p.poa_act_plan_estrategico_plan_accion
		JOIN objetivo_estrategico as oe ON p.poa_act_objetivo_estrategico=oe.obj_est_id
		JOIN objetivo_institucional as oi ON oe.obj_est_objetivo_institucional=oi.obj_ins_id 
		WHERE p.poa_act_id=pa_ext.poa_act_id) as poa_act_peso_plan
,CAST(met_act_tri_meta as numeric(18,4)) as met_act_tri_meta
,	(SELECT SUM(met_act_tri_meta) FROM metas_actividades_trimestrales as m
	WHERE m.met_act_tri_poa_actividad=pa_ext.poa_act_id) as suma_metas
,met_act_tri_trimestre
,tar_id
,tar_peso
,	(SELECT TOP 1 CAST(tar_eva_porcentaje_avance as numeric(18,14)) FROM tarea_evaluacion
	WHERE tar_eva_tarea=tar_id ORDER BY tar_eva_id DESC) as tar_avance
,tar_trimestre
,sub_tar_id
,sub_tar_peso
,	(SELECT TOP 1 CAST(sub_tar_eva_porcentaje_avance as numeric(18,14)) FROM sub_tarea_evaluacion
	WHERE sub_tar_eva_subtarea=sub_tar_id ORDER BY sub_tar_eva_id DESC) as sub_tar_avance
,pepa_ext.pla_est_pla_acc_id
FROM metas_actividades_trimestrales 
LEFT JOIN poa_actividad as pa_ext ON met_act_tri_poa_actividad=pa_ext.poa_act_id 
LEFT JOIN proceso as pro_ext ON poa_act_proceso=pro_ext.pro_id 
LEFT JOIN objetivo_estrategico ON poa_act_objetivo_estrategico=obj_est_id 
LEFT JOIN objetivo_institucional as oi_ext ON obj_est_objetivo_institucional=oi_ext.obj_ins_id
LEFT JOIN tarea ON tar_poa_actividad=pa_ext.poa_act_id and tar_trimestre=met_act_tri_trimestre
LEFT JOIN sub_tarea ON sub_tar_tarea=tar_id
LEFT JOIN plan_estrategico_plan_accion as pepa_ext ON pepa_ext.pla_est_pla_acc_id=pa_ext.poa_act_plan_estrategico_plan_accion 
GO
/****** Object:  View [dbo].[vw_reportes_plan_estrategico]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[vw_reportes_plan_estrategico] AS
SELECT 
vw.pro_id
,vw.obj_ins_plan_estrategico
,vw.obj_ins_id
,vw.obj_ins_peso
,vw.obj_est_id 
,vw.obj_est_peso
,vw.poa_act_id
,vw.poa_act_peso
,vw.poa_act_peso_plan
,vw.met_act_tri_meta
,vw.suma_metas
,vw.met_act_tri_trimestre
,vw.tar_id
,vw.tar_peso
,vw.tar_trimestre
,vw.sub_tar_id
,vw.sub_tar_peso
,	(SELECT SUM(((oe.obj_est_peso*oi.obj_ins_peso)/100)*((p.poa_act_peso*pepa.pla_est_pla_acc_peso)/100))/100
	FROM poa_actividad as p
	JOIN plan_estrategico_plan_accion as pepa ON pepa.pla_est_pla_acc_id=p.poa_act_plan_estrategico_plan_accion
	JOIN objetivo_estrategico as oe ON p.poa_act_objetivo_estrategico=oe.obj_est_id
	JOIN objetivo_institucional as oi ON oe.obj_est_objetivo_institucional=oi.obj_ins_id 
	WHERE p.poa_act_proceso=vw.pro_id  and oi.obj_ins_plan_estrategico=vw.obj_ins_plan_estrategico
	and p.poa_act_plan_estrategico_plan_accion=vw.pla_est_pla_acc_id) as meta_total_proceso_plan
,(CAST(poa_act_peso_plan*vw.met_act_tri_meta as numeric(18,14))/vw.suma_metas) as meta_trimestre_plan
,	CASE WHEN sub_tar_id is NOT NULL THEN 
		(sub_tar_avance*(((CAST((CAST(poa_act_peso_plan*met_act_tri_meta as numeric(18,14))/(suma_metas))*tar_peso as numeric(18,14))/100)*sub_tar_peso)/100))/100
	ELSE
		(tar_avance*(((CAST(poa_act_peso_plan*met_act_tri_meta as numeric(18,14))/(suma_metas))*tar_peso)/100))/100
	END as avance_plan
FROM vw_resumen_plan_estrategico as vw
GO
/****** Object:  Table [dbo].[aspnet_Applications]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_Applications](
	[ApplicationName] [nvarchar](256) NOT NULL,
	[LoweredApplicationName] [nvarchar](256) NOT NULL,
	[ApplicationId] [uniqueidentifier] NOT NULL,
	[Description] [nvarchar](256) NULL,
PRIMARY KEY NONCLUSTERED 
(
	[ApplicationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[LoweredApplicationName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[ApplicationName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_aspnet_Applications]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_Applications]
  AS SELECT [dbo].[aspnet_Applications].[ApplicationName], [dbo].[aspnet_Applications].[LoweredApplicationName], [dbo].[aspnet_Applications].[ApplicationId], [dbo].[aspnet_Applications].[Description]
  FROM [dbo].[aspnet_Applications]
  
GO
/****** Object:  View [dbo].[vw_aspnet_Users]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_Users]
  AS SELECT [dbo].[aspnet_Users].[ApplicationId], [dbo].[aspnet_Users].[UserId], [dbo].[aspnet_Users].[UserName], [dbo].[aspnet_Users].[LoweredUserName], [dbo].[aspnet_Users].[MobileAlias], [dbo].[aspnet_Users].[IsAnonymous], [dbo].[aspnet_Users].[LastActivityDate]
  FROM [dbo].[aspnet_Users]
  
GO
/****** Object:  View [dbo].[vw_reportes_objetivo_insitucional]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[vw_reportes_objetivo_insitucional]
AS
SELECT t.tri_id,oi.obj_ins_id,oi.obj_ins_item,oi.obj_ins_nombre,oi.obj_ins_peso,
(SELECT ISNULL(SUM(meta_trimestre_plan),0)
FROM
(SELECT DISTINCT(vw1.pro_id),vw1.obj_ins_plan_estrategico,vw1.met_act_tri_trimestre,
vw1.poa_act_id,vw1.meta_trimestre_plan FROM vw_reportes_plan_estrategico as vw1
WHERE vw1.obj_ins_id=oi.obj_ins_id and vw1.met_act_tri_trimestre=t.tri_id) as sub1) as meta_objetivo,
ISNULL(SUM(vw.avance_plan),0) as avance_objetivo
FROM trimestre as t
CROSS JOIN objetivo_institucional as oi
LEFT JOIN vw_reportes_plan_estrategico as vw ON oi.obj_ins_id=vw.obj_ins_id and t.tri_id=vw.met_act_tri_trimestre 
WHERE t.tri_plan=oi.obj_ins_plan_estrategico
GROUP BY t.tri_id,oi.obj_ins_id,oi.obj_ins_item,oi.obj_ins_nombre,oi.obj_ins_peso
GO
/****** Object:  View [dbo].[vw_reportes_proceso]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_reportes_proceso]
AS
SELECT 
t.tri_plan
,t.tri_id
,t.tri_plan_estrategico_plan_accion 
,p.pro_id
,p.pro_abreviatura
,p.pro_proceso
,p.pro_orden
,	(SELECT ISNULL(SUM(meta_trimestre_plan),0)
	FROM
	(SELECT DISTINCT(vw1.pro_id),vw1.obj_ins_plan_estrategico,vw1.met_act_tri_trimestre,
	vw1.poa_act_id,vw1.meta_trimestre_plan FROM vw_reportes_plan_estrategico as vw1
	WHERE vw1.pro_id=p.pro_id and vw1.met_act_tri_trimestre=t.tri_id) as sub1) as meta_proceso,
	ISNULL(SUM(vw.avance_plan),0) as avance_proceso
FROM trimestre as t
CROSS JOIN proceso as p
LEFT JOIN vw_reportes_plan_estrategico as vw ON p.pro_id=vw.pro_id and t.tri_id=vw.met_act_tri_trimestre 
LEFT JOIN plan_estrategico as pl ON pl.plan_id=t.tri_plan
WHERE pl.plan_entidad=pro_entidad 
GROUP BY t.tri_plan,t.tri_id,t.tri_plan_estrategico_plan_accion,p.pro_id,p.pro_abreviatura,p.pro_proceso,p.pro_orden
GO
/****** Object:  View [dbo].[vw_aspnet_MembershipUsers]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_MembershipUsers]
  AS SELECT [dbo].[aspnet_Membership].[UserId],
            [dbo].[aspnet_Membership].[PasswordFormat],
            [dbo].[aspnet_Membership].[MobilePIN],
            [dbo].[aspnet_Membership].[Email],
            [dbo].[aspnet_Membership].[LoweredEmail],
            [dbo].[aspnet_Membership].[PasswordQuestion],
            [dbo].[aspnet_Membership].[PasswordAnswer],
            [dbo].[aspnet_Membership].[IsApproved],
            [dbo].[aspnet_Membership].[IsLockedOut],
            [dbo].[aspnet_Membership].[CreateDate],
            [dbo].[aspnet_Membership].[LastLoginDate],
            [dbo].[aspnet_Membership].[LastPasswordChangedDate],
            [dbo].[aspnet_Membership].[LastLockoutDate],
            [dbo].[aspnet_Membership].[FailedPasswordAttemptCount],
            [dbo].[aspnet_Membership].[FailedPasswordAttemptWindowStart],
            [dbo].[aspnet_Membership].[FailedPasswordAnswerAttemptCount],
            [dbo].[aspnet_Membership].[FailedPasswordAnswerAttemptWindowStart],
            [dbo].[aspnet_Membership].[Comment],
            [dbo].[aspnet_Users].[ApplicationId],
            [dbo].[aspnet_Users].[UserName],
            [dbo].[aspnet_Users].[MobileAlias],
            [dbo].[aspnet_Users].[IsAnonymous],
            [dbo].[aspnet_Users].[LastActivityDate]
  FROM [dbo].[aspnet_Membership] INNER JOIN [dbo].[aspnet_Users]
      ON [dbo].[aspnet_Membership].[UserId] = [dbo].[aspnet_Users].[UserId]
  
GO
/****** Object:  Table [dbo].[aspnet_Profile]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_Profile](
	[UserId] [uniqueidentifier] NOT NULL,
	[PropertyNames] [ntext] NOT NULL,
	[PropertyValuesString] [ntext] NOT NULL,
	[PropertyValuesBinary] [image] NOT NULL,
	[LastUpdatedDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_aspnet_Profiles]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_Profiles]
  AS SELECT [dbo].[aspnet_Profile].[UserId], [dbo].[aspnet_Profile].[LastUpdatedDate],
      [DataSize]=  DATALENGTH([dbo].[aspnet_Profile].[PropertyNames])
                 + DATALENGTH([dbo].[aspnet_Profile].[PropertyValuesString])
                 + DATALENGTH([dbo].[aspnet_Profile].[PropertyValuesBinary])
  FROM [dbo].[aspnet_Profile]
  
GO
/****** Object:  Table [dbo].[dependencia]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[dependencia](
	[dep_id] [int] IDENTITY(1,1) NOT NULL,
	[dep_dependencia] [varchar](120) NULL,
	[dep_codigo] [int] NULL,
	[dep_entidad] [uniqueidentifier] NULL,
 CONSTRAINT [PK__dependen__BB4BD8F8D12C1F89] PRIMARY KEY CLUSTERED 
(
	[dep_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_resumen_plan_estrategico_dependencias]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[vw_resumen_plan_estrategico_dependencias] AS
SELECT  
dep_ext.dep_id
,oi_ext.obj_ins_plan_estrategico
,oi_ext.obj_ins_id
,oi_ext.obj_ins_peso
,dbo.objetivo_estrategico.obj_est_id
,dbo.objetivo_estrategico.obj_est_peso
,pa_ext.poa_act_id
,pa_ext.poa_act_peso
,	(SELECT SUM(((oe.obj_est_peso*oi.obj_ins_peso)/100)*(p.poa_act_peso*pepa.pla_est_pla_acc_peso/100))/100
		FROM poa_actividad as p
		JOIN plan_estrategico_plan_accion as pepa ON pepa.pla_est_pla_acc_id=p.poa_act_plan_estrategico_plan_accion
		JOIN objetivo_estrategico as oe ON p.poa_act_objetivo_estrategico=oe.obj_est_id
		JOIN objetivo_institucional as oi ON oe.obj_est_objetivo_institucional=oi.obj_ins_id 
		WHERE p.poa_act_id=pa_ext.poa_act_id) as poa_act_peso_plan
,CAST(dbo.metas_actividades_trimestrales.met_act_tri_meta AS numeric(18, 4)) AS met_act_tri_meta
,	(SELECT        SUM(met_act_tri_meta) AS Expr1
    FROM            dbo.metas_actividades_trimestrales AS m
    WHERE        (met_act_tri_poa_actividad = pa_ext.poa_act_id)) AS suma_metas, dbo.metas_actividades_trimestrales.met_act_tri_trimestre, dbo.tarea.tar_id, dbo.tarea.tar_peso,
    (SELECT        TOP (1) CAST(tar_eva_porcentaje_avance AS numeric(18, 14)) AS Expr1
    FROM            dbo.tarea_evaluacion
    WHERE        (tar_eva_tarea = dbo.tarea.tar_id)
    ORDER BY tar_eva_id DESC) AS tar_avance, dbo.tarea.tar_trimestre, dbo.sub_tarea.sub_tar_id, dbo.sub_tarea.sub_tar_peso,
    (SELECT        TOP (1) CAST(sub_tar_eva_porcentaje_avance AS numeric(18, 14)) AS Expr1
    FROM            dbo.sub_tarea_evaluacion
    WHERE        (sub_tar_eva_subtarea = dbo.sub_tarea.sub_tar_id)
    ORDER BY sub_tar_eva_id DESC) AS sub_tar_avance
,pepa_ext.pla_est_pla_acc_id
FROM            dbo.metas_actividades_trimestrales 
LEFT JOIN dbo.poa_actividad AS pa_ext ON dbo.metas_actividades_trimestrales.met_act_tri_poa_actividad = pa_ext.poa_act_id 
LEFT JOIN dbo.dependencia AS dep_ext ON pa_ext.poa_act_dependencia_responsable = dep_ext.dep_id 
LEFT JOIN dbo.objetivo_estrategico ON pa_ext.poa_act_objetivo_estrategico = dbo.objetivo_estrategico.obj_est_id 
LEFT JOIN dbo.objetivo_institucional AS oi_ext ON dbo.objetivo_estrategico.obj_est_objetivo_institucional = oi_ext.obj_ins_id 
LEFT JOIN dbo.tarea ON dbo.tarea.tar_poa_actividad = pa_ext.poa_act_id AND dbo.tarea.tar_trimestre = dbo.metas_actividades_trimestrales.met_act_tri_trimestre 
LEFT JOIN dbo.sub_tarea ON dbo.sub_tarea.sub_tar_tarea = dbo.tarea.tar_id
LEFT JOIN plan_estrategico_plan_accion as pepa_ext ON pepa_ext.pla_est_pla_acc_id=pa_ext.poa_act_plan_estrategico_plan_accion 
GO
/****** Object:  View [dbo].[vw_reportes_plan_estrategico_dependencias]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[vw_reportes_plan_estrategico_dependencias] AS
SELECT vw.dep_id
,vw.obj_ins_plan_estrategico
,vw.obj_ins_id
,vw.obj_ins_peso
,vw.obj_est_id 
,vw.obj_est_peso
,vw.poa_act_id
,vw.poa_act_peso
,vw.poa_act_peso_plan
,vw.met_act_tri_meta
,vw.suma_metas
,vw.met_act_tri_trimestre
,vw.tar_id
,vw.tar_peso
,vw.tar_trimestre
,vw.sub_tar_id
,vw.sub_tar_peso
,		(SELECT SUM(((oe.obj_est_peso*oi.obj_ins_peso)/100)*p.poa_act_peso)/100
		FROM poa_actividad as p
		JOIN plan_estrategico_plan_accion as pepa ON pepa.pla_est_pla_acc_id=p.poa_act_plan_estrategico_plan_accion
		JOIN objetivo_estrategico as oe ON p.poa_act_objetivo_estrategico=oe.obj_est_id
		JOIN objetivo_institucional as oi ON oe.obj_est_objetivo_institucional=oi.obj_ins_id 
		WHERE p.poa_act_dependencia_responsable=vw.dep_id  and oi.obj_ins_plan_estrategico=vw.obj_ins_plan_estrategico
		AND p.poa_act_plan_estrategico_plan_accion=vw.pla_est_pla_acc_id) as meta_total_proceso_plan
,		(CAST(poa_act_peso_plan*vw.met_act_tri_meta as numeric(18,14))/vw.suma_metas) as meta_trimestre_plan
,		CASE WHEN sub_tar_id is NOT NULL THEN 
		(sub_tar_avance*(((CAST((CAST(poa_act_peso_plan*met_act_tri_meta as numeric(18,14))/
		(suma_metas))*tar_peso as numeric(18,14))/100)*sub_tar_peso)/100))/100
		ELSE
		(tar_avance*(((CAST(poa_act_peso_plan*met_act_tri_meta as numeric(18,14))/
		(suma_metas))*tar_peso)/100))/100
		END as avance_plan
FROM vw_resumen_plan_estrategico_dependencias as vw
GO
/****** Object:  View [dbo].[vw_aspnet_Roles]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_Roles]
  AS SELECT [dbo].[aspnet_Roles].[ApplicationId], [dbo].[aspnet_Roles].[RoleId], [dbo].[aspnet_Roles].[RoleName], [dbo].[aspnet_Roles].[LoweredRoleName], [dbo].[aspnet_Roles].[Description]
  FROM [dbo].[aspnet_Roles]
  
GO
/****** Object:  View [dbo].[vw_aspnet_UsersInRoles]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_UsersInRoles]
  AS SELECT [dbo].[aspnet_UsersInRoles].[UserId], [dbo].[aspnet_UsersInRoles].[RoleId]
  FROM [dbo].[aspnet_UsersInRoles]
  
GO
/****** Object:  Table [dbo].[diagnostico_valoracion]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[diagnostico_valoracion](
	[dia_val_id] [int] NOT NULL,
	[dia_val_descripcion] [varchar](50) NULL,
	[dia_val_valor] [int] NULL,
 CONSTRAINT [PK_diagnostico_criterio_evaluacion] PRIMARY KEY CLUSTERED 
(
	[dia_val_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_dofa_factor_interno]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[vw_dofa_factor_interno] AS
SELECT fi.dia_fac_int_id,fi.dia_fac_int_descripcion,fi.dia_fac_int_plan, SUM(val.dia_val_valor) suma_factor,  SUM(ABS(val.dia_val_valor)) suma_abs_factor
FROM diagnostico_factor_interno fi
LEFT JOIN diagnostico_factor_interno_evaluacion eva ON fi.dia_fac_int_id=eva.dia_fac_int_eva_factor_interno
LEFT JOIN diagnostico_valoracion val ON val.dia_val_id=eva.dia_fac_int_eva_valoracion
GROUP BY fi.dia_fac_int_id,fi.dia_fac_int_descripcion,fi.dia_fac_int_plan
GO
/****** Object:  View [dbo].[vw_dofa_factor_externo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[vw_dofa_factor_externo] AS
SELECT fe.dia_fac_ext_id,fe.dia_fac_ext_descripcion,fe.dia_fac_ext_plan, SUM(val.dia_val_valor) suma_factor,  SUM(ABS(val.dia_val_valor)) suma_abs_factor
FROM diagnostico_factor_externo fe
LEFT JOIN diagnostico_factor_externo_evaluacion eva ON fe.dia_fac_ext_id=eva.dia_fac_ext_eva_factor_externo
LEFT JOIN diagnostico_valoracion val ON val.dia_val_id=eva.dia_fac_ext_eva_valoracion
GROUP BY fe.dia_fac_ext_id,fe.dia_fac_ext_descripcion,fe.dia_fac_ext_plan
GO
/****** Object:  Table [dbo].[aspnet_Paths]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_Paths](
	[ApplicationId] [uniqueidentifier] NOT NULL,
	[PathId] [uniqueidentifier] NOT NULL,
	[Path] [nvarchar](256) NOT NULL,
	[LoweredPath] [nvarchar](256) NOT NULL,
PRIMARY KEY NONCLUSTERED 
(
	[PathId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vw_aspnet_WebPartState_Paths]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

  CREATE VIEW [dbo].[vw_aspnet_WebPartState_Paths]
  AS SELECT [dbo].[aspnet_Paths].[ApplicationId], [dbo].[aspnet_Paths].[PathId], [dbo].[aspnet_Paths].[Path], [dbo].[aspnet_Paths].[LoweredPath]
  FROM [dbo].[aspnet_Paths]
  
GO
/****** Object:  View [dbo].[vw_administracion_riesgos_calculo_valoracion]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
---Vista Calculo Valoración.
CREATE VIEW [dbo].[vw_administracion_riesgos_calculo_valoracion]
AS
SELECT 
adm_rie_con_riesgo, 
CASE 
WHEN adm_rie_con_responsable IS NULL THEN 0
ELSE 5
END AS calculo_responsable,
CASE 
WHEN adm_rie_con_documento='' THEN 0
ELSE 10
END AS calculo_documento,
CASE 
WHEN adm_rie_con_evidencias='' THEN 0
ELSE 10
END AS calculo_evidencias,
adm_rie_con_efe_valor as calculo_efectividad,
adm_rie_con_man_aut_valor as calculo_manual_auto,
adm_rie_con_eje_valor as calculo_ejecucion,
adm_rie_con_rev_valor as calculo_revision
FROM
administracion_riesgos_control
JOIN administracion_riesgos_control_efectividad ON adm_rie_con_efectividad=adm_rie_con_efe_id
JOIN administracion_riesgos_control_manual_auto ON adm_rie_con_manual_auto=adm_rie_con_man_aut_id
JOIN administracion_riesgos_control_ejecucion ON adm_rie_con_ejecucion=adm_rie_con_eje_id
JOIN administracion_riesgos_control_revision ON adm_rie_con_revision=adm_rie_con_rev_id
GO
/****** Object:  Table [dbo].[acciones_mejoramiento_evaluacion]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[acciones_mejoramiento_evaluacion](
	[acc_mej_eva_id] [bigint] IDENTITY(1,1) NOT NULL,
	[acc_mej_eva_accion_mejoramiento] [int] NULL,
	[acc_mej_eva_fecha] [date] NULL,
	[acc_mej_eva_avance] [decimal](11, 2) NULL,
	[acc_mej_eva_avance_cualitativo] [varchar](1000) NULL,
	[acc_mej_eva_archivo] [varchar](1000) NULL,
	[acc_mej_eva_fecha_observaciones_seguimiento] [date] NULL,
	[acc_mej_eva_observaciones_seguimiento] [varchar](1000) NULL,
	[acc_mej_eva_fecha_creacion] [datetime] NULL,
	[acc_mej_eva_usuario] [uniqueidentifier] NULL,
	[acc_mej_eva_usuario_observaciones_seguimiento] [uniqueidentifier] NULL,
	[acc_mej_eva_replica_observaciones_seguimiento] [varchar](1000) NULL,
	[acc_mej_eva_fecha_replica_observaciones_seguimiento] [date] NULL,
	[acc_mej_eva_usuario_replica_observaciones_seguimiento] [uniqueidentifier] NULL,
	[acc_mej_eva_conclusion_observaciones_seguimiento] [varchar](1000) NULL,
	[acc_mej_eva_fecha_conclusion_observaciones_seguimiento] [date] NULL,
	[acc_mej_eva_usuario_conclusion_observaciones_seguimiento] [uniqueidentifier] NULL,
	[acc_mej_eva_replica_archivo_seguimiento] [varchar](1000) NULL,
 CONSTRAINT [PK_acciones_mejoramiento_evaluacion] PRIMARY KEY CLUSTERED 
(
	[acc_mej_eva_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[acciones_mejoramiento_novedad]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[acciones_mejoramiento_novedad](
	[acc_mej_nov_id] [int] IDENTITY(1,1) NOT NULL,
	[acc_mej_nov_accion_mejoramiento] [int] NOT NULL,
	[acc_mej_nov_fecha_propuesta] [date] NULL,
	[acc_mej_nov_fecha_actual] [date] NULL,
	[acc_mej_nov_justificacion] [varchar](1000) NOT NULL,
	[acc_mej_nov_usuario] [uniqueidentifier] NOT NULL,
	[acc_mej_nov_fecha] [datetime] NOT NULL,
	[acc_mej_nov_aprobada] [smallint] NULL,
	[acc_mej_nov_observaciones_aprobada] [varchar](1000) NULL,
	[acc_mej_nov_usuario_aprobada] [uniqueidentifier] NULL,
	[acc_mej_nov_fecha_aprobada] [datetime] NULL,
	[acc_mej_nov_tipo] [int] NOT NULL,
	[acc_mej_nov_actividad_propuesta] [varchar](1000) NULL,
	[acc_mej_nov_actividad_actual] [varchar](1000) NULL,
	[acc_mej_nov_dependencia_responsable_propuesta] [int] NULL,
	[acc_mej_nov_dependencia_responsable_actual] [int] NULL,
	[acc_mej_nov_unidad_propuesta] [decimal](11, 2) NULL,
	[acc_mej_nov_unidad_actual] [decimal](11, 2) NULL,
 CONSTRAINT [PK_acciones_mejoramiento_prorroga] PRIMARY KEY CLUSTERED 
(
	[acc_mej_nov_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[acciones_mejoramiento_novedad_tipo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[acciones_mejoramiento_novedad_tipo](
	[acc_mej_nov_tip_id] [int] IDENTITY(1,1) NOT NULL,
	[acc_mej_nov_tip_tipo] [varchar](100) NOT NULL,
 CONSTRAINT [PK_acciones_mejoramiento_novedad_tipo] PRIMARY KEY CLUSTERED 
(
	[acc_mej_nov_tip_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[aspnet_SchemaVersions]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aspnet_SchemaVersions](
	[Feature] [nvarchar](128) NOT NULL,
	[CompatibleSchemaVersion] [nvarchar](128) NOT NULL,
	[IsCurrentVersion] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Feature] ASC,
	[CompatibleSchemaVersion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[cierre]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[cierre](
	[cie_id] [int] NOT NULL,
	[cie_descripcion] [varchar](10) NULL,
 CONSTRAINT [PK_cierrre] PRIMARY KEY CLUSTERED 
(
	[cie_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[configuracion_correo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[configuracion_correo](
	[con_cor_servidor] [varchar](100) NOT NULL,
	[con_cor_puerto] [int] NOT NULL,
	[con_cor_direccion_correo] [varchar](200) NOT NULL,
	[con_cor_password_correo] [varchar](20) NULL,
	[con_cor_correo_alias] [varchar](50) NOT NULL,
	[con_cor_ssl] [bit] NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[entidades]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[entidades](
	[Entidades_Id] [uniqueidentifier] NOT NULL,
	[Entidades_Documento] [nvarchar](16) NULL,
	[Entidades_CODIGO] [nvarchar](20) NULL,
	[Entidades_RazonSocial] [nvarchar](200) NULL,
	[EntidadesNaturalezaJ_Id] [int] NULL,
	[EntidadesRegimenLegal_Id] [int] NULL,
	[Entidades_NombreCorto] [nvarchar](100) NULL,
	[Entidades_RepLegal] [nvarchar](100) NULL,
	[Entidades_Direccion] [nvarchar](200) NULL,
	[Entidades_Tels] [nvarchar](50) NULL,
	[Entidades_Fax] [nvarchar](50) NULL,
	[Entidades_Email] [nvarchar](100) NULL,
	[Municipios_Id] [int] NULL,
	[Departamentos_Id] [nchar](2) NULL,
	[EntidadesTipo_Id] [nchar](1) NULL,
	[Entidades_Id_Control] [uniqueidentifier] NULL,
	[Entidades_CODIGO_Control] [nvarchar](20) NULL,
	[Entidades_Lema] [nvarchar](100) NULL,
	[Entidades_Logo] [nvarchar](100) NULL,
 CONSTRAINT [PK_entidades] PRIMARY KEY CLUSTERED 
(
	[Entidades_Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[entidades_inhabilitar_modulo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[entidades_inhabilitar_modulo](
	[ent_inh_mod_id] [int] IDENTITY(1,1) NOT NULL,
	[ent_inh_mod_modulo] [int] NOT NULL,
	[ent_inh_mod_entidad] [uniqueidentifier] NOT NULL,
 CONSTRAINT [PK_entidades_inhabilitar_modulo] PRIMARY KEY CLUSTERED 
(
	[ent_inh_mod_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[faq]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[faq](
	[faq_id] [int] IDENTITY(1,1) NOT NULL,
	[faq_clasificacion_id] [int] NOT NULL,
	[faq_pregunta] [varchar](1000) NOT NULL,
	[faq_respuesta] [varchar](1000) NOT NULL,
	[faq_archivo] [varchar](1000) NULL,
	[faq_creacion] [datetime] NOT NULL,
	[faq_usuario_id] [uniqueidentifier] NULL,
	[faq_faq_tipo_id] [int] NOT NULL,
	[faq_rol] [uniqueidentifier] NULL,
 CONSTRAINT [PK_faq] PRIMARY KEY CLUSTERED 
(
	[faq_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[faq_clasificacion]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[faq_clasificacion](
	[faq_cla_id] [int] IDENTITY(1,1) NOT NULL,
	[faq_cla_descripcion] [varchar](500) NOT NULL,
	[faq_cla_fecha_creacion] [datetime] NOT NULL,
	[faq_cla_usuario_id] [uniqueidentifier] NULL,
 CONSTRAINT [PK_faq_tipo] PRIMARY KEY CLUSTERED 
(
	[faq_cla_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[faq_tipo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[faq_tipo](
	[faq_tip_id] [int] IDENTITY(1,1) NOT NULL,
	[faq_tip_tipo] [varchar](50) NOT NULL,
 CONSTRAINT [PK_faq_clasificacion] PRIMARY KEY CLUSTERED 
(
	[faq_tip_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[fuente_hallazgo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[fuente_hallazgo](
	[fue_hal_id] [int] NOT NULL,
	[fue_hal_fuente] [varchar](500) NULL,
	[fue_hal_activo] [bit] NULL,
 CONSTRAINT [PK_fuente_hallazgo] PRIMARY KEY CLUSTERED 
(
	[fue_hal_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[historico_plan_mejoramiento]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[historico_plan_mejoramiento](
	[his_pla_mej_id] [int] IDENTITY(1,1) NOT NULL,
	[his_pla_mej_pla_mej_hal_id] [int] NULL,
	[his_pla_mej_pla_mej_hal_numero] [int] NULL,
	[his_pla_mej_pla_mej_hal_numero_modificado] [int] NULL,
	[his_pla_mej_pla_mej_hal_fecha] [date] NULL,
	[his_pla_mej_pla_mej_hal_fecha_modificado] [date] NULL,
	[his_pla_mej_pla_mej_hal_hallazgo] [varchar](1000) NULL,
	[his_pla_mej_pla_mej_hal_hallazgo_modificado] [varchar](1000) NULL,
	[his_pla_mej_pla_mej_hal_fuente] [int] NULL,
	[his_pla_mej_pla_mej_hal_fuente_modificado] [int] NULL,
	[his_pla_mej_pla_mej_hal_tipo_hallazgo] [int] NULL,
	[his_pla_mej_pla_mej_hal_tipo_hallazgo_modificado] [int] NULL,
	[his_pla_mej_pla_mej_hal_efecto] [varchar](1000) NULL,
	[his_pla_mej_pla_mej_hal_efecto_modificado] [varchar](1000) NULL,
	[his_pla_mej_pla_mej_hal_proceso] [int] NULL,
	[his_pla_mej_pla_mej_hal_fila] [varchar](10) NULL,
	[his_pla_mej_pla_mej_hal_fila_modificado] [varchar](10) NULL,
	[his_pla_mej_cau_ant_id] [int] NULL,
	[his_pla_mej_cau_ant_descripcion] [varchar](1000) NULL,
	[his_pla_mej_cau_ant_descripcion_modificado] [varchar](1000) NULL,
	[his_pla_mej_cau_ant_archivo] [varchar](1000) NULL,
	[his_pla_mej_cau_ant_archivo_modificado] [varchar](1000) NULL,
	[his_pla_mej_cau_ant_fecha_creacion] [datetime] NULL,
	[his_pla_mej_cau_ant_usuario] [uniqueidentifier] NULL,
	[his_pla_mej_acc_mej_id] [int] NULL,
	[his_pla_mej_acc_mej_actividad] [varchar](1000) NULL,
	[his_pla_mej_acc_mej_actividad_modificado] [varchar](1000) NULL,
	[his_pla_mej_acc_mej_descripcion_meta] [varchar](1000) NULL,
	[his_pla_mej_acc_mej_descripcion_meta_modificado] [varchar](1000) NULL,
	[his_pla_mej_acc_mej_denominacion_unidad] [varchar](1000) NULL,
	[his_pla_mej_acc_mej_denominacion_unidad_modificado] [varchar](1000) NULL,
	[his_pla_mej_acc_mej_unidad] [decimal](11, 2) NULL,
	[his_pla_mej_acc_mej_unidad_modificado] [decimal](11, 2) NULL,
	[his_pla_mej_acc_mej_fecha_inicio] [date] NULL,
	[his_pla_mej_acc_mej_fecha_inicio_modificado] [date] NULL,
	[his_pla_mej_acc_mej_fecha_fin] [date] NULL,
	[his_pla_mej_acc_mej_fecha_fin_modificado] [date] NULL,
	[his_pla_mej_acc_mej_dependencia_responsable] [int] NULL,
	[his_pla_mej_acc_mej_dependencia_responsable_modificado] [int] NULL,
	[his_pla_mej_acc_mej_fecha_cierre] [date] NULL,
	[his_pla_mej_acc_mej_impacto] [varchar](1000) NULL,
	[his_pla_mej_acc_mej_aprobada] [smallint] NULL,
	[his_pla_mej_acc_mej_fecha_aprobada] [date] NULL,
	[his_pla_mej_acc_mej_observaciones_aprobada] [varchar](1000) NULL,
	[his_pla_mej_acc_acc_mej_usuario_aprobada] [uniqueidentifier] NULL,
	[his_pla_mej_historico_tipo] [int] NOT NULL,
	[his_pla_mej_fecha] [datetime] NOT NULL,
	[his_pla_mej_usuario] [uniqueidentifier] NOT NULL,
 CONSTRAINT [PK_historico_plan_mejoramiento] PRIMARY KEY CLUSTERED 
(
	[his_pla_mej_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[historico_tablero_indicador]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[historico_tablero_indicador](
	[his_tab_ind_id] [bigint] IDENTITY(1,1) NOT NULL,
	[his_tab_ind_indicador] [int] NOT NULL,
	[his_tab_ind_identificador] [varchar](10) NOT NULL,
	[his_tab_ind_objetivo_institucional] [int] NOT NULL,
	[his_tab_ind_nombre] [varchar](1000) NOT NULL,
	[his_tab_ind_proceso] [int] NOT NULL,
	[his_tab_ind_categoria] [int] NOT NULL,
	[his_tab_ind_objetivo_resultado] [varchar](1000) NOT NULL,
	[his_tab_ind_objetivo_apalancamiento] [varchar](1000) NULL,
	[his_tab_ind_formula] [varchar](1000) NOT NULL,
	[his_tab_ind_unidad] [int] NOT NULL,
	[his_tab_ind_definicion_formula] [varchar](1000) NOT NULL,
	[his_tab_ind_fuente] [varchar](1000) NOT NULL,
	[his_tab_ind_meta] [varchar](1000) NULL,
	[his_tab_ind_periodicidad] [int] NOT NULL,
	[his_tab_ind_verde] [int] NOT NULL,
	[his_tab_ind_amarillo] [int] NOT NULL,
	[his_tab_ind_responsable] [int] NOT NULL,
	[his_tab_ind_peso] [decimal](11, 2) NULL,
	[his_tab_ind_tipo_historico] [int] NOT NULL,
	[his_tab_ind_fecha] [date] NOT NULL,
	[his_tab_ind_version] [int] NULL,
	[his_tab_ind_linea_base] [decimal](11, 2) NULL,
 CONSTRAINT [PK_historico_tablero_indicador] PRIMARY KEY CLUSTERED 
(
	[his_tab_ind_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[historico_tipo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[historico_tipo](
	[his_tip_id] [int] NOT NULL,
	[his_tip_tipo] [varchar](50) NULL,
 CONSTRAINT [PK_historico_tipo] PRIMARY KEY CLUSTERED 
(
	[his_tip_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[informacion_inicio]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[informacion_inicio](
	[inf_ini_id] [int] IDENTITY(1,1) NOT NULL,
	[inf_ini_mision] [varchar](1000) NOT NULL,
	[inf_ini_vision] [varchar](1000) NOT NULL,
	[inf_ini_politica] [varchar](1000) NOT NULL,
	[inf_ini_entidad] [uniqueidentifier] NULL,
 CONSTRAINT [PK__basicas__4D726CB786CC83D8] PRIMARY KEY CLUSTERED 
(
	[inf_ini_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[mes]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[mes](
	[mes_id] [int] NOT NULL,
	[mes_mes] [varchar](50) NOT NULL,
 CONSTRAINT [PK_mes] PRIMARY KEY CLUSTERED 
(
	[mes_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[modulo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[modulo](
	[mod_id] [int] IDENTITY(1,1) NOT NULL,
	[mod_nombre] [varchar](50) NOT NULL,
	[mod_alertas_correo_dias] [varchar](1000) NULL,
 CONSTRAINT [PK_modulo] PRIMARY KEY CLUSTERED 
(
	[mod_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[parametros]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[parametros](
	[par_plan_estrategico_activo] [bigint] NULL,
	[par_fecha_corte_plan_mejoramiento] [date] NULL,
	[par_plan_mejoramiento_cerrado] [int] NULL,
	[par_administracion_riesgos_ano_activo] [int] NULL,
	[par_administracion_riesgos_politica] [nvarchar](max) NULL,
	[par_administracion_riesgos_fecha_corte] [date] NULL,
	[par_administracion_riesgos_cerrado] [int] NULL,
	[par_entidad] [uniqueidentifier] NULL,
	[par_consecutivo_archivo] [bigint] NULL,
	[par_administracion_riesgos_archivo_politica] [varchar](200) NULL,
	[par_plan_mejoramiento_proceso_formato] [int] NULL,
	[par_plan_mejoramiento_codigo_formato] [varchar](20) NULL,
	[par_plan_mejoramiento_version_formato] [varchar](10) NULL,
	[par_plan_mejoramiento_fecha_formato] [date] NULL,
	[par_administracion_riesgos_proceso_formato] [int] NULL,
	[par_administracion_riesgos_codigo_formato] [varchar](20) NULL,
	[par_administracion_riesgos_version_formato] [varchar](10) NULL,
	[par_administracion_riesgos_fecha_formato] [date] NULL,
	[par_tablero_control_proceso_formato] [int] NULL,
	[par_tablero_control_codigo_formato] [varchar](20) NULL,
	[par_tablero_control_version_formato] [varchar](10) NULL,
	[par_tablero_control_fecha_formato] [date] NULL,
	[par_plan_mejoramiento_aprobador] [uniqueidentifier] NULL,
	[par_administracion_riesgos_proceso_formato_v2] [int] NULL,
	[par_administracion_riesgos_codigo_formato_v2] [varchar](20) NULL,
	[par_administracion_riesgos_version_formato_v2] [varchar](10) NULL,
	[par_administracion_riesgos_fecha_formato_v2] [date] NULL,
	[par_proyectos_inversion_ano_activo] [int] NULL,
	[par_proyectos_inversion_mes_activo] [int] NULL,
	[par_proyectos_inversion_aprobador] [uniqueidentifier] NULL,
	[par_tablero_control_version_activa] [int] NULL,
	[par_tablero_control_ano_activo] [int] NULL,
	[par_tablero_control_mes_activo] [int] NULL,
	[par_planes_adquisicion_aprobador] [uniqueidentifier] NULL,
	[par_planes_adquisicion_vigencia_activa] [int] NULL,
	[par_plan_mejoramiento_funcionario_apoyo] [uniqueidentifier] NULL,
	[par_semaforo_amarillo] [int] NULL,
	[par_semaforo_verde] [int] NULL,
	[par_semaforo_barra_completa] [bit] NULL,
	[par_administracion_riesgos_proceso_formato_v3] [int] NULL,
	[par_administracion_riesgos_codigo_formato_v3] [varchar](20) NULL,
	[par_administracion_riesgos_version_formato_v3] [varchar](10) NULL,
	[par_administracion_riesgos_fecha_formato_v3] [date] NULL,
	[par_plan_mejoramiento_restriccion_meses] [int] NULL,
	[par_administracion_riesgos_debida_diligencia_codigo_formato] [varchar](20) NULL,
	[par_administracion_riesgos_debida_diligencia_version_formato] [varchar](10) NULL,
	[par_administracion_riesgos_debida_diligencia_proceso_formato] [int] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[perfil_usuario_dependencia]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[perfil_usuario_dependencia](
	[per_usu_dep_id] [int] IDENTITY(1,1) NOT NULL,
	[per_usu_dep_usuario] [uniqueidentifier] NOT NULL,
	[per_usu_dep_dependencia] [int] NOT NULL,
 CONSTRAINT [PK_perfil_usuario_dependencia] PRIMARY KEY CLUSTERED 
(
	[per_usu_dep_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[periodicidad]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[periodicidad](
	[per_id] [int] NOT NULL,
	[per_periodicidad] [varchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[per_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tipo_hallazgo]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tipo_hallazgo](
	[tip_hal_id] [int] NOT NULL,
	[tip_hal_tipo] [varchar](50) NULL,
	[tip_hal_tipo_abreviatura] [varchar](10) NULL,
 CONSTRAINT [PK_tipo_hallazgo] PRIMARY KEY CLUSTERED 
(
	[tip_hal_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[unidad]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[unidad](
	[uni_id] [int] NOT NULL,
	[uni_unidad] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[uni_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vigencia_proceso]    Script Date: 13/02/2026 2:06:30 p.m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vigencia_proceso](
	[vig_pro_id] [bigint] IDENTITY(1,1) NOT NULL,
	[vig_pro_vigencia] [int] NOT NULL,
	[vig_pro_proceso] [int] NOT NULL,
 CONSTRAINT [PK_vigencia_proceso] PRIMARY KEY CLUSTERED 
(
	[vig_pro_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[acciones_mejoramiento_evaluacion] ADD  DEFAULT (getdate()) FOR [acc_mej_eva_fecha_creacion]
GO
ALTER TABLE [dbo].[acciones_mejoramiento_novedad] ADD  CONSTRAINT [DF_acciones_mejoramiento_prorroga_acc_mej_pro_fecha]  DEFAULT (getdate()) FOR [acc_mej_nov_fecha]
GO
ALTER TABLE [dbo].[aspnet_Applications] ADD  DEFAULT (newid()) FOR [ApplicationId]
GO
ALTER TABLE [dbo].[aspnet_Membership] ADD  DEFAULT ((0)) FOR [PasswordFormat]
GO
ALTER TABLE [dbo].[aspnet_Paths] ADD  DEFAULT (newid()) FOR [PathId]
GO
ALTER TABLE [dbo].[aspnet_PersonalizationPerUser] ADD  DEFAULT (newid()) FOR [Id]
GO
ALTER TABLE [dbo].[aspnet_Roles] ADD  DEFAULT (newid()) FOR [RoleId]
GO
ALTER TABLE [dbo].[aspnet_Users] ADD  DEFAULT (newid()) FOR [UserId]
GO
ALTER TABLE [dbo].[aspnet_Users] ADD  DEFAULT (NULL) FOR [MobileAlias]
GO
ALTER TABLE [dbo].[aspnet_Users] ADD  DEFAULT ((0)) FOR [IsAnonymous]
GO
ALTER TABLE [dbo].[causas_antecedentes] ADD  DEFAULT (getdate()) FOR [cau_ant_fecha_creacion]
GO
ALTER TABLE [dbo].[cierre] ADD  CONSTRAINT [DF_cierrre_cie_id]  DEFAULT (NULL) FOR [cie_id]
GO
ALTER TABLE [dbo].[dependencia] ADD  CONSTRAINT [DF__dependenc__dep_d__65370702]  DEFAULT (NULL) FOR [dep_dependencia]
GO
ALTER TABLE [dbo].[dependencia] ADD  CONSTRAINT [DF__dependenc__dep_c__662B2B3B]  DEFAULT (NULL) FOR [dep_codigo]
GO
ALTER TABLE [dbo].[faq] ADD  CONSTRAINT [DF_faq_faq_creacion]  DEFAULT (getdate()) FOR [faq_creacion]
GO
ALTER TABLE [dbo].[faq_clasificacion] ADD  CONSTRAINT [DF_Table_1_faq_tipo_fecha_creacion]  DEFAULT (getdate()) FOR [faq_cla_fecha_creacion]
GO
ALTER TABLE [dbo].[fuente_hallazgo] ADD  DEFAULT ('true') FOR [fue_hal_activo]
GO
ALTER TABLE [dbo].[historico_plan_mejoramiento] ADD  CONSTRAINT [DF_historico_plan_mejoramiento_his_pla_mej_fecha]  DEFAULT (getdate()) FOR [his_pla_mej_fecha]
GO
ALTER TABLE [dbo].[parametros] ADD  DEFAULT ((60)) FOR [par_semaforo_amarillo]
GO
