import React, { useEffect, useState } from 'react';
import { fetchReportesResumen } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Filter, Calendar } from 'lucide-react';

const Reportes = () => {
    const [loading, setLoading] = useState(false);
    const [reportes, setReportes] = useState({ por_dependencia: [], por_proceso: [], tendencia: [] });
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchReportesResumen({ startDate: filters.startDate, endDate: filters.endDate });
            setReportes(data || { por_dependencia: [], por_proceso: [], tendencia: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-csj-azul font-montserrat">Reportes y Analytics</h2>
                        <p className="text-gray-500 font-cairo">Análisis de gestión y tendencias del sistema</p>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700"
                            />
                        </div>
                        <span className="text-gray-400">-</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700"
                            />
                        </div>
                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                        <button
                            onClick={loadData}
                            className="btn-primary flex items-center gap-2 py-1.5 px-4 text-sm"
                        >
                            <Filter size={14} />
                            Filtrar
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ACCIONES POR DEPENDENCIA */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 font-montserrat">Acciones por Dependencia</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={reportes.por_dependencia?.slice(0, 10) || []}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="dependencia" type="category" width={150} tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="total_acciones" name="Total Acciones" fill="#1e3a6b" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="cerradas" name="Cerradas" fill="#359946" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* TENDENCIA MENSUAL */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 font-montserrat">Tendencia de Creación Mensual</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={reportes.tendencia || []}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="periodo" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="acciones_creadas" name="Acciones Nuevas" stroke="#359946" strokeWidth={3} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ACCIONES POR PROCESO */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 lg:col-span-2">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 font-montserrat">Impacto por Proceso</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={reportes.por_proceso?.slice(0, 15) || []}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="proceso" tick={false} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="hallazgos" name="Hallazgos" fill="#eab308" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="acciones" name="Acciones" fill="#1e3a6b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <p className="text-center text-xs text-gray-500 mt-2">* Procesos ordenados por volumen de acciones</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reportes;
