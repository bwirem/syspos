import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
import Pagination from '@/Components/Pagination'; // Assuming you have this
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faRedo, faEye, faHistory } from '@fortawesome/free-solid-svg-icons';

const formatCurrency = (amount, currencyCode = 'TZS') => { /* ... */ }; // Add your currency formatter

export default function PurchaseOrderHistory({ auth, purchaseOrders, suppliers, facilityOptions, filters, flash }) {
    const { data, setData, get, processing, errors, reset } = useForm({
        start_date: filters.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10),
        end_date: filters.end_date || new Date().toISOString().slice(0, 10),
        supplier_id: filters.supplier_id || '',
        stage: filters.stage || '',
        facilityoption_id: filters.facilityoption_id || '',
    });

    const handleInputChange = (e) => setData(e.target.name, e.target.value);
    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.procurement.po_history'), data, { preserveState: true, preserveScroll: true });
    };
    const resetFilters = () => reset();

    const getSupplierName = (supplier) => {
        if (!supplier) return 'N/A';
        return supplier.company_name || `${supplier.first_name || ''} ${supplier.surname || ''}`.trim() || 'N/A';
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Purchase Order History</h2>}>
            <Head title="PO History" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                                {/* Filters: Start Date, End Date, Supplier, Stage, Facility/Store */}
                                <div>
                                    <label htmlFor="start_date" className="form-label">Start Date</label>
                                    <input type="date" name="start_date" id="start_date" value={data.start_date} onChange={handleInputChange} className="form-input mt-1 w-full dark:bg-gray-700 dark:text-gray-200" />
                                </div>
                                <div>
                                    <label htmlFor="end_date" className="form-label">End Date</label>
                                    <input type="date" name="end_date" id="end_date" value={data.end_date} onChange={handleInputChange} className="form-input mt-1 w-full dark:bg-gray-700 dark:text-gray-200" />
                                </div>
                                <div>
                                    <label htmlFor="supplier_id" className="form-label">Supplier</label>
                                    <select name="supplier_id" id="supplier_id" value={data.supplier_id} onChange={handleInputChange} className="form-select mt-1 w-full dark:bg-gray-700 dark:text-gray-200">
                                        <option value="">All Suppliers</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{getSupplierName(s)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="facilityoption_id" className="form-label">Facility/Location</label>
                                    <select name="facilityoption_id" id="facilityoption_id" value={data.facilityoption_id} onChange={handleInputChange} className="form-select mt-1 w-full dark:bg-gray-700 dark:text-gray-200">
                                        <option value="">All Facilities</option>
                                        {facilityOptions.map(fo => <option key={fo.id} value={fo.id}>{fo.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="stage" className="form-label">PO Stage</label>
                                    <input type="text" name="stage" id="stage" placeholder="e.g., 1 or approved" value={data.stage} onChange={handleInputChange} className="form-input mt-1 w-full dark:bg-gray-700 dark:text-gray-200" />
                                    {/* Consider a dropdown if stages are fixed */}
                                </div>
                                <div className="flex items-end space-x-2">
                                    <button type="submit" disabled={processing} className="btn-indigo">
                                        <FontAwesomeIcon icon={faFilter} className="mr-2" /> Filter
                                    </button>
                                    <button type="button" onClick={resetFilters} className="btn-gray">
                                        <FontAwesomeIcon icon={faRedo} className="mr-2" /> Reset
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Table to display purchaseOrders.data */}
                        {purchaseOrders.data && purchaseOrders.data.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                                <table className="min-w-full divide-y dark:divide-gray-600">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="th-default">Date</th>
                                            <th className="th-default">PO ID</th>
                                            <th className="th-default">Supplier</th>
                                            <th className="th-default">Facility</th>
                                            <th className="th-default text-right">Total</th>
                                            <th className="th-default text-center">Stage</th>
                                            <th className="th-default text-center">Items</th>
                                            <th className="th-default text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">
                                        {purchaseOrders.data.map(po => (
                                            <tr key={po.id}>
                                                <td className="td-default">{new Date(po.transdate).toLocaleDateString()}</td>
                                                <td className="td-default">{po.id}</td> {/* Or a PO Number field if you have one */}
                                                <td className="td-default">{getSupplierName(po.supplier)}</td>
                                                <td className="td-default">{po.facilityoption?.name || 'N/A'}</td>
                                                <td className="td-default text-right">{formatCurrency(po.total)}</td>
                                                <td className="td-default text-center">{po.stage}</td>
                                                <td className="td-default text-center">{po.purchaseitems_count || po.purchaseitems?.length || 0}</td>
                                                <td className="td-default text-center">
                                                    <Link href={route('procurements1.edit', po.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                        <FontAwesomeIcon icon={faEye} /> View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            !processing && <p className="text-center py-10 text-gray-500 dark:text-gray-400">No purchase orders found for the selected criteria.</p>
                        )}
                        {processing && <p className="text-center py-10 text-gray-500 dark:text-gray-400">Loading data...</p>}

                        {purchaseOrders.links && purchaseOrders.data.length > 0 && (
                            <div className="mt-6">
                                <Pagination links={purchaseOrders.links} />
                            </div>
                        )}
                        {/* Error display if needed */}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// Add placeholder CSS classes if not globally defined (for th-default, td-default, btn-*)
// Or import from a shared CSS/component file.