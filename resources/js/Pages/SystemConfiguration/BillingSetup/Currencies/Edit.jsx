import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import CurrencyForm from './CurrencyForm';

export default function Edit({ auth, currency }) {
    // Debugging Tip: To confirm the data is arriving from your controller,
    // you can uncomment the line below. You should see the currency object
    // in your browser's developer console.
    // console.log('Currency object received in Edit.jsx:', currency);

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Currency</h2>}>
            <Head title={`Edit ${currency.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        {/* Ensure you are passing the 'currency' object here */}
                        <CurrencyForm currency={currency} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}