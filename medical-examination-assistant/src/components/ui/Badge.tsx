import React, { HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    dot?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({
        variant = 'default',
        size = 'md',
        dot = false,
        className = '',
        children,
        ...props
    }, ref) => {
        const baseStyles = 'inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap';

        const variants = {
            default: 'bg-slate-100 text-slate-700',
            success: 'bg-green-100 text-green-700',
            warning: 'bg-yellow-100 text-yellow-700',
            error: 'bg-red-100 text-red-700',
            info: 'bg-blue-100 text-blue-700',
            primary: 'bg-sky-100 text-sky-700',
            secondary: 'bg-teal-100 text-teal-700'
        };

        const sizes = {
            sm: 'px-2 py-0.5 text-xs',
            md: 'px-3 py-1 text-sm',
            lg: 'px-4 py-1.5 text-base'
        };

        const dotColors = {
            default: 'bg-slate-500',
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            primary: 'bg-sky-500',
            secondary: 'bg-teal-500'
        };

        return (
            <span
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                {...props}
            >
                {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}></span>}
                {children}
            </span>
        );
    }
);

Badge.displayName = 'Badge';

export default Badge;
