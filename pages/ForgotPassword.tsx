import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const navigate = useNavigate();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Updated to use window.location.origin explicitly.
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin, 
            });

            if (error) throw error;
            setSent(true);
        } catch (error: any) {
            alert(error.message || 'Error sending reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8">
                <button 
                    onClick={() => navigate('/auth')}
                    className="flex items-center gap-1 text-slate-400 hover:text-blue-600 mb-6 text-sm font-bold transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Login
                </button>

                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center text-blue-600">
                        <Mail size={28} />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Forgot Password?</h1>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                        Don't worry! Enter your email below and we'll send you instructions to reset your password.
                    </p>
                </div>

                {sent ? (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center animate-in zoom-in-95">
                        <div className="flex justify-center mb-3 text-green-600">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="font-bold text-green-800 mb-1">Check your email</h3>
                        <p className="text-sm text-green-700">
                            We have sent a password reset link to <span className="font-bold">{email}</span>
                        </p>
                        <button 
                            onClick={() => navigate('/auth')} 
                            className="mt-4 text-xs font-bold text-green-800 underline"
                        >
                            Return to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-black uppercase mb-1 ml-1">Email Address</label>
                            <input 
                                type="email" 
                                required 
                                placeholder="you@example.com"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-black font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
            <p className="mt-8 text-xs text-slate-400">
                © 2024 CommuteWise. Barangay Tandang Sora Pilot.
            </p>
        </div>
    );
};