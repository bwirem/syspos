import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import ItemForm from './ItemForm';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Edit({ auth, item, itemGroups, pricecategories }) {
    // FIX: Add ' = {}' to provide a default value if flash is undefined
    const { flash = {} } = usePage().props; 

    useEffect(() => {
        // Now this won't crash even if flash is empty
        if (flash.success) {
            toast.success(flash.success);
        }
        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl font-semibold">Edit Item</h2>}>
            <Head title={`Edit ${item.name}`} />
            <div className="py-12">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg">
                        <ItemForm 
                            item={item} 
                            itemGroups={itemGroups} 
                            pricecategories={pricecategories} 
                        />
                    </div>
                </div>
            </div>
            <ToastContainer position="bottom-right" />
        </AuthenticatedLayout>
    );
}