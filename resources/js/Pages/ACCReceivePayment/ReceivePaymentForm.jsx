import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner, faSave, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';

const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
};

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

export default function ReceivePaymentForm({ receivedPayment = null, facilities }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        transdate: receivedPayment?.transdate ? new Date(receivedPayment.transdate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        facilityoption_id: receivedPayment?.facilityoption_id || '',
        payer_id: receivedPayment?.payer_id || null,
        payer_type: receivedPayment?.payer_type || null,
        payment_method: receivedPayment?.payment_method || 'Bank Deposit',
        reference_number: receivedPayment?.reference_number || '',
        currency: receivedPayment?.currency || 'TZS',
        description: receivedPayment?.description || '',
        items: receivedPayment?.items || [],
        total_amount: receivedPayment?.total_amount || 0,
        document_rows: [{ id: Date.now(), file: null, description: 'Deposit Slip' }],
        documents_to_delete: [],
        _method: receivedPayment ? 'PUT' : 'POST'
    });

    const [items, setItems] = useState(data.items);
    const [payerSearch, setPayerSearch] = useState(receivedPayment?.payer?.display_name || '');
    const [payerResults, setPayerResults] = useState([]);
    const [showPayerDD, setShowPayerDD] = useState(false);
    const [receivableSearch, setReceivableSearch] = useState('');
    const [receivableResults, setReceivableResults] = useState([]);
    const [showReceivableDD, setShowReceivableDD] = useState(false);

    const payerDropdownRef = useRef(null);
    const receivableDropdownRef = useRef(null);
    useClickOutside(payerDropdownRef, () => setShowPayerDD(false));
    useClickOutside(receivableDropdownRef, () => setShowReceivableDD(false));

    useEffect(() => setData('items', items), [items]);
    useEffect(() => {
        const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        if(data.total_amount !== total) setData('total_amount', total);
    }, [items]);

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
        if (data.payer_id && payerSearch === receivedPayment?.payer?.display_name) return;
        debouncedPayers(payerSearch);
    }, [payerSearch]);

    useEffect(() => debouncedReceivables(receivableSearch), [receivableSearch]);

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

    const handleAddDocumentRow = () => setData('document_rows', [...data.document_rows, { id: Date.now(), file: null, description: '' }]);
    const handleRemoveDocumentRow = (id) => setData('document_rows', data.document_rows.filter(row => row.id !== id));
    const handleNewDocumentChange = (id, field, value) => {
        setData('document_rows', data.document_rows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };
    const removeExistingDoc = (docId) => setData('documents_to_delete', [...data.documents_to_delete, docId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const url = receivedPayment ? route('accounting0.update', receivedPayment.id) : route('accounting0.store');
        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                if (!receivedPayment) {
                    reset();
                    setData('document_rows', [{ id: Date.now(), file: null, description: 'Deposit Slip' }]);
                }
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <section className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium">Date Received</label><input type="date" value={data.transdate} onChange={e=>setData('transdate',e.target.value)} className="mt-1 w-full rounded-md border-gray-300"/>{errors.transdate&&<p className="text-red-500 text-xs mt-1">{errors.transdate}</p>}</div>
                <div><label className="block text-sm font-medium">Facility</label><select value={data.facilityoption_id} onChange={e=>setData('facilityoption_id',e.target.value)} className="mt-1 w-full rounded-md border-gray-300"><option value="">Select...</option>{facilities.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>{errors.facilityoption_id&&<p className="text-red-500 text-xs mt-1">{errors.facilityoption_id}</p>}</div>
                <div ref={payerDropdownRef} className="relative"><label className="block text-sm font-medium">Received From (Payer)</label><input type="text" placeholder="Search customer..." value={payerSearch} onChange={e=>{setPayerSearch(e.target.value);setShowPayerDD(true);if(data.payer_id)setData(d=>({...d,payer_id:null,payer_type:null}))}} className="mt-1 w-full rounded-md border-gray-300"/>{showPayerDD&&payerResults.length>0&&<ul className="absolute z-10 w-full bg-white border shadow-lg max-h-60 overflow-y-auto">{payerResults.map(p=><li key={p.id} onClick={()=>selectPayer(p)} className="p-2 hover:bg-gray-100 cursor-pointer">{p.name}</li>)}</ul>}{errors.payer_id&&<p className="text-red-500 text-xs mt-1">{errors.payer_id}</p>}</div>
                <div><label className="block text-sm font-medium">Payment Method</label><input type="text" value={data.payment_method} onChange={e=>setData('payment_method',e.target.value)} className="mt-1 w-full rounded-md border-gray-300"/></div>
                <div><label className="block text-sm font-medium">Reference #</label><input type="text" value={data.reference_number} onChange={e=>setData('reference_number',e.target.value)} className="mt-1 w-full rounded-md border-gray-300"/></div>
                <div className="md:col-span-3"><label className="block text-sm font-medium">Description/Memo</label><textarea value={data.description} onChange={e=>setData('description',e.target.value)} className="mt-1 w-full rounded-md border-gray-300" rows="2"></textarea></div>
            </section>

            <section className="p-4 border rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">Apply Payment to Accounts</h3>
                <div className="overflow-x-auto"><table className="w-full">
                    <thead><tr><th className="text-left py-2 font-medium text-sm text-gray-600">Account</th><th className="w-40 text-left py-2 px-2 font-medium text-sm text-gray-600">Amount</th><th className="text-left py-2 px-2 font-medium text-sm text-gray-600">Description</th><th className="w-12"></th></tr></thead>
                    <tbody>{items.map((item, index) => (<tr key={item.id||`new-${index}`}><td className="pr-2 py-1 text-sm">{item.receivable?.account_name||'Selected Account'}</td><td className="px-2 py-1"><input type="number" step="0.01" placeholder="0.00" value={item.amount} onChange={e=>handleItemChange(index,'amount',e.target.value)} className="w-full rounded-md border-gray-300 text-sm"/></td><td className="px-2 py-1"><input type="text" placeholder="Optional" value={item.description} onChange={e=>handleItemChange(index,'description',e.target.value)} className="w-full rounded-md border-gray-300 text-sm"/></td><td className="text-center"><button type="button" onClick={()=>removeItem(index)}><FontAwesomeIcon icon={faTrash} className="text-red-500 hover:text-red-700"/></button></td></tr>))}</tbody>
                </table></div>
                <div ref={receivableDropdownRef} className="relative"><input type="text" placeholder="Search for an Account to add..." value={receivableSearch} onChange={e=>{setReceivableSearch(e.target.value);setShowReceivableDD(true)}} className="w-full rounded-md border-gray-300"/>{showReceivableDD&&receivableResults.length>0&&<ul className="absolute z-10 w-full bg-white border shadow-lg max-h-48 overflow-y-auto">{receivableResults.map(r=><li key={r.id} onClick={()=>addItem(r)} className="p-2 text-sm hover:bg-gray-100 cursor-pointer">{r.name}</li>)}</ul>}</div>
            </section>

            <section className="p-4 border rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">Attach Documents</h3>
                {receivedPayment?.documents && receivedPayment.documents.length > 0 && (<div className="mt-2"><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Current Documents</h4><ul className="text-sm space-y-1">{receivedPayment.documents.filter(d => !data.documents_to_delete.includes(d.id)).map(doc => (<li key={doc.id} className="flex justify-between items-center p-2 rounded-md bg-gray-50"><a href={`/storage/${doc.url}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{doc.filename} ({doc.description})</a><button type="button" onClick={()=>removeExistingDoc(doc.id)} className="text-red-500 hover:text-red-700 ml-4"><FontAwesomeIcon icon={faTimes} title="Mark for deletion"/></button></li>))} {receivedPayment.documents.filter(d => data.documents_to_delete.includes(d.id)).map(doc => (<li key={doc.id} className="flex justify-between items-center p-2 rounded-md bg-red-50 text-gray-400 line-through"><span>{doc.filename} (Marked for deletion)</span></li>))} </ul></div>)}
                <div className="mt-4"><h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add New Documents</h4><div className="space-y-3">{data.document_rows.map((row) => (<div key={row.id} className="flex items-center gap-3 p-2 border rounded-md"><input type="file" onChange={e=>handleNewDocumentChange(row.id, 'file', e.target.files[0])} className="flex-grow text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/><input type="text" placeholder="Description (e.g., Deposit Slip)" value={row.description} onChange={e=>handleNewDocumentChange(row.id, 'description', e.target.value)} className="w-1/3 rounded-md border-gray-300 text-sm"/>{data.document_rows.length>1&&(<button type="button" onClick={()=>handleRemoveDocumentRow(row.id)} className="text-gray-400 hover:text-red-600"><FontAwesomeIcon icon={faTrash}/></button>)}</div>))}</div></div>
                {errors.document_rows && <p className="text-red-500 text-xs mt-1">Please check your document uploads. A description is required if a file is attached.</p>}
                <button type="button" onClick={handleAddDocumentRow} className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"><FontAwesomeIcon icon={faPlus}/> Add Another Document</button>
            </section>

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