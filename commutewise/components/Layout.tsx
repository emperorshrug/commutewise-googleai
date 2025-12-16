import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Map, Users, Activity, User, Plus, AlertTriangle, MessageSquare, MapPin, Radio } from 'lucide-react';
import { useStore } from '../store/useStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showFabMenu, setShowFabMenu] = useState(false);
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const isSelectionMode = useStore(state => state.isSelectionMode);
  const hideGlobalFab = useStore(state => state.hideGlobalFab);

  // NAVIGATION ITEMS CONFIGURATION
  const navItems = [
    { path: '/', icon: Map, label: 'Map' },
    { path: '/community', icon: Users, label: 'Community' },
    { path: '/activity', icon: Activity, label: 'Activity' },
    { path: '/account', icon: User, label: 'Account' },
  ];

  const handleFabAction = (type: string) => {
      navigate(`/report?type=${type}`);
      setShowFabMenu(false);
  };

  const shouldShowFab = !isSelectionMode && pathname !== '/report' && !hideGlobalFab;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 relative">
      
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-hidden relative z-0">
        {children}
      </main>

      {/* FLOATING ACTION BUTTON (GLOBAL REPORTING) */}
      {shouldShowFab && (
        <div className="absolute bottom-20 right-4 z-50 flex flex-col items-end gap-2 transition-opacity duration-300">
            {showFabMenu && (
                <div className="bg-white rounded-lg shadow-xl p-2 flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-5 w-48">
                    <button 
                        onClick={() => handleFabAction('TRAFFIC')} 
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded text-sm font-medium text-slate-700 text-left transition-colors"
                    >
                        <div className="bg-orange-100 p-1.5 rounded text-orange-600"><AlertTriangle size={16} /></div>
                        Community Alert
                    </button>
                    <button 
                        onClick={() => handleFabAction('MAP_ISSUE')} 
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded text-sm font-medium text-slate-700 text-left transition-colors"
                    >
                         <div className="bg-blue-100 p-1.5 rounded text-blue-600"><MapPin size={16} /></div>
                        Fix Map Issue
                    </button>
                    <button 
                        onClick={() => handleFabAction('FEEDBACK')} 
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded text-sm font-medium text-slate-700 text-left transition-colors"
                    >
                         <div className="bg-green-100 p-1.5 rounded text-green-600"><MessageSquare size={16} /></div>
                        App Feedback
                    </button>
                </div>
            )}
            <button 
                onClick={() => setShowFabMenu(!showFabMenu)}
                className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 opacity-80 hover:opacity-100 active:scale-95 ${showFabMenu ? 'bg-slate-800 rotate-45 opacity-100' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                <Plus size={28} />
            </button>
        </div>
      )}

      {/* STICKY BOTTOM NAVIGATION */}
      {/* Hide Bottom Nav on Report Page to give more space */}
      {pathname !== '/report' && (
          <nav className="h-16 bg-white border-t border-slate-200 flex justify-around items-center z-40 shrink-0">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center w-full h-full ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium mt-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
      )}
    </div>
  );
};