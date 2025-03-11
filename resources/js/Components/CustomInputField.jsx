import React from 'react';

// Reusable Input Component
const InputField = ({ label, id, type, value, onChange, error, readOnly = false, className = '', autoComplete = '' }) => (
    <div className="flex-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
        </label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            className={`mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500' : ''} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            autocomplete={autoComplete}
        />
        {error && <p id={`${id}-error`} className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
);

export default InputField;