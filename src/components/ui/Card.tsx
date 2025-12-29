import React, { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({
        variant = 'default',
        hover = false,
        padding = 'md',
        className = '',
        children,
        ...props
    }, ref) => {
        const baseStyles = 'rounded-2xl transition-all duration-200';

        const variants = {
            default: 'bg-white border border-slate-200 shadow-sm',
            elevated: 'bg-white shadow-lg border border-slate-100',
            outlined: 'bg-transparent border-2 border-slate-300',
            glass: 'glass shadow-md'
        };

        const paddings = {
            none: '',
            sm: 'p-4',
            md: 'p-6',
            lg: 'p-8'
        };

        const hoverClass = hover ? 'hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 cursor-pointer' : '';

        return (
            <div
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverClass} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export default Card;
