import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, AlertTriangle, Bus, Car, Bike, Navigation, Layers, Info, Bug, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTerminals } from '../services/routeCalculator';
import { Terminal } from '../types';

export const AreaReport: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Retrieve dynamic location info from navigation state, or fallback to default
    const locationInfo = location.state?.locationInfo || { 
        name: "Brgy. Tandang Sora", 
        area: "Bayan / Palengke Area" 
    };

    const [terminals, setTerminals] = useState<Terminal[]>([]);
    
    // MOCK DATA AGGREGATION
    useEffect(() => {
        setTerminals(getTerminals());
    }, []);

    const terminalCounts = {
        BUS: terminals.filter(t => t.type === 'BUS').length,
        JEEP: terminals.filter(t => t.type === 'JEEP').length,
        E_JEEP: terminals.filter(t => t.type === 'E_JEEP').length,
        TRICYCLE: terminals.filter(t => t.type === 'TRICYCLE').length,
        MIXED: terminals.filter(t => t.type === 'MIXED').length,
    };

    const totalRoutes = terminals.reduce((acc, t) => acc + t.routeCount, 0);

    // MOCK INCIDENTS MATCHING NEW COMMUNITY MARKER CATEGORIES
    const incidents = [
        { type: 'TRAFFIC', count: 4, label: 'Traffic', icon: Car, color: 'text-orange-600', bg: 'bg-orange-100' },
        { type: 'INCIDENT', count: 1, label: 'Incident', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
        { type: 'TERMINAL', count: 0, label: 'Terminal', icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
        { type: 'MAP_ISSUE', count: 2, label: 'Map Issue', icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-100' },
        { type: 'BUG', count: 0, label: 'App Bug', icon: Bug, color: 'text-slate-600', bg: 'bg-slate-100' },
        { type: 'FEEDBACK', count: 3, label: 'Feedback', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-100' },
    ];

    const popularRoutes = [
        { id: 1, name: 'Tandang Sora to City Hall', dist: '3.5 km', time: '25 min', fare: '₱15.00' },
        { id: 2, name: 'Visayas Ave to Philcoa', dist: '4.2 km', time: '30 min', fare: '₱20.00' },
        { id: 3, name: 'Culiat to TechnoHub', dist: '2.8 km', time: '15 min', fare: '₱13.00' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* HEADER */}
            <div className="bg-white p-4 shadow-sm border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="font-bold text-lg text-slate-800 leading-tight">{locationInfo.name} Report</h1>
                    <p className="text-xs text-slate-500">{locationInfo.area} - Detailed Overview</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* KEY METRICS GRID */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="bg-blue-50 p-2 rounded-full text-blue-600 mb-1"><MapPin size={20} /></div>
                        <span className="text-xl font-bold text-slate-800">{terminals.length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Terminals</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="bg-purple-50 p-2 rounded-full text-purple-600 mb-1"><Navigation size={20} /></div>
                        <span className="text-xl font-bold text-slate-800">{totalRoutes}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Routes</span>
                    </div>
                     <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="bg-orange-50 p-2 rounded-full text-orange-600 mb-1"><AlertTriangle size={20} /></div>
                        <span className="text-xl font-bold text-slate-800">5</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Incidents</span>
                    </div>
                </div>

                {/* TERMINAL BREAKDOWN */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Layers size={18} /> Terminal Breakdown
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-1.5 rounded text-blue-600"><Bus size={16} /></div>
                                <span className="text-sm font-medium text-slate-700">Jeepneys & E-Jeeps</span>
                            </div>
                            <span className="font-bold text-slate-800">{terminalCounts.JEEP + terminalCounts.E_JEEP}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${((terminalCounts.JEEP + terminalCounts.E_JEEP) / terminals.length) * 100}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-1.5 rounded text-purple-600"><Bus size={16} /></div>
                                <span className="text-sm font-medium text-slate-700">Buses</span>
                            </div>
                            <span className="font-bold text-slate-800">{terminalCounts.BUS}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(terminalCounts.BUS / terminals.length) * 100}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-1.5 rounded text-green-600"><Bike size={16} /></div>
                                <span className="text-sm font-medium text-slate-700">Tricycles</span>
                            </div>
                            <span className="font-bold text-slate-800">{terminalCounts.TRICYCLE}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full rounded-full" style={{ width: `${(terminalCounts.TRICYCLE / terminals.length) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* COMMUNITY INCIDENTS */}
                <div>
                     <h3 className="font-bold text-slate-800 mb-3 px-1">Community Incidents (Today)</h3>
                     <div className="grid grid-cols-2 gap-3">
                         {incidents.map((inc, idx) => (
                             <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                                 <div className="flex items-center gap-3">
                                     <div className={`p-2 rounded-full ${inc.bg} ${inc.color}`}>
                                         <inc.icon size={16} />
                                     </div>
                                     <span className="text-sm font-semibold text-slate-700">{inc.label}</span>
                                 </div>
                                 <span className={`text-lg font-bold ${inc.color}`}>{inc.count}</span>
                             </div>
                         ))}
                     </div>
                </div>

                {/* ROUTE OVERVIEW TABLE */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">Route Overview</h3>
                        <p className="text-xs text-slate-500">Popular routes starting from this area</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Destination</th>
                                    <th className="px-4 py-3 text-right">Dist.</th>
                                    <th className="px-4 py-3 text-right">Time</th>
                                    <th className="px-4 py-3 text-right">Fare</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {popularRoutes.map(route => (
                                    <tr key={route.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-700">{route.name}</td>
                                        <td className="px-4 py-3 text-right text-slate-500">{route.dist}</td>
                                        <td className="px-4 py-3 text-right text-slate-500">{route.time}</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-600">{route.fare}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};