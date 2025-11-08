import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import PaymentForm from './PaymentForm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';

export default function Edit({ auth, payment, paymentTypes }) {
    // Determine if the form should be read-only based on the payment stage.
    const isReadOnly = payment.stage !== 1;

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Payment #{payment.id} Details</h2>}>
            <Head title={`Payment ${payment.id}`} />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        
                        {/* --- NEW: Workflow Actions Header --- */}
                        <div className="mb-6 pb-4 border-b flex justify-end items-center gap-4">
                            {payment.stage === 1 && ( // PENDING
                                <Link
                                    href={route('accounting1.approve.confirm', payment.id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 font-semibold hover:bg-blue-700"
                                >
                                    <FontAwesomeIcon icon={faCheck} />
                                    Approve Payment
                                </Link>
                            )}
                             {payment.stage === 2 && ( // APPROVED
                                <Link
                                    href={route('accounting1.pay.confirm', payment.id)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 font-semibold hover:bg-green-700"
                                >
                                    <FontAwesomeIcon icon={faMoneyBillWave} />
                                    Proceed to Pay
                                </Link>
                            )}
                        </div>

                        {/* Pass a readOnly prop to the form */}
                        <PaymentForm
                            payment={payment}
                            paymentTypes={paymentTypes}
                            readOnly={isReadOnly} 
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}