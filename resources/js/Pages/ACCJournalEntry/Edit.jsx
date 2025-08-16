import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import JournalEntryForm from './JournalEntryForm';

export default function Edit({ auth, journalEntry }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Journal Entry</h2>}>
            <Head title={`Edit Entry #${journalEntry.id}`} />
            <div className="py-12"><div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                <div className="bg-white p-6 shadow sm:rounded-lg">
                    <JournalEntryForm journalEntry={journalEntry} />
                </div>
            </div></div>
        </AuthenticatedLayout>
    );
}