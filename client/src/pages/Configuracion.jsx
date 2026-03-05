import React, { useEffect, useState } from 'react';
import { fetchConfiguracion, updateConfiguracion } from '../services/api';
import { Save, Settings } from 'lucide-react';

const Configuracion = () => {
    const [loading, setLoading] = useState(true);
    const [configuracion, setConfiguracion] = useState({ parametros: {} });
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchConfiguracion();
            setConfiguracion(data || { parametros: {} });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateConfiguracion(configuracion.parametros || {});
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfiguracion(prev => ({
            ...prev,
            parametros: {
                ...prev.parametros,
                [name]: Number.parseInt(value, 10)
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="p-3 bg-gray-100 rounded-full text-csj-azul">
                    <Settings size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-csj-azul font-montserrat">Configuración del Sistema</h2>
                    <p className="text-gray-500 font-cairo text-sm">Parámetros generales y reglas de negocio</p>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 font-montserrat flex items-center gap-2">
                        <span className="w-1 h-6 bg-csj-amarillo rounded-full"></span>
                        Semáforos de Alerta
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="space-y-2">
                            <label className="label-csj text-gray-700">Días para Alerta Amarilla</label>
                            <input
                                className="input-csj bg-white"
                                type="number"
                                name="par_semaforo_amarillo"
                                value={configuracion.parametros?.par_semaforo_amarillo ?? ''}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-gray-500">Días restantes para que una acción se marque en amarillo.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="label-csj text-gray-700">Días para Alerta Verde</label>
                            <input
                                className="input-csj bg-white"
                                type="number"
                                name="par_semaforo_verde"
                                value={configuracion.parametros?.par_semaforo_verde ?? ''}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-gray-500">Días restantes considerados seguros (verde).</p>
                        </div>
                    </div>
                </div>

                {/* More configuration sections can be added here */}

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        className="btn-primary flex items-center gap-2 px-6 py-2.5"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Configuracion;
