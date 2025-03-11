import React from 'react';

const Modal = ({ isOpen, onClose, onConfirm, title, message, isAlert = false, children, confirmButtonText = "Confirm", confirmButtonDisabled = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">{title}</h2>
                {children}
                <p className="mb-4">{message}</p>
                <div className="flex justify-end space-x-4 mt-4">
                    {!isAlert &&
                        <button onClick={onClose} className="bg-gray-300 text-gray-700 rounded p-2">
                            Cancel
                        </button>
                    }
                    <button
                        onClick={onConfirm}
                        className={`rounded p-2 ${isAlert ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}
                        disabled={confirmButtonDisabled}
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;

