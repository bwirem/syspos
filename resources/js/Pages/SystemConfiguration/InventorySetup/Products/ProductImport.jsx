import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faDownload, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export default function ProductImport({ auth, errors: pageErrors }) {
    const { data, setData, post, processing, errors } = useForm({
        file: null,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('systemconfiguration2.products.import.store'));
    };
    
    // The controller passes back row-specific errors via flash session
    const importErrors = pageErrors.import_errors || [];

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Import Products</h2>}>
            <Head title="Import Products" />

            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8 space-y-6">
                    {/* Instructions Card */}
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-6 shadow-sm sm:rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Instructions</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Download the Excel template file using the link below.</li>
                            <li>Fill in the product details. Do not change the column headers.</li>
                            <li>The `category_name` and `unit_name` must exactly match existing entries in the system.</li>
                            <li>Save the file and upload it using the form below.</li>
                        </ol>
                        <div className="mt-4">
                            <Link href={route('systemconfiguration2.products.template.download')} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                <FontAwesomeIcon icon={faDownload} />
                                Download Template
                            </Link>
                        </div>
                    </div>

                    {/* Upload Form Card */}
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <form onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                                    Upload Excel File*
                                </label>
                                <input
                                    id="file-upload"
                                    type="file"
                                    onChange={(e) => setData('file', e.target.files[0])}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    accept=".xlsx, .xls, .csv"
                                />
                                {errors.file && <p className="text-red-500 text-xs mt-1">{errors.file}</p>}
                            </div>
                            <div className="flex justify-end items-center gap-4 pt-6 border-t mt-6">
                                <Link href={route('systemconfiguration2.products.index')} className="text-gray-700 font-medium">
                                    Cancel
                                </Link>
                                <button type="submit" disabled={processing || !data.file} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md flex items-center gap-2 disabled:bg-green-300">
                                    {processing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faUpload} />}
                                    {processing ? 'Importing...' : 'Import Products'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Import Errors Display */}
                    {importErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 p-6 shadow-sm sm:rounded-lg">
                             <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                Validation Errors Found
                             </h3>
                             <p className="text-sm text-red-700 mb-4">The following errors were found in your upload file. Please correct them and try again.</p>
                             <div className="overflow-x-auto rounded-lg border">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-red-100">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase">Row</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase">Column</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase">Error Message</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {importErrors.map((error, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{error.row}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{error.attribute}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">{error.errors.join(', ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}