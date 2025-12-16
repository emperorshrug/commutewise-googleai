import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, X, AlertTriangle, MapPin, MessageSquare, Car, Bug, Info } from 'lucide-react';
import { useStore } from '../store/useStore';

export const ReportIssue: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get('type');
    
    const user = useStore(state => state.user);
    
    const [title, setTitle] = useState('');
    const [type, setType] = useState<string>(initialType || 'TRAFFIC');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const REPORT_TYPES = [
        { id: 'TRAFFIC', label: 'Traffic', icon: Car, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
        { id: 'INCIDENT', label: 'Incident', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        { id: 'TERMINAL', label: 'Terminal', icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
        { id: 'MAP_ISSUE', label: 'Map Issue', icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
        { id: 'BUG', label: 'App Bug', icon: Bug, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
        { id: 'FEEDBACK', label: 'Feedback', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    ];

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        setError(null);
        const newImages: File[] = [];
        const newPreviews: string[] = [];

        // VALIDATION
        if (images.length + files.length > 3) {
            setError("You can only upload up to 3 images.");
            return;
        }

        Array.from(files).forEach((file: File) => {
            if (file.size > 5 * 1024 * 1024) { // 5MB Limit
                setError(`Image "${file.name}" exceeds the 5MB limit.`);
                return;
            }
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                setError(`Image "${file.name}" must be JPG or PNG.`);
                return;
            }
            
            newImages.push(file);
            newPreviews.push(URL.createObjectURL(file));
        });

        setImages([...images, ...newImages]);
        setPreviewUrls([...previewUrls, ...newPreviews]);
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        const newPreviews = [...previewUrls];
        
        URL.revokeObjectURL(newPreviews[index]); // Cleanup memory
        newImages.splice(index, 1);
        newPreviews.splice(index, 1);
        
        setImages(newImages);
        setPreviewUrls(newPreviews);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            alert("You must be logged in to submit a report.");
            navigate('/auth');
            return;
        }

        setIsSubmitting(true);
        
        // SIMULATE API CALL
        setTimeout(() => {
            console.log({
                title,
                type,
                description,
                images: images.map(f => f.name)
            });
            alert("Report submitted successfully! Thank you for your contribution.");
            navigate('/');
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* HEADER */}
            <div className="bg-white p-4 shadow-sm border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="font-bold text-lg text-slate-800">New Community Marker</h1>
            </div>

            {/* FORM CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* TITLE */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title</label>
                        <input 
                            type="text" 
                            required
                            placeholder="Brief summary of the issue"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                        />
                    </div>

                    {/* TYPE SELECTION */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Category</label>
                        <div className="grid grid-cols-2 gap-3">
                            {REPORT_TYPES.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setType(t.id)}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                        type === t.id 
                                        ? `${t.bg} ${t.border} ring-2 ring-offset-1 ring-blue-500` 
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <t.icon size={24} className={t.color} />
                                    <span className={`text-xs font-bold ${type === t.id ? 'text-slate-800' : 'text-slate-500'}`}>
                                        {t.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                        <textarea 
                            required
                            rows={4}
                            placeholder="Please describe the details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                        />
                    </div>

                    {/* IMAGE UPLOAD */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                            Attachments ({images.length}/3)
                        </label>
                        
                        {error && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex items-center gap-2">
                                <AlertTriangle size={14} /> {error}
                            </div>
                        )}

                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {/* PREVIEW IMAGES */}
                            {previewUrls.map((url, idx) => (
                                <div key={idx} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 group">
                                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}

                            {/* ADD BUTTON */}
                            {images.length < 3 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                    <Camera size={24} />
                                    <span className="text-[10px] font-bold mt-1">Add Photo</span>
                                </button>
                            )}
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/png, image/jpeg" 
                            multiple 
                            hidden 
                        />
                        <p className="text-[10px] text-slate-400 mt-2">
                            Max 3 images. 5MB limit per file. JPG/PNG only.
                        </p>
                    </div>
                </form>
            </div>

            {/* SUBMIT FOOTER */}
            <div className="p-4 bg-white border-t border-slate-200">
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !title || !description}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Submit Report'}
                </button>
            </div>
        </div>
    );
};

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);