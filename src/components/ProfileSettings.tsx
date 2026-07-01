import React, { useState, useRef } from 'react';
import { useAuth, User as UserType } from '../context/AuthContext';
import { Button } from './Button';
import { X, User, Camera, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function ProfileSettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { user, updateProfile } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [success, setSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Reduced limit to fit in Firestore document (1MB limit)
            if (file.size > 500 * 1024) {
                setErrorMessage('File size too large (max 500KB)');
                return;
            }
            setErrorMessage(null);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setLoading(true);
        try {
            await updateProfile({ name, avatar });
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Error updating profile: ', error);
            setErrorMessage(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 p-8"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Profile Settings</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {errorMessage && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errorMessage}
                                </div>
                            )}
                            <div className="flex flex-col items-center mb-6">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <img
                                        src={avatar || `https://ui-avatars.com/api/?name=${name}&background=3291B6&color=fff`}
                                        className="w-24 h-24 rounded-2xl object-cover border-4 border-brand-secondary shadow-lg"
                                        alt="Profile"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                        <Camera className="text-white w-6 h-6" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Click photo to upload</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-primary/10 transition-all font-medium text-sm"
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                    <Camera className="w-3.5 h-3.5" /> Avatar URL
                                </label>
                                <input
                                    type="text"
                                    value={avatar}
                                    onChange={(e) => setAvatar(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-primary/10 transition-all font-medium text-sm text-gray-500"
                                    placeholder="https://..."
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || success}
                                className={cn(
                                    "w-full h-11 transition-all duration-300",
                                    success ? "bg-green-500 hover:bg-green-500 shadow-green-200" : "shadow-brand-primary/20"
                                )}
                            >
                                {loading ? 'Updating...' : success ? <><Check className="w-4 h-4 mr-2" /> Updated</> : 'Save Changes'}
                            </Button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
