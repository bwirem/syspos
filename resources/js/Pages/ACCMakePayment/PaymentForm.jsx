import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner, faSave, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';

// Debounce utility
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
            if (!ref.current || ref.current.contains(event.target)) return;
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);
};

export default function PaymentForm({ payment = null, readOnly = false }) { 
    
    const getInitialItems = () => {
        if (payment?.items && payment.items.length > 0) {
            return payment.items;
        }
        return [{ ui_key: `new_${Date.now()}`, amount: '', description: '' }];
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        transdate: payment?.transdate ? new Date(payment.transdate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        recipient_id: payment?.recipient_id || null,
        recipient_type: payment?.recipient_type || null,
        currency: payment?.currency || 'TZS',
        description: payment?.description || '',
        items: getInitialItems(),
        total_amount: payment?.total_amount || 0,
        document_rows: [{ id: Date.now(), file: null, description: 'Invoice' }],
        documents_to_delete: [],
        _method: payment ? 'PUT' : 'POST',
    });

    const [recipientSearch, setRecipientSearch] = useState(payment?.recipient?.display_name || '');
    const [recipientResults, setRecipientResults] = useState([]);
    const [showRecipientDD, setShowRecipientDD] = useState(false);
    
    const recipientDropdownRef = useRef(null);
    useClickOutside(recipientDropdownRef, () => setShowRecipientDD(false));

    useEffect(() => {
        const total = data.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        if (data.total_amount !== total) {
            setData('total_amount', total);
        }
    }, [data.items]);

    const fetchRecipients = (query) => {
        if (!query) { setRecipientResults([]); return; }
        axios.get(route('accounting1.search.recipients', { query })).then(res => setRecipientResults(res.data.data));
    };
    const debouncedFetchRecipients = useMemo(() => debounce(fetchRecipients, 300), []);
    useEffect(() => {
        if (data.recipient_id && recipientSearch === payment?.recipient?.display_name) return;
        debouncedFetchRecipients(recipientSearch);
    }, [recipientSearch]);

    const selectRecipient = (recipient) => {
        setData({ ...data, recipient_id: recipient.id, recipient_type: recipient.type });
        setRecipientSearch(recipient.name);
        setShowRecipientDD(false);
    };

    const addPaymentItem = () => {
        setData('items', [...data.items, { ui_key: `new_${Date.now()}`, amount: '', description: '' }]);
    };

    const handleItemChange = (index, field, value) => {
        setData('items', data.items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const removeItem = (index) => {
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const handleAddDocumentRow = () => setData('document_rows', [...data.document_rows, { id: Date.now(), file: null, description: '' }]);
    const handleRemoveDocumentRow = (id) => setData('document_rows', data.document_rows.filter(row => row.id !== id));
    const handleNewDocumentChange = (id, field, value) => {
        setData('document_rows', data.document_rows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };
    const removeExistingDoc = (docId) => setData('documents_to_delete', [...data.documents_to_delete, docId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (readOnly) return;
        const url = payment ? route('accounting1.update', payment.id) : route('accounting1.store');
        
        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                if (!payment) {
                    reset();
                    setData('items', [{ ui_key: `new_${Date.now()}`, amount: '', description: '' }]);
                }
            },
        });
    };

    return (
        // --- THIS IS THE CRITICAL FIX ---
        // The `pointer-events-none` class has been removed to ensure links inside the form remain clickable.
        <form onSubmit={handleSubmit} className={`space-y-6 ${readOnly ? 'opacity-75' : ''}`}>
            <section className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">Transaction Date</label><input type="date" value={data.transdate} disabled={readOnly} onChange={e=>setData('transdate',e.target.value)} className="mt-1 w-full rounded-md border-gray-300 disabled:bg-gray-100"/>{errors.transdate&&<p className="text-red-500 text-xs mt-1">{errors.transdate}</p>}</div>
                
                <div ref={recipientDropdownRef} className="relative"><label className="block text-sm font-medium">Recipient</label><input type="text" placeholder="Search supplier..." value={recipientSearch} disabled={readOnly} onChange={e=>{setRecipientSearch(e.target.value);setShowRecipientDD(true);if(data.recipient_id)setData('recipient_id',null)}} className="mt-1 w-full rounded-md border-gray-300 disabled:bg-gray-100"/>{showRecipientDD&&!readOnly&&recipientResults.length>0&&<ul className="absolute z-10 w-full bg-white border shadow-lg max-h-60 overflow-y-auto">{recipientResults.map(r=><li key={r.id} onClick={()=>selectRecipient(r)} className="p-2 hover:bg-gray-100 cursor-pointer">{r.name}</li>)}</ul>}{errors.recipient_id&&<p className="text-red-500 text-xs mt-1">{errors.recipient_id}</p>}</div>
                
                <div className="md:col-span-2"><label className="block text-sm font-medium">Description/Memo</label><textarea value={data.description} disabled={readOnly} onChange={e=>setData('description',e.target.value)} className="mt-1 w-full rounded-md border-gray-300 disabled:bg-gray-100" rows="2"></textarea></div>
            </section>

            <section className="p-4 border rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">Payment Items</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr><th className="w-40 text-left py-2 px-2 font-medium text-sm text-gray-600">Amount</th><th className="text-left py-2 px-2 font-medium text-sm text-gray-600">Description</th>{!readOnly && <th className="w-12"></th>}</tr></thead>
                        <tbody>
                            {data.items.map((item, index) => (
                                <tr key={item.id || item.ui_key}>
                                    <td className="px-2 py-1"><input type="number" step="0.01" placeholder="0.00" value={item.amount} disabled={readOnly} onChange={e => handleItemChange(index, 'amount', e.target.value)} className="w-full rounded-md border-gray-300 text-sm disabled:bg-gray-100"/></td>
                                    <td className="px-2 py-1"><input type="text" placeholder="e.g., Payment for Invoice #123" value={item.description} disabled={readOnly} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full rounded-md border-gray-300 text-sm disabled:bg-gray-100"/></td>
                                    {!readOnly && <td className="text-center"><button type="button" onClick={() => removeItem(index)}><FontAwesomeIcon icon={faTrash} className="text-red-500 hover:text-red-700"/></button></td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {!readOnly && <button type="button" onClick={addPaymentItem} className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faPlus}/> Add Line</button>}
            </section>

            <section className="p-4 border rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">Attach Documents</h3>
                {payment?.documents && payment.documents.length > 0 && (<div className="mt-2"><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Current Documents</h4><ul className="text-sm space-y-1">{payment.documents.filter(d => !data.documents_to_delete.includes(d.id)).map(doc => (<li key={doc.id} className="flex justify-between items-center p-2 rounded-md bg-gray-50"><a href={`/storage/${doc.url}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{doc.filename} ({doc.description})</a>{!readOnly && <button type="button" onClick={()=>removeExistingDoc(doc.id)} className="text-red-500 hover:text-red-700 ml-4"><FontAwesomeIcon icon={faTimes} title="Mark for deletion"/></button>}</li>))} {payment.documents.filter(d => data.documents_to_delete.includes(d.id)).map(doc => (<li key={doc.id} className="flex justify-between items-center p-2 rounded-md bg-red-50 text-gray-400 line-through"><span>{doc.filename} (Marked for deletion)</span></li>))} </ul></div>)}
                {!readOnly && (<>
                    <div className="mt-4"><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add New Documents</h4><div className="space-y-3">{data.document_rows.map((row) => (<div key={row.id} className="flex items-center gap-3 p-2 border rounded-md"><input type="file" onChange={e=>handleNewDocumentChange(row.id, 'file', e.target.files[0])} className="flex-grow text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/><input type="text" placeholder="Description (e.g., Invoice, Delivery Note)" value={row.description} onChange={e=>handleNewDocumentChange(row.id, 'description', e.target.value)} className="w-1/3 rounded-md border-gray-300 text-sm"/>{data.document_rows.length>1&&(<button type="button" onClick={()=>handleRemoveDocumentRow(row.id)} className="text-gray-400 hover:text-red-600"><FontAwesomeIcon icon={faTrash}/></button>)}</div>))}</div></div>
                    {errors.document_rows && <p className="text-red-500 text-xs mt-1">Please check your document uploads. A description is required if a file is attached.</p>}
                    <button type="button" onClick={handleAddDocumentRow} className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faPlus}/> Add Another Document</button>
                </>)}
            </section>
            
            <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-2xl font-bold text-gray-800">Total: {parseFloat(data.total_amount || 0).toLocaleString()} {data.currency}</div>
                <div className="flex items-center gap-4">
                    <Link href={route('accounting1.index')} className="text-gray-700 hover:text-gray-900 font-medium">
                        {readOnly ? 'Back to List' : 'Cancel'}
                    </Link>
                    {!readOnly && (
                        <button type="submit" disabled={processing} className="px-6 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 font-semibold disabled:bg-blue-300">
                            {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
                            {payment ? 'Update Payment' : 'Save Payment'}
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}