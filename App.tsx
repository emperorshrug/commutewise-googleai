import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Community } from './pages/Community';
import { Activity } from './pages/Activity';
import { Account } from './pages/Account';
import { Auth } from './pages/Auth';
import { ForgotPassword } from './pages/ForgotPassword';
import { EmailVerification } from './pages/EmailVerification';
import { ReportIssue } from './pages/ReportIssue';
import { AreaReport } from './pages/AreaReport';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import { UserProfile } from './types';
import { Loader2 } from 'lucide-react';

// WRAPPER FOR PROTECTED ROUTES
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
    const user = useStore(state => state.user);
    const isLoading = useStore(state => state.isLoading);

    if (isLoading) return null; 

    if (!user) {
        return <Navigate to="/auth" replace />;
    }
    return <>{children}</>;
};

const App: React.FC = () => {
  const setUser = useStore(state => state.setUser);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  // PERSIST SESSION CHECK
  useEffect(() => {
    const handleSession = async (session: any) => {
        if (session && session.user) {
             const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (profile) {
                setUser(profile);
            } else {
                // FALLBACK: If profile row missing, create temp profile from auth data
                console.warn("Profile missing, using auth metadata fallback");
                const fallbackUser: UserProfile = {
                    id: session.user.id,
                    email: session.user.email || '',
                    display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Commuter',
                    username: session.user.user_metadata?.username || 'user',
                    role: 'user'
                };
                setUser(fallbackUser);
            }
        } else {
            setUser(null);
        }
    };

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
        await handleSession(session);
        setIsCheckingSession(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (isCheckingSession) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500 font-bold text-sm">Loading CommuteWise...</p>
          </div>
      );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        
        {/* PROTECTED LAYOUT ROUTES */}
        <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><Layout><Community /></Layout></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute><Layout><Activity /></Layout></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Layout><Account /></Layout></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><Layout><ReportIssue /></Layout></ProtectedRoute>} />
        <Route path="/area-report" element={<ProtectedRoute><Layout><AreaReport /></Layout></ProtectedRoute>} />
        
        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;