// resources/js/Components/SelectInput.jsx
import React from 'react';

export default function SelectInput({
    id,
    label,
    name,      // Added name for form submission
    error,
    className = '',
    children,  // To pass <option> elements
    required,
    value,
    onChange,
    disabled,
    ...props   // For any other native select attributes
}) {
    const baseClasses = "mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm";
    const errorClasses = error ? 'border-red-500' : '';

    return (
        <div>
            {label && (
                <label htmlFor={id || name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <select
                id={id || name}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                {...props}
                className={`${baseClasses} ${errorClasses} ${className}`}
            >
                {children}
            </select>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}