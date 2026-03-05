import React, { useReducer, useEffect } from 'react';
import { X, Save, AlertTriangle, Calendar, User, Target, Package } from 'lucide-react';
import { fetchListas, createAccion, updateAccion } from '../services/api';

const initialState = {
    formData: {
        actividad: '',
        responsable: '', // ID de dependencia
        fechaInicio: '',
        fechaFin: '',
        unidadMedida: '',
        meta: '',
        descripcionMeta: ''
    },
    dependencias: [],
    loading: false,
    submitting: false,
    error: null
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_FORM_DATA':
            return { ...state, formData: action.payload };
        case 'UPDATE_FORM_FIELD':
            return { ...state, formData: { ...state.formData, [action.field]: action.value } };
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, dependencias: action.payload };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload, dependencias: action.fallback };
        case 'SUBMIT_START':
            return { ...state, submitting: true, error: null };
        case 'SUBMIT_SUCCESS':
            return { ...state, submitting: false };
        case 'SUBMIT_ERROR':
            return { ...state, submitting: false, error: action.payload };
        default:
            return state;
    }
};

const AccionForm = ({ causaId, accionToEdit = null, onClose, onSave }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { formData, dependencias, loading, submitting, error } = state;

    useEffect(() => {
        const loadDependencias = async () => {
            dispatch({ type: 'FETCH_START' });
            try {
                // Asumimos que fetchListas soporta 'dependencias' o creamos una nueva función si no
                const data = await fetchListas('dependencias');
                dispatch({ type: 'FETCH_SUCCESS', payload: data });
            } catch (err) {
                console.error("Error loading dependencias", err);
                dispatch({
                    type: 'FETCH_ERROR',
                    payload: "No se pudieron cargar las dependencias (simulado para demo si falla)",
                    fallback: [
                        { id: 1, nombre: 'Dirección Seccional' },
                        { id: 2, nombre: 'Consejo Seccional' },
                        { id: 3, nombre: 'Oficina de Apoyo' }
                    ]
                });
            }
        };

        loadDependencias();
    }, []);

    useEffect(() => {
        if (accionToEdit) {
            dispatch({
                type: 'SET_FORM_DATA', payload: {
                    actividad: accionToEdit.accion || '',
                    responsable: accionToEdit.dependenciaResponsableId || '', // Need to ensure this ID comes from backend
                    fechaInicio: accionToEdit.fechaInicio ? new Date(accionToEdit.fechaInicio).toISOString().split('T')[0] : '',
                    fechaFin: accionToEdit.fechaFin ? new Date(accionToEdit.fechaFin).toISOString().split('T')[0] : '',
                    unidadMedida: accionToEdit.denominacionUnidad || '',
                    meta: accionToEdit.entregablesTotales || '',
                    descripcionMeta: accionToEdit.descripcionMetas || ''
                }
            });
        }
    }, [accionToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        dispatch({ type: 'UPDATE_FORM_FIELD', field: name, value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch({ type: 'SUBMIT_START' });

        try {
            if (!formData.actividad || !formData.fechaInicio || !formData.fechaFin || !formData.responsable) {
                throw new Error("Por favor diligencie los campos obligatorios (*)");
            }

            const payload = {
                causa_id: parseInt(causaId),
                actividad: formData.actividad,
                dependencia_responsable: parseInt(formData.responsable),
                fecha_inicio: formData.fechaInicio,
                fecha_fin: formData.fechaFin,
                denominacion_unidad: formData.unidadMedida,
                unidad: parseFloat(formData.meta) || 0,
                descripcion_meta: formData.descripcionMeta
            };

            let result;
            if (accionToEdit) {
                // result = await updateAccion(accionToEdit.id, payload);
                alert("Simulación: Actualizar Acción " + JSON.stringify(payload));
                result = { ...payload, id: accionToEdit.id };
            } else {
                result = await createAccion(payload);
            }

            dispatch({ type: 'SUBMIT_SUCCESS' });
            onSave(result);
            onClose();
        } catch (err) {
            console.error(err);
            dispatch({ type: 'SUBMIT_ERROR', payload: err.message || "Error al guardar la acción" });
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Cargando formulario...</div>;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-csj-azul to-csj-verde p-5 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white font-montserrat flex items-center gap-2">
                        {accionToEdit ? 'Editar Acción de Mejora' : 'Nueva Acción de Mejora'}
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-200">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Actividad */}
                    <div>
                        <label htmlFor="accion-actividad" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                            Actividad / Acción <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="accion-actividad"
                            name="actividad"
                            value={formData.actividad}
                            onChange={handleChange}
                            rows="3"
                            className="input-csj w-full"
                            placeholder="Describa la actividad a realizar..."
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Responsable */}
                        <div>
                            <label htmlFor="accion-responsable" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                Dependencia Responsable <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <select
                                    id="accion-responsable"
                                    name="responsable"
                                    value={formData.responsable}
                                    onChange={handleChange}
                                    className="select-csj w-full pl-10"
                                >
                                    <option value="">Seleccione...</option>
                                    {dependencias.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Fechas */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="accion-fechaInicio" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                    Fecha Inicio <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="accion-fechaInicio"
                                    type="date"
                                    name="fechaInicio"
                                    value={formData.fechaInicio}
                                    onChange={handleChange}
                                    className="input-csj w-full"
                                />
                            </div>
                            <div>
                                <label htmlFor="accion-fechaFin" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                    Fecha Fin <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="accion-fechaFin"
                                    type="date"
                                    name="fechaFin"
                                    value={formData.fechaFin}
                                    onChange={handleChange}
                                    className="input-csj w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="font-bold text-csj-azul mb-3 font-montserrat flex items-center gap-2">
                            <Target size={18} /> Metas y Entregables
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Unidad de Medida */}
                            <div>
                                <label htmlFor="accion-unidadMedida" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                    Unidad de Medida
                                </label>
                                <div className="relative">
                                    <Package size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        id="accion-unidadMedida"
                                        type="text"
                                        name="unidadMedida"
                                        value={formData.unidadMedida}
                                        onChange={handleChange}
                                        placeholder="Ej: Informe, Taller"
                                        className="input-csj w-full pl-10"
                                    />
                                </div>
                            </div>

                            {/* Meta */}
                            <div>
                                <label htmlFor="accion-meta" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                    Cantidad (Meta)
                                </label>
                                <input
                                    id="accion-meta"
                                    type="number"
                                    name="meta"
                                    value={formData.meta}
                                    onChange={handleChange}
                                    placeholder="Ej: 1"
                                    className="input-csj w-full"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        {/* Descripción Metas */}
                        <div className="mt-4">
                            <label htmlFor="accion-descripcionMeta" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                Descripción de la Meta / Entregable
                            </label>
                            <textarea
                                id="accion-descripcionMeta"
                                name="descripcionMeta"
                                value={formData.descripcionMeta}
                                onChange={handleChange}
                                rows="2"
                                className="input-csj w-full"
                                placeholder="Detalles sobre lo que se debe entregar..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-outline"
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex items-center gap-2"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Guardar Acción
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccionForm;
