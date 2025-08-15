
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

// Debounce utility to prevent API calls on every keystroke
const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
};

// Custom hook to detect clicks outside a ref
const useClickOutside = (ref, handler) => {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);
};

export default function PaymentForm({ payment = null, facilities }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        transdate: payment?.transdate ? new Date(payment.transdate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        facilityoption_id: payment?.facilityoption_id || '',
        recipient_id: payment?.recipient_id || null,
        recipient_type: payment?.recipient_type || null,
        payment_method: payment?.payment_method || 'Bank Transfer',
        reference_number: payment?.reference_number || '',
        currency: payment?.currency || 'TZS',
        items: payment?.items || [],
        total_amount: payment?.total_amount || 0,
        documents: [], // For handling new file uploads
        documents_to_delete: [], // For marking existing files for deletion
        _method: payment ? 'PUT' : 'POST'
    });

    // --- Local UI State ---
    const [paymentItems, setPaymentItems] = useState(data.items);
    // CRITICAL FIX: Initialize with `display_name` for edit mode
    const [recipientSearch, setRecipientSearch] = useState(payment?.recipient?.display_name || '');
    const [recipientResults, setRecipientResults] = useState([]);
    const [showRecipientDD, setShowRecipientDD] = useState(false);
    const [payableSearch, setPayableSearch] = useState('');
    const [payableResults, setPayableResults] = useState([]);
    const [showPayableDD, setShowPayableDD] = useState(false);

    // --- Refs for Click Outside ---
    const recipientDropdownRef = useRef(null);
    const payableDropdownRef = useRef(null);
    useClickOutside(recipientDropdownRef, () => setShowRecipientDD(false));
    useClickOutside(payableDropdownRef, () => setShowPayableDD(false));

    // --- Effects to sync local state with form data ---
    useEffect(() => {
        const total = paymentItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setData(prev => ({ ...prev, items: paymentItems, total_amount: total }));
    }, [paymentItems]);

    // --- API Calls for searching ---
    const fetchRecipients = (query) => {
        if (!query) { setRecipientResults([]); return; }
        axios.get(route('accounting1.search.recipients', { query }))
             .then(res => setRecipientResults(res.data.data));
    };
    const fetchPayables = (query) => {
        if (!query) { setPayableResults([]); return; }
        axios.get(route('accounting1.search.payables', { query }))
             .then(res => setPayableResults(res.data.data));
    };

    const debouncedFetchRecipients = useMemo(() => debounce(fetchRecipients, 300), []);
    const debouncedFetchPayables = useMemo(() => debounce(fetchPayables, 300), []);

    useEffect(() => {
        if (data.recipient_id && recipientSearch === payment?.recipient?.display_name) {
            return; // Don't search if the initial value is loaded
        }
        debouncedFetchRecipients(recipientSearch);
    }, [recipientSearch]);

    useEffect(() => debouncedFetchPayables(payableSearch), [payableSearch]);

    // --- UI Handlers ---
    const selectRecipient = (recipient) => {
        setData(prev => ({ ...prev, recipient_id: recipient.id, recipient_type: recipient.type }));
        setRecipientSearch(recipient.name);
        setShowRecipientDD(false);
    };

    const addPayableItem = (payable) => {
        setPaymentItems(prev => [...prev, {
            payable_id: payable.id, payable_type: payable.type,
            payable: { account_name: payable.name },
            amount: '', description: ''
        }]);
        setPayableSearch('');
        setShowPayableDD(false);
    };

    const handleItemChange = (index, field, value) => setPaymentItems(paymentItems.map((item, i) => i === index ? { ...item, [field]: value } : item));
    const removeItem = (index) => setPaymentItems(items => items.filter((_, i) => i !== index));

    const handleFileChange = (e) => setData('documents', Array.from(e.target.files));
    const removeExistingDoc = (docId) => setData('documents_to_delete', [...data.documents_to_delete, docId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const url = payment ? route('accounting1.update', payment.id) : route('accounting1.store');
        // Always use `post` for forms with file uploads, even for updates.
        post(url, {
            preserveScroll: true,
            onSuccess: () => !payment && reset(),
            onError: (errs) => console.error(errs),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Section */}
            <section className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Transaction Date</label>
                    <input type="date" value={data.transdate} onChange={e => setData('transdate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                    {errors.transdate && <p className="text-red-500 text-xs mt-1">{errors.transdate}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Facility</label>
                    <select value={data.facilityoption_id} onChange={e => setData('facilityoption_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="">Select Facility...</option>
                        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {errors.facilityoption_id && <p className="text-red-500 text-xs mt-1">{errors.facilityoption_id}</p>}
                </div>
                <div className="relative" ref={recipientDropdownRef}>
                    <label className="block text-sm font-medium text-gray-700">Recipient</label>
                    <input type="text" placeholder="Search for a supplier..." value={recipientSearch}
                        onChange={e => {
                            setRecipientSearch(e.target.value);
                            setShowRecipientDD(true);
                            if (data.recipient_id) setData(prev => ({...prev, recipient_id: null, recipient_type: null}));
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                    {showRecipientDD && recipientResults.length > 0 && (
                         <ul className="absolute z-20 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                           {recipientResults.map(r => <li key={r.id} onClick={() => selectRecipient(r)} className="p-2 hover:bg-gray-100 cursor-pointer">{r.name}</li>)}
                         </ul>
                    )}
                    {errors.recipient_id && <p className="text-red-500 text-xs mt-1">Please select a recipient from the list.</p>}
                </div>
            </section>

            {/* Items Section */}
            <section className="p-4 border rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">Payment Items</h3>
                <div className="overflow-x-auto"><table className="w-full">
                    <thead><tr><th className="text-left py-2 font-medium text-sm text-gray-600">Account</th><th className="w-40 text-left py-2 px-2 font-medium text-sm text-gray-600">Amount</th><th className="text-left py-2 px-2 font-medium text-sm text-gray-600">Description</th><th className="w-12"></th></tr></thead>
                    <tbody>
                        {paymentItems.map((item, index) => (
                            <tr key={index}>
                                <td className="pr-2 py-1 text-sm">{item.payable?.account_name || 'Selected Account'}</td>
                                <td className="px-2 py-1"><input type="number" step="0.01" placeholder="0.00" value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} className="w-full rounded-md border-gray-300 text-sm"/></td>
                                <td className="px-2 py-1"><input type="text" placeholder="Optional" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full rounded-md border-gray-300 text-sm"/></td>
                                <td className="text-center"><button type="button" onClick={() => removeItem(index)}><FontAwesomeIcon icon={faTrash} className="text-red-500 hover:text-red-700"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table></div>
                <div className="relative" ref={payableDropdownRef}>
                    <input type="text" placeholder="Search for an Account to add..." value={payableSearch} onChange={e => { setPayableSearch(e.target.value); setShowPayableDD(true); }} className="w-full rounded-md border-gray-300"/>
                    {showPayableDD && payableResults.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                            {payableResults.map(p=><li key={p.id} onClick={()=>addPayableItem(p)} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">{p.name}</li>)}
                        </ul>
                    )}
                </div>
            </section>

            {/* Documents Section */}
            <section className="p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-700">Upload Documents</label>
                <input type="file" multiple onChange={handleFileChange} className="w-full mt-1 text-sm" />
                {payment?.documents && payment.documents.length > 0 && (
                    <ul className="mt-3 list-disc list-inside text-sm space-y-1">
                        {payment.documents.filter(d => !data.documents_to_delete.includes(d.id)).map(doc => (
                            <li key={doc.id} className="flex justify-between items-center text-gray-600">
                                <a href={`/storage/${doc.url}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{doc.filename}</a>
                                <button type="button" onClick={() => removeExistingDoc(doc.id)} className="text-red-500 hover:text-red-700 ml-4"><FontAwesomeIcon icon={faTimes} title="Mark for deletion" /></button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Actions Footer */}
            <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-2xl font-bold text-gray-800">Total: {parseFloat(data.total_amount || 0).toLocaleString()} {data.currency}</div>
                <div className="flex items-center gap-4">
                    <Link href={route('accounting1.index')} className="text-gray-700 hover:text-gray-900 font-medium">Cancel</Link>
                    <button type="submit" disabled={processing} className="px-6 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 font-semibold disabled:bg-blue-300">
                        {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                        {payment ? 'Update Payment' : 'Save Payment'}
                    </button>
                </div>
            </div>
        </form>
    );
}