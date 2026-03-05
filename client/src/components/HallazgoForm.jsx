import React, { useEffect, useReducer } from 'react';
import { X, Save, FileText, Calendar, AlertTriangle, Layers, Bookmark } from 'lucide-react';
import { fetchListas, createHallazgo, updateHallazgo, fetchUsuariosRoles } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const initialState = {
    formData: {
        numero: '',
        fecha: new Date().toISOString().split('T')[0],
        fuente: '',
        proceso: '',
        tipo: '',  // ID numérico del tipo de hallazgo
        descripcion: '', // Maps to 'hallazgo' in DB
        efecto: '',
        auditor: '' // ID del usuario auditor
    },
    listas: { procesos: [], fuentes: [], auditores: [] },
    loading: false,
    submitting: false,
    error: null
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE_FORM': return { ...state, formData: { ...state.formData, [action.field]: action.value } };
        case 'SET_FORM_DATA': return { ...state, formData: action.payload };
        case 'FETCH_START': return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS': return { ...state, loading: false, listas: action.payload };
        case 'FETCH_ERROR': return { ...state, loading: false, error: action.payload };
        case 'SUBMIT_START': return { ...state, submitting: true, error: null };
        case 'SUBMIT_SUCCESS': return { ...state, submitting: false };
        case 'SUBMIT_ERROR': return { ...state, submitting: false, error: action.payload };
        default: return state;
    }
};

