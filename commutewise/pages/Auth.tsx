import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, CheckSquare, Square, AlertCircle, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

export const Auth: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    
    const { hasAcceptedTerms, setAcceptedTerms, setGuestUser, user, setUser } = useStore();
    const [termsChecked, setTermsChecked] = useState(hasAcceptedTerms);

    const navigate = useNavigate();

    useEffect(() => {
        setTermsChecked(hasAcceptedTerms);
        // If user is already authenticated, redirect
        if (user && user.role !== 'guest') {
            navigate('/');
        }
    }, [hasAcceptedTerms, user, navigate]);

    const handleTermsToggle = () => {
        const newState = !termsChecked;
        setTermsChecked(newState);
        setAcceptedTerms(newState);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsChecked) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                // Fetch profile immediately to ensure store is updated before navigation
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    console.warn('Profile fetch failed, using fallback:', profileError.message);
                }

                if (profile) {
                    setUser(profile);
                } else {
                    // Fallback if profile row is missing
                    const fallbackUser: UserProfile = {
                        id: data.user.id,
                        email: data.user.email || '',
                        display_name: data.user.user_metadata?.display_name || 'Commuter',
                        username: data.user.user_metadata?.username || 'user',
                        role: 'user'
                    };
                    setUser(fallbackUser);
                }
                navigate('/');
            }
        } catch (error: any) {
            alert(error.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsChecked) return;
        setLoading(true);

        if (displayName.length > 20) {
            alert("Display Name must be 20 characters or less.");
            setLoading(false); return;
        }
        if (password.length < 6) {
             alert("Password must be at least 6 characters.");
             setLoading(false); return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin, // FORCE REDIRECT TO CURRENT ORIGIN
                    data: {
                        display_name: displayName,
                        username: username,
                    }
                }
            });

            if (error) throw error;

            // Redirect to Email Verification Page
            navigate('/verify-email');
        } catch (error: any) {
            alert(error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = () => {
        if (!termsChecked) return;
        setGuestUser();
        navigate('/');
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            
            <div className="text-center mb-6 animate-in slide-in-from-top-4 duration-500">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-300">
                    <span className="text-3xl">🚌</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">CommuteWise</h1>
                <p className="text-slate-500 mt-1 font-medium">Smart Transport for Tandang Sora</p>
            </div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                
                <div className="flex border-b border-slate-100">
                    <button 
                        onClick={() => setActiveTab('LOGIN')}
                        className={`flex-1 py-4 text-sm font-bold tracking-wide transition-all ${
                            activeTab === 'LOGIN' 
                            ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                    >
                        LOG IN
                    </button>
                    <button 
                        onClick={() => setActiveTab('REGISTER')}
                        className={`flex-1 py-4 text-sm font-bold tracking-wide transition-all ${
                            activeTab === 'REGISTER' 
                            ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                    >
                        REGISTER
                    </button>
                </div>

                <div className="p-8">
                    <form onSubmit={activeTab === 'LOGIN' ? handleLogin : handleRegister} className="space-y-4">
                        
                        {activeTab === 'REGISTER' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-xs font-bold text-black uppercase mb-1 ml-1">Display Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        maxLength={20}
                                        placeholder="e.g. Juan Dela Cruz"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-black font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        value={displayName}
                                        onChange={e => setDisplayName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-black uppercase mb-1 ml-1">Username</label>
                                    <input 
                                        type="text" 
                                        required 
                                        maxLength={20}
                                        placeholder="e.g. juandc"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-black font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-black uppercase mb-1 ml-1">Email</label>
                            <input 
                                type="email" 
                                required 
                                placeholder="you@example.com"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-black font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black uppercase mb-1 ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required 
                                    minLength={6}
                                    placeholder="••••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-black font-medium focus:ring-2 focus:ring-blue-500 outline-none transition pr-10"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {activeTab === 'LOGIN' && (
                            <div className="flex justify-end">
                                <Link to="/forgot-password" type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                        )}

                        <div className="py-2">
                             <div 
                                onClick={handleTermsToggle}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${termsChecked ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                             >
                                <div className={`mt-0.5 ${termsChecked ? 'text-blue-600' : 'text-slate-300'}`}>
                                    {termsChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                                </div>
                                <div className="text-xs text-slate-600 leading-snug select-none">
                                    I accept the <span className="font-bold text-slate-800">Terms and Conditions</span>.
                                </div>
                             </div>
                             {!termsChecked && (
                                 <p className="text-[10px] text-red-500 mt-1 pl-1 flex items-center gap-1">
                                     <AlertCircle size={10} /> You must accept the terms.
                                 </p>
                             )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !termsChecked}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (activeTab === 'LOGIN' ? 'Log In' : 'Create Account')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                            <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider"><span className="bg-white px-2 text-slate-400">Or</span></div>
                        </div>

                        <button 
                            onClick={handleGuest}
                            disabled={!termsChecked}
                            className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue as Guest
                        </button>
                    </div>
                </div>
            </div>
            
            <p className="mt-8 text-xs text-slate-400">
                © 2024 CommuteWise. Barangay Tandang Sora Pilot.
            </p>
        </div>
    );
};