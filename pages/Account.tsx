import React from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Shield, User, LogIn } from 'lucide-react';

export const Account: React.FC = () => {
    const { user, setUser } = useStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        setUser(null);
        navigate('/auth');
    };

    const isGuest = user?.role === 'guest';

    if (isGuest) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 pb-24 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <User size={48} className="text-slate-300" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Guest Access</h2>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                    Log in to save routes, post in the community, and track your activity.
                </p>
                
                <div className="w-full space-y-3">
                    <button 
                        onClick={() => navigate('/auth')}
                        className="bg-blue-600 text-white w-full py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} /> Log In / Register
                    </button>
                    <p className="text-xs text-slate-400">
                        Takes you back to the login screen
                    </p>
                </div>
            </div>
        );
    }

    if (!user) return null; // Should be handled by router protection, but safe fallback

    return (
        <div className="pb-20 pt-4 px-4 max-w-2xl mx-auto">
            <header className="mb-8 flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
                    {user.display_name.charAt(0)}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">{user.display_name}</h1>
                    <p className="text-sm text-slate-500">@{user.username}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium capitalize">
                        {user.role}
                    </span>
                </div>
            </header>

            <div className="space-y-2">
                <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <Settings size={20} className="text-slate-400" />
                            <span className="text-slate-700 font-medium">Account Settings</span>
                        </div>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 transition-colors">
                         <div className="flex items-center gap-3">
                            <Shield size={20} className="text-slate-400" />
                            <span className="text-slate-700 font-medium">Privacy & Security</span>
                        </div>
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-4 hover:bg-red-50 text-red-600 transition-colors"
                    >
                         <div className="flex items-center gap-3">
                            <LogOut size={20} />
                            <span className="font-medium">Log Out</span>
                        </div>
                    </button>
                </section>
            </div>
        </div>
    );
};