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

export default function ReceivePaymentForm({ receivedPayment = null, facilities }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        transdate: receivedPayment?.transdate ? new Date(receivedPayment.transdate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        facilityoption_id: receivedPayment?.facilityoption_id || '',
        payer_id: receivedPayment?.payer_id || null,
        payer_type: receivedPayment?.payer_type || null,
        payment_method: receivedPayment?.payment_method || 'Bank Deposit',
        reference_number: receivedPayment?.reference_number || '',
        currency: receivedPayment?.currency || 'TZS',
        items: receivedPayment?.items || [],
        total_amount: receivedPayment?.total_amount || 0,
        documents: [],
        documents_to_delete: [],
        _method: receivedPayment ? 'PUT' : 'POST'
    });

    // --- Local UI State ---
    const [items, setItems] = useState(data.items);
    // CRITICAL FIX: Initialize with `display_name` for edit mode
    const [payerSearch, setPayerSearch] = useState(receivedPayment?.payer?.display_name || '');
    const [payerResults, setPayerResults] = useState([]);
    const [showPayerDD, setShowPayerDD] = useState(false);
    const [receivableSearch, setReceivableSearch] = useState('');
    const [receivableResults, setReceivableResults] = useState([]);
    const [showReceivableDD, setShowReceivableDD] = useState(false);

    // --- Refs for Click Outside ---
    const payerDropdownRef = useRef(null);
    const receivableDropdownRef = useRef(null);
    useClickOutside(payerDropdownRef, () => setShowPayerDD(false));
    useClickOutside(receivableDropdownRef, () => setShowReceivableDD(false));

    // --- Effects to sync local state with form data ---
    useEffect(() => {
        const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        setData(prev => ({ ...prev, items, total_amount: total }));
    }, [items]);

    // --- API Calls for searching ---
    const fetchPayers = (q) => {
        if (!q) { setPayerResults([]); return; }
        axios.get(route('accounting0.search.payers', { query: q })).then(res => setPayerResults(res.data.data));
    };
    const fetchReceivables = (q) => {
        if (!q) { setReceivableResults([]); return; }
        axios.get(route('accounting0.search.receivables', { query: q })).then(res => setReceivableResults(res.data.data));
    };

    const debouncedPayers = useMemo(() => debounce(fetchPayers, 300), []);
    const debouncedReceivables = useMemo(() => debounce(fetchReceivables, 300), []);

    useEffect(() => {
        if (data.payer_id && payerSearch === receivedPayment?.payer?.display_name) {
            return; // Don't search if the initial value is loaded
        }
        debouncedPayers(payerSearch);
    }, [payerSearch]);

    useEffect(() => debouncedReceivables(receivableSearch), [receivableSearch]);

    // --- UI Handlers ---
    const selectPayer = (p) => {
        setData(prev => ({ ...prev, payer_id: p.id, payer_type: p.type }));
        setPayerSearch(p.name);
        setShowPayerDD(false);
    };

    const addItem = (receivable) => {
        setItems(prev => [...prev, {
            receivable_id: receivable.id, receivable_type: receivable.type,
            receivable: { account_name: receivable.name },
            amount: '', description: ''
        }]);
        setReceivableSearch('');
        setShowReceivableDD(false);
    };

    const handleItemChange = (index, field, value) => setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleFileChange = (e) => setData('documents', Array.from(e.target.files));
    const removeExistingDoc = (docId) => setData('documents_to_delete', [...data.documents_to_delete, docId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const url = receivedPayment ? route('accounting0.update', receivedPayment.id) : route('accounting0.store');
        post(url, {
            preserveScroll: true,
            onSuccess: () => !receivedPayment && reset(),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Section */}
            <section className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date Received</label>
                    <input type="date" value={data.transdate} onChange={e => setData('transdate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300"/>
                    {errors.transdate && <p className="text-red-500 text-xs mt-1">{errors.transdate}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Facility</label>
                    <select value={data.facilityoption_id} onChange={e => setData('facilityoption_id', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300">
                        <option value="">Select...</option>
                        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {errors.facilityoption_id && <p className="text-red-500 text-xs mt-1">{errors.facilityoption_id}</p>}
                </div>
                <div className="relative" ref={payerDropdownRef}>
                    <label className="block text-sm font-medium text-gray-700">Received From (Payer)</label>
                    <input type="text" placeholder="Search customer..." value={payerSearch}
                        onChange={e => {
                            setPayerSearch(e.target.value);
                            setShowPayerDD(true);
                            if (data.payer_id) setData(prev => ({...prev, payer_id: null, payer_type: null}));
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300"
                    />
                    {showPayerDD && payerResults.length > 0 && (
                        <ul className="absolute z-20 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                            {payerResults.map(p => <li key={p.id} onClick={() => selectPayer(p)} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">{p.name}</li>)}
                        </ul>
                    )}
                    {errors.payer_id && <p className="text-red-500 text-xs mt-1">Please select a payer from the list.</p>}
                </div>
            </section>

            {/* Items Section */}
            <section className="p-4 border rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">Apply Payment to Accounts</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr><th className="text-left py-2 font-medium text-sm text-gray-600">Account</th><th className="w-40 text-left py-2 px-2 font-medium text-sm text-gray-600">Amount</th><th className="text-left py-2 px-2 font-medium text-sm text-gray-600">Description</th><th className="w-12"></th></tr></thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="pr-2 py-1 text-sm">{item.receivable?.account_name || 'Selected Account'}</td>
                                    <td className="px-2 py-1"><input type="number" step="0.01" placeholder="0.00" value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} className="w-full rounded-md border-gray-300 text-sm"/></td>
                                    <td className="px-2 py-1"><input type="text" placeholder="Optional" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full rounded-md border-gray-300 text-sm"/></td>
                                    <td className="text-center"><button type="button" onClick={() => removeItem(index)}><FontAwesomeIcon icon={faTrash} className="text-red-500 hover:text-red-700"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="relative" ref={receivableDropdownRef}>
                    <input type="text" placeholder="Search for an Account to add..." value={receivableSearch} onChange={e => { setReceivableSearch(e.target.value); setShowReceivableDD(true); }} className="w-full rounded-md border-gray-300"/>
                    {showReceivableDD && receivableResults.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                            {receivableResults.map(r => <li key={r.id} onClick={() => addItem(r)} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">{r.name}</li>)}
                        </ul>
                    )}
                </div>
            </section>

             {/* Documents Section */}
             <section className="p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-700">Upload Documents</label>
                <input type="file" multiple onChange={handleFileChange} className="w-full mt-1 text-sm" />
                {receivedPayment?.documents && receivedPayment.documents.length > 0 && (
                    <ul className="mt-3 list-disc list-inside text-sm space-y-1">
                        {receivedPayment.documents.filter(d => !data.documents_to_delete.includes(d.id)).map(doc => (
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
                <div className="text-2xl font-bold text-gray-800">Total Received: {parseFloat(data.total_amount || 0).toLocaleString()} {data.currency}</div>
                <div className="flex items-center gap-4">
                    <Link href={route('accounting0.index')} className="text-gray-700 hover:text-gray-900 font-medium">Cancel</Link>
                    <button type="submit" disabled={processing} className="px-6 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 font-semibold disabled:bg-blue-300">
                        {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                        {receivedPayment ? 'Update Payment' : 'Save Payment'}
                    </button>
                </div>
            </div>
        </form>
    );
}