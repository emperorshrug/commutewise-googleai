import React from 'react';
import { History, Map, Clock, Lock, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export const Activity: React.FC = () => {
    const user = useStore(state => state.user);
    const navigate = useNavigate();
    const isGuest = user?.role === 'guest';

    const history = [
        { id: 1, from: 'Home', to: 'Technohub', date: 'Oct 24, 8:30 AM', duration: '25 min', cost: '₱20.00' },
        { id: 2, from: 'SM North', to: 'Tandang Sora', date: 'Oct 23, 6:15 PM', duration: '45 min', cost: '₱35.00' },
    ];

    if (isGuest) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 pb-24 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Lock size={32} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Login Required</h2>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                    Your trip history and activity are saved securely in the cloud. Please log in to view your records.
                </p>
                <button 
                    onClick={() => navigate('/auth')}
                    className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-blue-700 transition"
                >
                    Log In Now
                </button>
            </div>
        );
    }

    return (
        <div className="pb-20 pt-4 px-4 max-w-2xl mx-auto">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Your Activity</h1>
                <p className="text-sm text-slate-500">Recent trips and interactions</p>
            </header>

            <div className="space-y-4">
                {history.map(trip => (
                    <div key={trip.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <Map size={18} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">{trip.to}</h3>
                                    <p className="text-xs text-slate-500">From: {trip.from}</p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-slate-700">{trip.cost}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                            <span className="flex items-center gap-1"><History size={12}/> {trip.date}</span>
                            <span className="flex items-center gap-1"><Clock size={12}/> {trip.duration}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};