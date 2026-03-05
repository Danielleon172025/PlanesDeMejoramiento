import React, { useState } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import EvidenceUpload from './EvidenceUpload';
import { createEvaluacion } from '../services/api';

const EvaluacionForm = ({ accionId, onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        avance: '',
        avance_cualitativo: '',
        archivo: '' // URL del archivo
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploadComplete = (url, filename) => {
        setFormData(prev => ({ ...prev, archivo: url }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validaciones básicas
        if (!formData.avance || isNaN(formData.avance) || formData.avance < 0 || formData.avance > 100) {
            setError('El avance debe ser un número entre 0 y 100');
            return;
        }
        if (!formData.avance_cualitativo) {
            setError('La descripción del avance es obligatoria');
            return;
        }

        try {
            setLoading(true);
            await createEvaluacion(accionId, formData);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Error creating evaluation:', err);
            setError('Error al registrar el avance. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-800 font-montserrat">
                    Registrar Nuevo Avance
                </h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded flex items-center gap-2 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 font-montserrat">
                            Fecha de Reporte
                        </label>
                        <input
                            type="date"
                            name="fecha"
                            value={formData.fecha}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-csj-verde focus:border-csj-verde outline-none transition"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 font-montserrat">
                            Porcentaje de Avance (%)
                        </label>
                        <input
                            type="number"
                            name="avance"
                            value={formData.avance}
                            onChange={handleChange}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-csj-verde focus:border-csj-verde outline-none transition"
                            placeholder="0 - 100"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 font-montserrat">
                        Descripción del Avance (Cualitativo)
                    </label>
                    <textarea
                        name="avance_cualitativo"
                        value={formData.avance_cualitativo}
                        onChange={handleChange}
                        rows="4"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-csj-verde focus:border-csj-verde outline-none transition"
                        placeholder="Describa los logros alcanzados y soportes adjuntos..."
                        required
                    ></textarea>
                </div>

                <div>
                    <EvidenceUpload onUploadComplete={handleUploadComplete} />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-csj-verde text-white rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center gap-2 font-bold"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : (
                            <>
                                <Save size={18} />
                                Registrar Avance
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EvaluacionForm;
