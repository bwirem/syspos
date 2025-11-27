import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
// Import Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel, faPrint } from '@fortawesome/free-solid-svg-icons';

export default function ProductList({ auth, products, categories, filters, activePriceCategories }) {
    const [queryParams, setQueryParams] = useState({
        search: filters.search || '',
        category_id: filters.category_id || '',
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            router.get(
                route('reports.inventory.product-list'),
                { ...queryParams },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [queryParams.search, queryParams.category_id]);

    const handleSearchChange = (e) => {
        setQueryParams({ ...queryParams, search: e.target.value });
    };

    const handleCategoryChange = (e) => {
        setQueryParams({ ...queryParams, category_id: e.target.value });
    };

    // Helper to generate export URL with current filters
    const getExportUrl = (routeName) => {
        const url = new URL(route(routeName));
        if (queryParams.search) url.searchParams.append('search', queryParams.search);
        if (queryParams.category_id) url.searchParams.append('category_id', queryParams.category_id);
        return url.toString();
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Product List Report
                </h2>
            }
        >
            <Head title="Product List" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900 dark:text-gray-100">
                            
                            {/* --- Filters Section --- */}
                            <div className="mb-6 flex flex-col lg:flex-row gap-4 justify-between items-center">
                                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        className="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm w-full sm:w-64"
                                        value={queryParams.search}
                                        onChange={handleSearchChange}
                                    />

                                    <select
                                        className="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm w-full sm:w-48"
                                        value={queryParams.category_id}
                                        onChange={handleCategoryChange}
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* --- Export Buttons --- */}
                                <div className="flex gap-2">
                                    {/* PDF Button */}
                                    <a 
                                        href={getExportUrl('reports.inventory.product-list.pdf')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition"
                                    >
                                        <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
                                        PDF
                                    </a>

                                    {/* Excel Button */}
                                    <a 
                                        href={getExportUrl('reports.inventory.product-list.excel')}
                                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition"
                                    >
                                        <FontAwesomeIcon icon={faFileExcel} className="mr-2" />
                                        Excel
                                    </a>
                                </div>
                            </div>

                            {/* --- Data Table (Existing Code) --- */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Product Name
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Category
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Unit
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Cost Price
                                            </th>
                                            {activePriceCategories && activePriceCategories.map((priceCat) => (
                                                <th key={priceCat.key} scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                    {priceCat.label}
                                                </th>
                                            ))}
                                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Reorder Level
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {products.data.length > 0 ? (
                                            products.data.map((product) => (
                                                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {product.name}
                                                        </div>
                                                        {product.displayname && product.displayname !== product.name && (
                                                            <div className="text-xs text-gray-500">
                                                                {product.displayname}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {product.category?.name || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {product.unit?.name || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                                                        {parseFloat(product.costprice).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                    </td>
                                                    {activePriceCategories && activePriceCategories.map((priceCat) => (
                                                        <td key={priceCat.key} className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 font-medium">
                                                            {product.bls_item && product.bls_item[priceCat.key]
                                                                ? parseFloat(product.bls_item[priceCat.key]).toLocaleString(undefined, {minimumFractionDigits: 2})
                                                                : '0.00'}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                                                        {product.reorderlevel}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5 + (activePriceCategories ? activePriceCategories.length : 0)} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                    No products found matching your criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- Pagination --- */}
                            <div className="mt-4">
                                {products.links && (
                                    <div className="flex flex-wrap justify-center gap-1">
                                        {products.links.map((link, key) => {
                                            const classes = `px-3 py-1 border rounded text-sm ${
                                                link.active
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`;

                                            return link.url ? (
                                                <Link
                                                    key={key}
                                                    href={link.url}
                                                    className={classes}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    preserveState
                                                    preserveScroll
                                                />
                                            ) : (
                                                <span
                                                    key={key}
                                                    className={classes}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}