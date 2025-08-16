import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner, faSave, faPlus } from '@fortawesome/free-solid-svg-icons';

const debounce = (fn, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), delay); }; };

export default function JournalEntryForm({ journalEntry = null }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        entry_date: journalEntry?.entry_date ? new Date(journalEntry.entry_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference_number: journalEntry?.reference_number || '',
        description: journalEntry?.description || '',
        lines: journalEntry?.journal_entry_lines || [
            { id: 1, account_id: '', account_name: '', debit: '', credit: '' },
            { id: 2, account_id: '', account_name: '', debit: '', credit: '' },
        ],
    });

    const [accountSearch, setAccountSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [activeIndex, setActiveIndex] = useState(null);

    const totals = useMemo(() => {
        return data.lines.reduce((acc, line) => {
            acc.debit += parseFloat(line.debit) || 0;
            acc.credit += parseFloat(line.credit) || 0;
            return acc;
        }, { debit: 0, credit: 0 });
    }, [data.lines]);

    const isBalanced = useMemo(() => totals.debit > 0 && totals.debit.toFixed(2) === totals.credit.toFixed(2), [totals]);

    const fetchAccounts = (q) => q && axios.get(route('accounting2.search.accounts', { query: q })).then(res => setSearchResults(res.data.data));
    const debouncedFetch = useMemo(() => debounce(fetchAccounts, 300), []);

    useEffect(() => debouncedFetch(accountSearch), [accountSearch]);

    const handleLineChange = (index, field, value) => {
        const lines = [...data.lines];
        lines[index][field] = value;
        if (field === 'debit' && value) lines[index]['credit'] = '';
        if (field === 'credit' && value) lines[index]['debit'] = '';
        setData('lines', lines);
    };

    const addLine = () => setData('lines', [...data.lines, { id: Date.now(), account_id: '', account_name: '', debit: '', credit: '' }]);
    const removeLine = (index) => setData('lines', data.lines.filter((_, i) => i !== index));

    const selectAccount = (index, account) => {
        const lines = [...data.lines];
        lines[index]['account_id'] = account.id;
        lines[index]['account_name'] = `${account.account_name} (${account.account_code})`;
        setData('lines', lines);
        setActiveIndex(null);
        setSearchResults([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isBalanced) {
            alert('Debits must equal Credits and not be zero.');
            return;
        }
        if (journalEntry) {
            put(route('accounting2.update', journalEntry.id));
        } else {
            post(route('accounting2.store'), { onSuccess: () => reset() });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <section className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label>Entry Date</label><input type="date" value={data.entry_date} onChange={e=>setData('entry_date',e.target.value)} className="w-full mt-1"/>{errors.entry_date&&<p className="text-red-500 text-xs">{errors.entry_date}</p>}</div>
                <div><label>Reference #</label><input type="text" value={data.reference_number} onChange={e=>setData('reference_number',e.target.value)} className="w-full mt-1"/></div>
                <div className="md:col-span-3"><label>Description*</label><textarea value={data.description} onChange={e=>setData('description',e.target.value)} className="w-full mt-1" rows="2"></textarea>{errors.description&&<p className="text-red-500 text-xs">{errors.description}</p>}</div>
            </section>

            <section className="p-4 border rounded-lg space-y-4">
                <div className="overflow-x-auto"><table className="w-full">
                    <thead><tr><th className="w-2/5 text-left">Account</th><th className="w-1/4 text-left px-2">Debit</th><th className="w-1/4 text-left px-2">Credit</th><th className="w-auto"></th></tr></thead>
                    <tbody>{data.lines.map((line, index) => (
                        <tr key={line.id}>
                            <td className="pr-2 py-1 relative">
                                <input type="text" placeholder="Search account..." defaultValue={line.chart_of_account ? `${line.chart_of_account.account_name} (${line.chart_of_account.account_code})` : line.account_name}
                                    onChange={e => setAccountSearch(e.target.value)} onFocus={() => setActiveIndex(index)}
                                    className="w-full"/>
                                {activeIndex === index && searchResults.length > 0 && (<ul className="absolute z-10 w-full bg-white border max-h-48 overflow-y-auto">{searchResults.map(a=><li key={a.id} onClick={()=>selectAccount(index, a)} className="p-2 hover:bg-gray-100 cursor-pointer">{`${a.account_name} (${a.account_code})`}</li>)}</ul>)}
                                {errors[`lines.${index}.account_id`] && <p className="text-red-500 text-xs">Required</p>}
                            </td>
                            <td className="px-2 py-1"><input type="number" step="0.01" value={line.debit} onChange={e=>handleLineChange(index, 'debit', e.target.value)} className="w-full"/></td>
                            <td className="px-2 py-1"><input type="number" step="0.01" value={line.credit} onChange={e=>handleLineChange(index, 'credit', e.target.value)} className="w-full"/></td>
                            <td className="text-center"><button type="button" onClick={()=>removeLine(index)} disabled={data.lines.length <= 2} className="disabled:opacity-50"><FontAwesomeIcon icon={faTrash} className="text-red-500"/></button></td>
                        </tr>
                    ))}</tbody>
                    <tfoot>
                        <tr className="border-t-2 font-bold"><td className="py-2">Totals</td>
                            <td className="px-2 py-2">{totals.debit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className="px-2 py-2">{totals.credit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td><td></td></tr>
                    </tfoot>
                </table></div>
                {errors.lines && <p className="text-red-500 text-sm">{errors.lines}</p>}
                <button type="button" onClick={addLine} className="flex items-center gap-2 text-sm font-semibold text-blue-600"><FontAwesomeIcon icon={faPlus}/> Add Line</button>
            </section>

            <div className="flex justify-between items-center pt-4 border-t">
                <div className={`font-bold text-lg ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {isBalanced ? 'Balanced' : 'Out of Balance'}
                </div>
                <div className="flex items-center gap-4">
                    <Link href={route('accounting2.index')}>Cancel</Link>
                    <button type="submit" disabled={processing || !isBalanced} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded disabled:bg-gray-400">
                        {processing ? <FontAwesomeIcon icon={faSpinner} spin/> : <FontAwesomeIcon icon={faSave}/>} {journalEntry ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>
        </form>
    );
}