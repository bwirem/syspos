import React, { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import Modal from '@/Components/CustomModal';
import Pagination from "@/Components/Pagination";

export default function Index({ auth, journalEntries, filters, success }) {
    // ... (logic similar to other Index pages: useForm, useEffect for search, modal state)
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Journal Entries</h2>}>
            <Head title="Journal Entries" />
            <div className="py-12"><div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                {/* ... Toolbar with Search and Create button ... */}
                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Description</th>
                                <th className="px-4 py-3 text-right">Total Amount</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {journalEntries.data.map(entry => (
                                <tr key={entry.id}>
                                    <td className="px-4 py-4">{new Date(entry.entry_date).toLocaleDateString()}</td>
                                    <td className="px-4 py-4">{entry.description}</td>
                                    <td className="px-4 py-4 text-right">{parseFloat(entry.total_debit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="px-4 py-4 text-center">
                                        <Link href={route('accounting2.edit', entry.id)} className="text-blue-600"><FontAwesomeIcon icon={faEdit} /></Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination class="mt-6" links={journalEntries.links} />
            </div></div>
        </AuthenticatedLayout>
    );
}