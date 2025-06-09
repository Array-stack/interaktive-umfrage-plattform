import React from 'react';

interface LoaderProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'accent';
}

const Loader: React.FC<LoaderProps> = ({ 
  text = 'Wird geladen...', 
  className = '',
  size = 'md',
  variant = 'primary'
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-2',
    lg: 'h-16 w-16 border-3',
  };

  const variantClasses = {
    primary: 'border-primary',
    secondary: 'border-secondary',
    accent: 'border-accent',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-transparent ${variantClasses[variant]} mb-3`}></div>
      {text && <p className="text-neutral-dark font-medium">{text}</p>}
    </div>
  );
};

export default Loader;