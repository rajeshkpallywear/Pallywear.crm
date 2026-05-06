import React from 'react';
import { cn } from '../lib/utils';
import { Layout } from 'lucide-react';

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
    inverted?: boolean;
}

export default function Logo({ className, iconOnly = false, inverted = false }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-3", className)}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform overflow-hidden relative group">
                <span className="text-white font-black text-xl tracking-tighter z-10">PW</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {!iconOnly && (
                <span className={cn(
                    "text-xl font-bold tracking-tight",
                    inverted ? "text-white" : "text-gray-900"
                )}>
                    Pallywear
                </span>
            )}
        </div>
    );
}