const HallazgoForm = ({ hallazgoToEdit = null, onClose, onSave }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { formData, listas, loading, submitting, error } = state;
    const { user } = useAuth();

    // Tipos de hallazgo hardcoded por ahora, idealmente vendrían de una lista maestra
    const tiposHallazgo = [
        { id: 1, nombre: 'No Conforme' },
        { id: 2, nombre: 'Oportunidad de Mejora' },
        { id: 3, nombre: 'Observación' }
    ];

    useEffect(() => {
        const loadListas = async () => {
            dispatch({ type: 'FETCH_START' });
            try {
                const [procesosData, fuentesData, usuariosRoles] = await Promise.all([
                    fetchListas('procesos'),
                    fetchListas('fuentes'),
                    fetchUsuariosRoles()
                ]);

                // 1) Procesos filtrados por la dependencia del usuario activo (Líder)
                let procesosFiltrados = procesosData || [];
                // Si el usuario No es administrador/auditor, solo ve su propia dependencia
                if (user?.rol !== 'Administrador' && user?.rol !== 'Auditor' && user?.dependenciaId) {
                    procesosFiltrados = procesosFiltrados.filter(p => p.id === user.dependenciaId);
                }

                // Si al filtrar queda un solo proceso, seleccionarlo por defecto
                if (procesosFiltrados.length === 1 && !hallazgoToEdit) {
                    dispatch({ type: 'UPDATE_FORM', field: 'proceso', value: procesosFiltrados[0].id.toString() });
                }

                // 2) Auditores extrayendo del rol correspondiente
                let auditores = [];
                const rolAuditor = (usuariosRoles || []).find(r => r.nombre === 'Auditor');
                if (rolAuditor && rolAuditor.usuarios) {
                    auditores = rolAuditor.usuarios;
                }

                dispatch({ type: 'FETCH_SUCCESS', payload: { procesos: procesosFiltrados, fuentes: fuentesData, auditores } });
            } catch (err) {
                console.error("Error loading lists", err);
                dispatch({ type: 'FETCH_ERROR', payload: "No se pudieron cargar las listas desplegables" });
            }
        };

        loadListas();
    }, [user, hallazgoToEdit]);

    useEffect(() => {
        if (hallazgoToEdit) {
            dispatch({
                type: 'SET_FORM_DATA', payload: {
                    numero: hallazgoToEdit.numero || '',
                    fecha: hallazgoToEdit.fecha ? new Date(hallazgoToEdit.fecha).toISOString().split('T')[0] : '',
                    fuente: hallazgoToEdit.fuenteId || '', // Asumiendo que viene el ID
                    proceso: hallazgoToEdit.procesoId || '', // Asumiendo que viene el ID
                    tipo: hallazgoToEdit.tipoId || '', // Asumiendo que viene el ID
                    descripcion: hallazgoToEdit.descripcion || '',
                    efecto: hallazgoToEdit.efecto || '',
                    auditor: hallazgoToEdit.auditor_id || ''
                }
            });
        }
    }, [hallazgoToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        dispatch({ type: 'UPDATE_FORM', field: name, value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch({ type: 'SUBMIT_START' });

        try {
            if (!formData.numero || !formData.fecha || !formData.fuente || !formData.proceso || !formData.tipo || !formData.descripcion || !formData.auditor) {
                throw new Error("Por favor diligencie todos los campos obligatorios (*)");
            }

            const payload = {
                numero: formData.numero,
                fecha: formData.fecha,
                fuente_id: parseInt(formData.fuente),
                proceso_id: parseInt(formData.proceso),
                tipo_hallazgo_id: parseInt(formData.tipo) || null,
                descripcion: formData.descripcion,
                efecto: formData.efecto,
                auditor_id: formData.auditor
            };

            let result;
            if (hallazgoToEdit) {
                // result = await updateHallazgo(hallazgoToEdit.id, payload);
                // Implementation for update pending in api.js if not exists
                alert("Actualización simulada: " + JSON.stringify(payload));
                result = { ...payload, id: hallazgoToEdit.id };
            } else {
                result = await createHallazgo(payload);
            }

            dispatch({ type: 'SUBMIT_SUCCESS' });
            onSave(result);
            onClose();
        } catch (err) {
            console.error(err);
            dispatch({ type: 'SUBMIT_ERROR', payload: err.message || "Error al guardar el hallazgo" });
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando formulario...</div>;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-csj-azul to-csj-verde p-5 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white font-montserrat flex items-center gap-2">
                        {hallazgoToEdit ? 'Editar Hallazgo' : 'Registrar Nuevo Hallazgo'}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Numero */}
                        <div>
                            <label htmlFor="hallazgo-numero" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                No. Hallazgo <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="hallazgo-numero"
                                type="text"
                                name="numero"
                                value={formData.numero}
                                onChange={handleChange}
                                placeholder="Ej: AUD-2026-001"
                                className="input-csj w-full"
                            />
                        </div>

                        {/* Fecha */}
                        <div>
                            <label htmlFor="hallazgo-fecha" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                Fecha <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    id="hallazgo-fecha"
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha}
                                    onChange={handleChange}
                                    className="input-csj w-full pl-10"
                                />
                            </div>
                        </div>

                        {/* Proceso */}
                        <div>
                            <label htmlFor="hallazgo-proceso" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                Proceso <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Layers size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <select
                                    id="hallazgo-proceso"
                                    name="proceso"
                                    value={formData.proceso}
                                    onChange={handleChange}
                                    className="select-csj w-full pl-10"
                                >
                                    <option value="">Seleccione...</option>
                                    {listas.procesos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Fuente */}
                        <div>
                            <label htmlFor="hallazgo-fuente" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                Fuente <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Bookmark size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <select
                                    id="hallazgo-fuente"
                                    name="fuente"
                                    value={formData.fuente}
                                    onChange={handleChange}
                                    className="select-csj w-full pl-10"
                                >
                                    <option value="">Seleccione...</option>
                                    {listas.fuentes.map(f => (
                                        <option key={f.id} value={f.id}>{f.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Tipo de Hallazgo */}
                        <div>
                            <label htmlFor="hallazgo-tipo" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                Tipo de Hallazgo <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <AlertTriangle size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <select
                                    id="hallazgo-tipo"
                                    name="tipo"
                                    value={formData.tipo}
                                    onChange={handleChange}
                                    className="select-csj w-full pl-10"
                                >
                                    <option value="">Seleccione...</option>
                                    {tiposHallazgo.map(t => (
                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Auditor Responsable */}
                        <div> {/* Changed from md:col-span-2 to div to fit the grid structure */}
                            <label htmlFor="hallazgo-auditor" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                                Auditor Responsable (Control Interno) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Bookmark className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    id="hallazgo-auditor"
                                    name="auditor"
                                    value={formData.auditor}
                                    onChange={handleChange}
                                    className="select-csj font-cairo pl-10 w-full"
                                    disabled={submitting}
                                >
                                    <option value="">Seleccione el auditor...</option>
                                    {listas.auditores && listas.auditores.map(auditor => (
                                        <option key={auditor.id} value={auditor.id}>
                                            {auditor.nombre} {auditor.email ? `(${auditor.email})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label htmlFor="hallazgo-descripcion" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                            Descripción del Hallazgo <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="hallazgo-descripcion"
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            rows="4"
                            className="input-csj w-full"
                            placeholder="Describa el hallazgo detalladamente..."
                        ></textarea>
                    </div>

                    {/* Efecto */}
                    <div>
                        <label htmlFor="hallazgo-efecto" className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                            Efecto / Impacto
                        </label>
                        <textarea
                            id="hallazgo-efecto"
                            name="efecto"
                            value={formData.efecto}
                            onChange={handleChange}
                            rows="3"
                            className="input-csj w-full"
                            placeholder="Describa el impacto o efecto potencial..."
                        ></textarea>
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
                                    Guardar Hallazgo
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HallazgoForm;
