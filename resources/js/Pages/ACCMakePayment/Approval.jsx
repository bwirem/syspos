import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function Approval({ auth, payment }) {
    // We use the `processing` state from `useForm` to disable the button during submission.
    const { processing, patch } = useForm();

    const handleConfirmApproval = () => {
        // Use `patch` from the useForm hook for consistency, though `router.patch` also works.
        patch(route('accounting1.approve', payment.id), {
            preserveScroll: true,
            // --- THIS IS THE CRITICAL FIX ---
            // This replaces the current page in the browser's history.
            // After this, clicking the browser's "Back" button will skip this page.
            replace: true,
            onSuccess: () => {
                // The controller handles the redirect, so nothing more is needed here.
            },
        });
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Confirm Payment Approval</h2>}>
            <Head title={`Approve Payment #${payment.id}`} />
            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Review Payment Details</h3>
                        <p className="mb-6 text-sm text-gray-600">Please confirm that the following payment details are correct before approving.</p>
                        
                        {/* Summary Card */}
                        <div className="border rounded-lg p-4 space-y-4 mb-6 bg-gray-50">
                             <div><span className="font-semibold w-32 inline-block text-gray-600">Recipient:</span> {payment.recipient.display_name}</div>
                             <div><span className="font-semibold w-32 inline-block text-gray-600">Payment Date:</span> {new Date(payment.transdate).toLocaleDateString()}</div>
                             <div className="font-bold text-lg"><span className="font-semibold w-32 inline-block text-gray-800">Total Amount:</span> {parseFloat(payment.total_amount).toLocaleString()} {payment.currency}</div>
                             <div><span className="font-semibold w-32 inline-block text-gray-600">Memo:</span> {payment.description || 'N/A'}</div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            <Link href={route('accounting1.edit', payment.id)} className="text-gray-700 hover:text-gray-900 font-medium">
                               <FontAwesomeIcon icon={faTimes} className="mr-2"/> Cancel
                            </Link>
                            <button
                                onClick={handleConfirmApproval}
                                disabled={processing}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 font-semibold disabled:bg-blue-300"
                            >
                                <FontAwesomeIcon icon={faCheck} />
                                {processing ? 'Approving...' : 'Confirm Approval'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}