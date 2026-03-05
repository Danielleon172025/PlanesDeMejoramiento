import React, { useReducer, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { fetchAcciones } from '../services/api';

const CalendarHeader = ({ currentDate, prevMonth, goToToday, nextMonth }) => (
    <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-csj-azul/10 rounded-lg text-csj-azul">
                <CalendarIcon size={24} />
            </div>
            <div>
                <h2 className="text-xl font-black text-gray-800 font-montserrat uppercase">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <p className="text-sm text-gray-500 font-cairo">
                    Calendario de Vencimientos
                </p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="btn-outline p-2 rounded-full">
                <ChevronLeft size={20} />
            </button>
            <button onClick={goToToday} className="btn-outline px-4 py-2 text-sm">
                Hoy
            </button>
            <button onClick={nextMonth} className="btn-outline p-2 rounded-full">
                <ChevronRight size={20} />
            </button>
        </div>
    </div>
);

const CalendarDays = () => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return (
        <div className="grid grid-cols-7 mb-2">
            {days.map(day => (
                <div key={day} className="text-center font-bold text-gray-500 text-sm py-2 font-montserrat uppercase">
                    {day}
                </div>
            ))}
        </div>
    );
};

const initialState = {
    currentDate: new Date(),
    acciones: [],
    loading: true,
    selectedDate: null,
    selectedActions: [],
    filter: 'all' // all, pending, closed
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_CURRENT_DATE': return { ...state, currentDate: action.payload };
        case 'SET_ACCIONES': return { ...state, acciones: action.payload, loading: false };
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SELECT_DATE': return { ...state, selectedDate: action.payload.date, selectedActions: action.payload.actions };
        case 'CLOSE_MODAL': return { ...state, selectedDate: null, selectedActions: [] };
        case 'SET_FILTER': return { ...state, filter: action.payload };
        default: return state;
    }
};

const CalendarView = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { currentDate, acciones, loading, selectedDate, selectedActions, filter } = state;

    useEffect(() => {
        loadAcciones();
    }, []);

    const loadAcciones = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await fetchAcciones(); // Fetches all actions
            dispatch({ type: 'SET_ACCIONES', payload: data });
        } catch (error) {
            console.error("Error loading acciones for calendar", error);
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const nextMonth = () => dispatch({ type: 'SET_CURRENT_DATE', payload: addMonths(currentDate, 1) });
    const prevMonth = () => dispatch({ type: 'SET_CURRENT_DATE', payload: subMonths(currentDate, 1) });
    const goToToday = () => dispatch({ type: 'SET_CURRENT_DATE', payload: new Date() });

    // Generate calendar grid
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const getActionsForDay = (day) => {
        return acciones.filter(accion => {
            if (!accion.fecha_fin) return false;
            // Check if day matches start or end date
            const start = parseISO(accion.fecha_inicio);
            const end = parseISO(accion.fecha_fin);

            // For now, let's mark the DEADLINE (End Date) as the most important
            return isSameDay(end, day);
        });
    };

    const handleDayClick = (day, dayActions) => {
        dispatch({ type: 'SELECT_DATE', payload: { date: day, actions: dayActions } });
    };

    const filteredActions = (actions) => {
        if (filter === 'all') return actions;
        if (filter === 'pending') return actions.filter(a => !a.fecha_cierre);
        if (filter === 'closed') return actions.filter(a => a.fecha_cierre);
        return actions;
    };

    // Render logic




    const renderCells = () => (
        <div className="grid grid-cols-7 gap-1 bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {calendarDays.map((day, idx) => {
                const dayActions = getActionsForDay(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);
                const hasActions = dayActions.length > 0;

                return (
                    <div
                        key={day.toString()}
                        className={`
                            min-h-[120px] bg-white p-2 flex flex-col justify-between transition-colors
                            ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : 'text-gray-700'}
                            ${isTodayDate ? 'bg-blue-50/50' : ''}
                            ${hasActions ? 'cursor-pointer hover:bg-gray-50' : ''}
                        `}
                        onClick={() => hasActions && handleDayClick(day, dayActions)}
                        role={hasActions ? "button" : undefined}
                        tabIndex={hasActions ? 0 : undefined}
                        onKeyDown={(e) => {
                            if (hasActions && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                handleDayClick(day, dayActions);
                            }
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`
                                text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                                ${isTodayDate ? 'bg-csj-azul text-white' : ''}
                            `}>
                                {format(day, 'd')}
                            </span>
                            {hasActions && (
                                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                    {dayActions.length}
                                </span>
                            )}
                        </div>

                        <div className="space-y-1 mt-1 overflow-hidden">
                            {dayActions.slice(0, 3).map((action, i) => (
                                <div
                                    key={action.id_accion || action.id || `action-${i}`}
                                    className={`
                                        text-[10px] truncate px-1.5 py-0.5 rounded border-l-2 text-white
                                        ${action.fecha_cierre ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'}
                                    `}
                                    title={action.actividad}
                                >
                                    {action.actividad}
                                </div>
                            ))}
                            {dayActions.length > 3 && (
                                <div className="text-[10px] text-gray-400 pl-1">
                                    + {dayActions.length - 3} más
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="animate-fadeIn">
            <CalendarHeader currentDate={currentDate} prevMonth={prevMonth} goToToday={goToToday} nextMonth={nextMonth} />

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <CalendarDays />
                {loading ? (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                        Cargando calendario...
                    </div>
                ) : (
                    renderCells()
                )}
            </div>

            {/* Modal for Day Details */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col animate-slideIn">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold text-gray-800 font-montserrat flex items-center gap-2">
                                <CalendarIcon size={20} className="text-csj-azul" />
                                Vencimientos: {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
                            </h3>
                            <button
                                onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 space-y-3">
                            {selectedActions.map(action => (
                                <div
                                    key={action.id}
                                    className="p-3 border border-gray-200 rounded-lg hover:border-csj-azul/50 transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`
                                            text-xs font-bold px-2 py-0.5 rounded uppercase
                                            ${action.fecha_cierre
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'}
                                        `}>
                                            {action.fecha_cierre ? 'Cerrada' : 'Vence Hoy'}
                                        </span>
                                        <span className="text-xs text-xs text-gray-400 font-mono">
                                            ID: {action.id}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 font-cairo leading-snug">
                                        {action.actividad}
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs text-gray-500">
                                            {action.dependencia || 'Sin dependencia'}
                                        </span>
                                        {/* Future: Link to detail */}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                            <button
                                onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
                                className="btn-primary px-4 py-2 text-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
