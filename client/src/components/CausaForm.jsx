import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, FileText } from 'lucide-react';
import { createCausa } from '../services/api';

const CausaForm = ({ hallazgoId, causeToEdit = null, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        descripcion: ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (causeToEdit) {
            setFormData({
                descripcion: causeToEdit.causa || ''
            });
        }
    }, [causeToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            if (!formData.descripcion.trim()) {
                throw new Error("La descripción de la causa es obligatoria");
            }

            const payload = {
                hallazgo_id: parseInt(hallazgoId),
                descripcion: formData.descripcion
            };

            let result;
            if (causeToEdit) {
                // Update logic would go here
                alert("Actualización no implementada en este demo");
                result = { ...payload, id: causeToEdit.id };
            } else {
                result = await createCausa(payload);
            }

            onSave(result);
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.message || "Error al guardar la causa");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-csj-azul to-csj-verde p-5 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white font-montserrat flex items-center gap-2">
                        {causeToEdit ? 'Editar Causa' : 'Registrar Nueva Causa'}
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-200">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 font-montserrat uppercase">
                            Descripción de la Causa <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            rows="5"
                            className="input-csj w-full"
                            placeholder="Describa la causa raíz identificada..."
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
                                    Guardar Causa
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CausaForm;
