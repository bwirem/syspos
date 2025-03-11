// Components/CustomInputField.jsx
import React from 'react';

const InputField = ({ id, type, placeholder, value, onChange, onClick, readOnly, style, label, htmlFor }) => {

    if (type === 'file') {
        return (
            <div className="relative">
                {/* Label acts as the visible "button" */}
                <label
                    htmlFor={htmlFor} // Connects label to the hidden input
                    className="w-full border p-2 rounded text-sm cursor-pointer bg-gray-100" // Style as needed
                    style={style}
                    onClick={onClick} // Optional onClick, can be used for other actions
                >
                    {/* Display the filename (value) or the placeholder */}
                    {value || placeholder}
                </label>
                {/* The actual, hidden file input */}
                <input
                    id={id}         // Unique ID. MUST match the htmlFor of the label
                    type="file"
                    className="hidden" // Hide it visually
                    onChange={onChange} // onChange handler for file selection
                    // DO NOT set value={value} here.  Let the browser manage it.
                />
            </div>
        );
    }

    // For other input types (text, etc.), render a regular input
    return (
        <input
            id={id}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onClick={onClick}
            readOnly={readOnly}
            style={style}
            className="w-full border p-2 rounded text-sm"
        />
    );
};

export default InputField;