import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faRedo, faPlus, faMinus, faTable, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const formatValue = (value) => {
    if (typeof value === 'number') {
        return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (value === null || value === undefined) return 'N/A';
    return String(value);
};

export default function CustomReportBuilder({
    auth,
    reportData,
    filters: serverFilters,
    availableSaleColumns = [],
    availableSaleItemColumns = [],
    availableItemColumns = [],
    availableFilters = [],
    availableGroupings = {},
    availableAggregations = [],
    customers = [], users = [], stores = [], items = [], itemGroups = [],
    flash
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        report_title: serverFilters?.report_title || 'Custom Report',
        start_date: serverFilters?.start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        end_date: serverFilters?.end_date || new Date().toISOString().slice(0, 10),
        columns_sale: serverFilters?.columns_sale || [],
        columns_sale_item: serverFilters?.columns_sale_item || [],
        columns_item: serverFilters?.columns_item || [],
        filters: serverFilters?.filters && serverFilters.filters.length > 0 ? serverFilters.filters : [{ field: '', operator: '=', value: '' }],
        group_by: serverFilters?.group_by || [],
        aggregations: serverFilters?.aggregations || [],
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleMultiSelectChange = (name, selectedOptions) => {
        setData(name, Array.from(selectedOptions).map(option => option.value));
    };

    const handleFilterChange = (index, fieldName, value) => {
        const updatedFilters = data.filters.map((filter, i) => {
            if (i === index) {
                return { ...filter, [fieldName]: value };
            }
            return filter;
        });
        setData('filters', updatedFilters);
    };

    const addFilter = () => {
        setData('filters', [...data.filters, { field: '', operator: '=', value: '' }]);
    };

    const removeFilter = (index) => {
        setData('filters', data.filters.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('reports.custom.builder'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetForm = () => {
        reset();
    };

    const groupingOptions = Object.entries(availableGroupings).map(([value, label]) => ({ value, label }));

    const formatColumnLabel = (colString) => {
        if (!colString) return '';
        let label = colString.replace(/_/g, ' ');
        if (label.includes(' AS ')) {
            label = label.substring(label.lastIndexOf(' AS ') + 4);
        }
        label = label.replace(/\b\w/g, l => l.toUpperCase());
        return label;
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Custom Report Builder</h2>}
        >
            <Head title="Custom Report Builder" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
                            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Report Configuration</h3>

                            <div>
                                <label htmlFor="report_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Report Title</label>
                                <input type="text" name="report_title" id="report_title" value={data.report_title} onChange={handleInputChange} className="mt-1 block w-full form-input rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                    <input type="date" name="start_date" id="start_date" value={data.start_date} onChange={handleInputChange} className="mt-1 block w-full form-input rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200" />
                                </div>
                                <div>
                                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                    <input type="date" name="end_date" id="end_date" value={data.end_date} onChange={handleInputChange} className="mt-1 block w-full form-input rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Columns from Sales</label>
                                <select multiple name="columns_sale" value={data.columns_sale} onChange={(e) => handleMultiSelectChange('columns_sale', e.target.selectedOptions)} className="mt-1 block w-full form-multiselect rounded-md shadow-sm h-32 dark:bg-gray-700 dark:text-gray-200">
                                    {availableSaleColumns.map(col => <option key={col} value={col}>{formatColumnLabel(col)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Columns from Sale Items</label>
                                <select multiple name="columns_sale_item" value={data.columns_sale_item} onChange={(e) => handleMultiSelectChange('columns_sale_item', e.target.selectedOptions)} className="mt-1 block w-full form-multiselect rounded-md shadow-sm h-24 dark:bg-gray-700 dark:text-gray-200">
                                    {availableSaleItemColumns.map(col => <option key={col} value={col}>{formatColumnLabel(col)}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Columns from Product/Item Details</label>
                                <select multiple name="columns_item" value={data.columns_item} onChange={(e) => handleMultiSelectChange('columns_item', e.target.selectedOptions)} className="mt-1 block w-full form-multiselect rounded-md shadow-sm h-24 dark:bg-gray-700 dark:text-gray-200">
                                    {availableItemColumns.map(col => <option key={col} value={col}>{formatColumnLabel(col)}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filters</label>
                                {data.filters.map((filter, index) => (
                                    <div key={index} className="flex items-center gap-2 mt-2 p-2 border dark:border-gray-700 rounded">
                                        <select value={filter.field} onChange={(e) => handleFilterChange(index, 'field', e.target.value)} className="form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200 flex-1">
                                            <option value="">Select Field...</option>
                                            {availableFilters.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                                        </select>
                                        <select
                                            value={filter.operator}
                                            onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                                            className="form-select rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-200"
                                        >
                                            <option value="=">=</option>
                                            <option value="!=">!=</option>
                                            {/* <option value=">">></option>
                                            <option value="<"><</option>
                                            <option value=">=">>=</option>
                                            <option value="<="><=</option> */}
                                            <option value="like">LIKE</option>
                                            <option value="in">IN</option>
                                            <option value="not_in">NOT IN</option>
                                        </select>
                                        <input type="text" placeholder="Value (comma-sep for IN/NOT IN)" value={filter.value} onChange={(e) => handleFilterChange(index, 'value', e.target.value)} className="form-input rounded-md shadow-sm flex-1 dark:bg-gray-700 dark:text-gray-200" />
                                        <button type="button" onClick={() => removeFilter(index)} className="text-red-500 hover:text-red-700 p-1" title="Remove Filter">
                                            <FontAwesomeIcon icon={faMinus} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addFilter} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center">
                                    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add Filter
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group By (Select one or more)</label>
                                <select multiple name="group_by" value={data.group_by} onChange={(e) => handleMultiSelectChange('group_by', e.target.selectedOptions)} className="mt-1 block w-full form-multiselect rounded-md shadow-sm h-32 dark:bg-gray-700 dark:text-gray-200">
                                    {groupingOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>

                            {data.group_by.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Aggregations (Select if grouping)</label>
                                    <select multiple name="aggregations" value={data.aggregations} onChange={(e) => handleMultiSelectChange('aggregations', e.target.selectedOptions)} className="mt-1 block w-full form-multiselect rounded-md shadow-sm h-32 dark:bg-gray-700 dark:text-gray-200">
                                        {availableAggregations.map(agg => <option key={agg} value={agg}>{agg}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-x-3 pt-4 border-t dark:border-gray-700">
                                <button type="button" onClick={resetForm} className="rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500">
                                    <FontAwesomeIcon icon={faRedo} className="mr-2" /> Reset Form
                                </button>
                                <button type="submit" disabled={processing} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                                    <FontAwesomeIcon icon={faTable} className="mr-2" />
                                    {processing ? 'Generating...' : 'Generate Report'}
                                </button>
                            </div>
                        </form>

                        {flash?.success && (
                            <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                                {flash.error}
                            </div>
                        )}

                        {reportData && (
                            <div className="mt-8 pt-6 border-t dark:border-gray-700">
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">{reportData.report_title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Period: {reportData.start_date_formatted} - {reportData.end_date_formatted}
                                </p>
                                {reportData.results && reportData.results.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                                        <table className="min-w-full divide-y dark:divide-gray-600">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    {(reportData.headers || []).map(header => (
                                                        <th key={header} scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">
                                                {reportData.results.map((row, rowIndex) => (
                                                    <tr key={rowIndex}>
                                                        {(reportData.headers || []).map(header => (
                                                            <td key={header} className="px-3 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                                                                {formatValue(row[header])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    !processing && <p className="text-center text-gray-500 dark:text-gray-400 mt-4">No data found for the selected criteria.</p>
                                )}
                            </div>
                        )}
                        {!reportData && !processing && !(serverFilters?.columns_sale?.length || serverFilters?.start_date) && (
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                Configure your report options and click "Generate Report".
                            </p>
                        )}
                        {Object.keys(errors).length > 0 && (
                            <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-md dark:bg-red-900/30 dark:border-red-700">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-red-400 dark:text-red-300" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                            Please correct the following errors:
                                        </h3>
                                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                            <ul role="list" className="list-disc pl-5 space-y-1">
                                                {Object.entries(errors).map(([field, message]) => (
                                                    <li key={field}>{typeof message === 'object' ? JSON.stringify(message) : message}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}