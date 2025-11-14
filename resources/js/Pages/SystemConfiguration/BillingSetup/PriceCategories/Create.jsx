import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import PriceCategoryForm from './PriceCategoryForm';

export default function Create({ auth }) {
    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Define Price Categories</h2>}>
            <Head title="Define Price Categories" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <PriceCategoryForm />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
