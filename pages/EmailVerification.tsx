import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, ArrowRight } from 'lucide-react';

export const EmailVerification: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8 text-center animate-in zoom-in-95 duration-500">
                
                <div className="w-20 h-20 bg-blue-50 rounded-full mx-auto mb-6 flex items-center justify-center relative">
                    <Mail size={36} className="text-blue-600" />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-4 border-white">
                        <CheckCircle size={16} className="text-white" />
                    </div>
                </div>

                <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Verify your Email</h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    We've sent a verification link to your email address. Please check your inbox (and spam folder) and click the link to activate your account.
                </p>

                <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">
                        Once verified, you can log in to access all CommuteWise features.
                    </p>
                </div>

                <button 
                    onClick={() => navigate('/auth')}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center gap-2"
                >
                    Return to Login <ArrowRight size={18} />
                </button>

                <p className="mt-6 text-[10px] text-slate-400">
                    Did not receive an email? Check your spam folder or try registering again.
                </p>
            </div>
            
            <p className="mt-8 text-xs text-slate-400">
                © 2024 CommuteWise. Barangay Tandang Sora Pilot.
            </p>
        </div>
    );
};