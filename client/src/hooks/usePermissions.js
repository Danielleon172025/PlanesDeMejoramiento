import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook para consultar los permisos del usuario actual en un módulo específico.
 * @param {string} moduleKey - clave del módulo: 'hallazgos', 'acciones', 'seguimientos', 'novedades', 'usuarios', 'config'
 * @returns {{ canView: boolean, canCreate: boolean, canEdit: boolean, canDelete: boolean }}
 */
export const usePermissions = (moduleKey) => {
    const ctx = useContext(AuthContext);
    const permissions = ctx?.permissions || {};
    const modulePerms = permissions[moduleKey] || [];

    return {
        canView: modulePerms.includes('ver'),
        canCreate: modulePerms.includes('crear'),
        canEdit: modulePerms.includes('editar'),
        canDelete: modulePerms.includes('eliminar'),
    };
};
