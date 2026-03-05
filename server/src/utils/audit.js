import sql from 'mssql';
import { SYSTEM_USER_ID } from './auth.js';

export const HISTORICO_TIPO = {
    HALLAZGO_CREADO: 1,
    HALLAZGO_ACTUALIZADO: 2,
    HALLAZGO_ELIMINADO: 3,
    CAUSA_CREADA: 4,
    CAUSA_ACTUALIZADA: 5,
    CAUSA_ELIMINADA: 6,
    ACCION_CREADA: 7,
    ACCION_ACTUALIZADA: 8,
    ACCION_ELIMINADA: 9,
    SOLICITUD_APROBACION: 10,
    APROBACION_APROBADA: 11,
    APROBACION_RECHAZADA: 12,
    NOVEDAD_SOLICITADA: 13,
    NOVEDAD_APROBADA: 14,
    NOVEDAD_RECHAZADA: 15,
};

export const insertHistorico = async (pool, data) => {
    const request = pool.request();
    request.input('hallazgoId', sql.Int, data.hallazgoId ?? null);
    request.input('numero', sql.Int, data.numero ?? null);
    request.input('numeroMod', sql.Int, data.numeroMod ?? null);
    request.input('fecha', sql.Date, data.fecha ?? null);
    request.input('fechaMod', sql.Date, data.fechaMod ?? null);
    request.input('hallazgo', sql.VarChar(1000), data.hallazgo ?? null);
    request.input('hallazgoMod', sql.VarChar(1000), data.hallazgoMod ?? null);
    request.input('fuente', sql.Int, data.fuente ?? null);
    request.input('fuenteMod', sql.Int, data.fuenteMod ?? null);
    request.input('tipoHallazgo', sql.Int, data.tipoHallazgo ?? null);
    request.input('tipoHallazgoMod', sql.Int, data.tipoHallazgoMod ?? null);
    request.input('efecto', sql.VarChar(1000), data.efecto ?? null);
    request.input('efectoMod', sql.VarChar(1000), data.efectoMod ?? null);
    request.input('proceso', sql.Int, data.proceso ?? null);
    request.input('fila', sql.VarChar(10), data.fila ?? null);
    request.input('filaMod', sql.VarChar(10), data.filaMod ?? null);
    request.input('causaId', sql.Int, data.causaId ?? null);
    request.input('causa', sql.VarChar(1000), data.causa ?? null);
    request.input('causaMod', sql.VarChar(1000), data.causaMod ?? null);
    request.input('causaArchivo', sql.VarChar(1000), data.causaArchivo ?? null);
    request.input('causaArchivoMod', sql.VarChar(1000), data.causaArchivoMod ?? null);
    request.input('causaFecha', sql.DateTime, data.causaFecha ?? null);
    request.input('causaUsuario', sql.UniqueIdentifier, data.causaUsuario ?? null);
    request.input('accionId', sql.Int, data.accionId ?? null);
    request.input('actividad', sql.VarChar(1000), data.actividad ?? null);
    request.input('actividadMod', sql.VarChar(1000), data.actividadMod ?? null);
    request.input('meta', sql.VarChar(1000), data.meta ?? null);
    request.input('metaMod', sql.VarChar(1000), data.metaMod ?? null);
    request.input('unidadDen', sql.VarChar(1000), data.unidadDen ?? null);
    request.input('unidadDenMod', sql.VarChar(1000), data.unidadDenMod ?? null);
    request.input('unidad', sql.Decimal(11, 2), data.unidad ?? null);
    request.input('unidadMod', sql.Decimal(11, 2), data.unidadMod ?? null);
    request.input('fechaInicio', sql.Date, data.fechaInicio ?? null);
    request.input('fechaInicioMod', sql.Date, data.fechaInicioMod ?? null);
    request.input('fechaFin', sql.Date, data.fechaFin ?? null);
    request.input('fechaFinMod', sql.Date, data.fechaFinMod ?? null);
    request.input('dependencia', sql.Int, data.dependencia ?? null);
    request.input('dependenciaMod', sql.Int, data.dependenciaMod ?? null);
    request.input('fechaCierre', sql.Date, data.fechaCierre ?? null);
    request.input('impacto', sql.VarChar(1000), data.impacto ?? null);
    request.input('aprobada', sql.SmallInt, data.aprobada ?? null);
    request.input('fechaAprobada', sql.Date, data.fechaAprobada ?? null);
    request.input('obsAprobada', sql.VarChar(1000), data.obsAprobada ?? null);
    request.input('usuarioAprobada', sql.UniqueIdentifier, data.usuarioAprobada ?? null);
    request.input('tipoHistorico', sql.Int, data.tipoHistorico);
    request.input('usuario', sql.UniqueIdentifier, data.usuario || SYSTEM_USER_ID);

    await request.query(`
        INSERT INTO historico_plan_mejoramiento (
            his_pla_mej_pla_mej_hal_id,
            his_pla_mej_pla_mej_hal_numero,
            his_pla_mej_pla_mej_hal_numero_modificado,
            his_pla_mej_pla_mej_hal_fecha,
            his_pla_mej_pla_mej_hal_fecha_modificado,
            his_pla_mej_pla_mej_hal_hallazgo,
            his_pla_mej_pla_mej_hal_hallazgo_modificado,
            his_pla_mej_pla_mej_hal_fuente,
            his_pla_mej_pla_mej_hal_fuente_modificado,
            his_pla_mej_pla_mej_hal_tipo_hallazgo,
            his_pla_mej_pla_mej_hal_tipo_hallazgo_modificado,
            his_pla_mej_pla_mej_hal_efecto,
            his_pla_mej_pla_mej_hal_efecto_modificado,
            his_pla_mej_pla_mej_hal_proceso,
            his_pla_mej_pla_mej_hal_fila,
            his_pla_mej_pla_mej_hal_fila_modificado,
            his_pla_mej_cau_ant_id,
            his_pla_mej_cau_ant_descripcion,
            his_pla_mej_cau_ant_descripcion_modificado,
            his_pla_mej_cau_ant_archivo,
            his_pla_mej_cau_ant_archivo_modificado,
            his_pla_mej_cau_ant_fecha_creacion,
            his_pla_mej_cau_ant_usuario,
            his_pla_mej_acc_mej_id,
            his_pla_mej_acc_mej_actividad,
            his_pla_mej_acc_mej_actividad_modificado,
            his_pla_mej_acc_mej_descripcion_meta,
            his_pla_mej_acc_mej_descripcion_meta_modificado,
            his_pla_mej_acc_mej_denominacion_unidad,
            his_pla_mej_acc_mej_denominacion_unidad_modificado,
            his_pla_mej_acc_mej_unidad,
            his_pla_mej_acc_mej_unidad_modificado,
            his_pla_mej_acc_mej_fecha_inicio,
            his_pla_mej_acc_mej_fecha_inicio_modificado,
            his_pla_mej_acc_mej_fecha_fin,
            his_pla_mej_acc_mej_fecha_fin_modificado,
            his_pla_mej_acc_mej_dependencia_responsable,
            his_pla_mej_acc_mej_dependencia_responsable_modificado,
            his_pla_mej_acc_mej_fecha_cierre,
            his_pla_mej_acc_mej_impacto,
            his_pla_mej_acc_mej_aprobada,
            his_pla_mej_acc_mej_fecha_aprobada,
            his_pla_mej_acc_mej_observaciones_aprobada,
            his_pla_mej_acc_acc_mej_usuario_aprobada,
            his_pla_mej_historico_tipo,
            his_pla_mej_usuario
        ) VALUES (
            @hallazgoId,
            @numero,
            @numeroMod,
            @fecha,
            @fechaMod,
            @hallazgo,
            @hallazgoMod,
            @fuente,
            @fuenteMod,
            @tipoHallazgo,
            @tipoHallazgoMod,
            @efecto,
            @efectoMod,
            @proceso,
            @fila,
            @filaMod,
            @causaId,
            @causa,
            @causaMod,
            @causaArchivo,
            @causaArchivoMod,
            @causaFecha,
            @causaUsuario,
            @accionId,
            @actividad,
            @actividadMod,
            @meta,
            @metaMod,
            @unidadDen,
            @unidadDenMod,
            @unidad,
            @unidadMod,
            @fechaInicio,
            @fechaInicioMod,
            @fechaFin,
            @fechaFinMod,
            @dependencia,
            @dependenciaMod,
            @fechaCierre,
            @impacto,
            @aprobada,
            @fechaAprobada,
            @obsAprobada,
            @usuarioAprobada,
            @tipoHistorico,
            @usuario
        )
    `);
};
