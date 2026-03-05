import React from 'react';
import { AlertTriangle, ArrowRight, Target } from 'lucide-react';

const EMPTY_CAUSES = [];

export const CausesTimeline = ({ causes = EMPTY_CAUSES, effect }) => {
    if (!causes || causes.length === 0) {
        return (
            <div className="text-center text-gray-400 font-cairo italic p-8 border-2 border-dashed border-gray-200 rounded-xl">
                No hay causas registradas para visualizar
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 font-montserrat mb-6 flex items-center gap-2">
                <AlertTriangle className="text-csj-amarillo" />
                Línea de Causa y Efecto
            </h3>

            <div className="relative border-l-4 border-csj-azul/20 ml-6 space-y-8 py-2">
                {/* Effect Node (Top) */}
                <div className="ml-10 relative group">
                    <div className="absolute -left-[54px] top-0 w-10 h-10 rounded-full bg-csj-azul text-white flex items-center justify-center border-4 border-white shadow-md z-10">
                        <Target size={20} />
                    </div>

                    <div className="bg-gradient-to-r from-csj-azul to-[#1b3a6e] p-5 rounded-lg shadow-md text-white">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-200 block mb-1">
                            Efecto / Problema Principal
                        </span>
                        <p className="font-medium font-montserrat text-lg leading-relaxed">
                            {effect || 'Efecto no definido'}
                        </p>
                    </div>
                </div>

                {/* Causes List */}
                {causes.map((cause, index) => (
                    <div key={cause.id} className="ml-10 relative group">
                        {/* Connector Line Logic for arrow effect if needed, or just dot */}
                        <div className="absolute -left-[50px] top-4 w-8 h-8 rounded-full bg-white border-2 border-csj-amarillo flex items-center justify-center z-10 shadow-sm">
                            <span className="text-xs font-bold text-gray-500">{index + 1}</span>
                        </div>

                        <div className="bg-gray-50 hover:bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all">
                            <div className="flex items-start gap-4">
                                <ArrowRight className="text-gray-300 mt-1 min-w-[20px]" size={20} />
                                <div>
                                    <span className="text-xs font-bold text-csj-amarillo uppercase tracking-wider mb-1 block">
                                        Causa Raíz #{index + 1}
                                    </span>
                                    <p className="text-gray-700 font-cairo">
                                        {cause.descripcion || cause.causa}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 text-center">
                <p className="text-xs text-gray-400 font-cairo">
                    Visualización secuencial de las causas que originan el hallazgo.
                </p>
            </div>
        </div>
    );
};


