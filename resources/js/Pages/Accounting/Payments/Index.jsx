import React, { useEffect, useState } from 'react';
import { useForm, Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Payments({ auth }) {
  const [showForm, setShowForm] = useState(false);
  const [payments, setPayments] = useState([]);
  const [filterDirection, setFilterDirection] = useState('all');

  const { data, setData, post, processing, reset } = useForm({
    payment_reference: '',
    party_type: '',
    party_id: '',
    direction: 'in',
    amount: '',
    method: '',
    currency: 'USD',
    payment_date: '',
    description: '',
  });

  const fetchPayments = () => {
    let url = '/accounting0';
    if (filterDirection !== 'all') {
      url += `?direction=${filterDirection}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => setPayments(data.payments));
  };

  useEffect(() => {
    fetchPayments();
  }, [filterDirection]);

  const submit = (e) => {
    e.preventDefault();
    post('/accounting0', {
      onSuccess: () => {
        reset();
        setShowForm(false);
        fetchPayments();
      }
    });
  };

  return (
    <AuthenticatedLayout
      auth={auth}
      header={<h2 className="text-xl font-semibold text-gray-800">Payments</h2>}
    >
      <Head title="Payments" />
      <div className="p-4">

        <div className="mb-4 flex items-center space-x-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {showForm ? 'Hide Form' : 'New Payment'}
          </button>

          <select
            value={filterDirection}
            onChange={e => setFilterDirection(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="all">All Payments</option>
            <option value="in">Received</option>
            <option value="out">Made</option>
          </select>
        </div>

        {showForm && (
          <form onSubmit={submit} className="mb-6 bg-gray-100 p-4 rounded">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Reference"
                value={data.payment_reference}
                onChange={e => setData('payment_reference', e.target.value)}
                className="border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="Party Type (e.g. App\\Models\\User)"
                value={data.party_type}
                onChange={e => setData('party_type', e.target.value)}
                className="border p-2 rounded"
                required
              />
              <input
                type="number"
                placeholder="Party ID"
                value={data.party_id}
                onChange={e => setData('party_id', e.target.value)}
                className="border p-2 rounded"
                required
              />
              <select
                value={data.direction}
                onChange={e => setData('direction', e.target.value)}
                className="border p-2 rounded"
              >
                <option value="in">Receive</option>
                <option value="out">Make</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={data.amount}
                onChange={e => setData('amount', e.target.value)}
                className="border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="Method"
                value={data.method}
                onChange={e => setData('method', e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="text"
                placeholder="Currency"
                value={data.currency}
                onChange={e => setData('currency', e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="date"
                value={data.payment_date}
                onChange={e => setData('payment_date', e.target.value)}
                className="border p-2 rounded"
                required
              />
            </div>

            <textarea
              placeholder="Description"
              value={data.description}
              onChange={e => setData('description', e.target.value)}
              className="border mt-2 p-2 rounded w-full"
            />

            <button
              type="submit"
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
              disabled={processing}
            >
              Submit
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border table-auto text-sm">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Reference</th>
                <th className="p-2 border">Direction</th>
                <th className="p-2 border">Amount</th>
                <th className="p-2 border">Party</th>
                <th className="p-2 border">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 border">{p.id}</td>
                  <td className="p-2 border">{p.payment_reference}</td>
                  <td className="p-2 border">{p.direction}</td>
                  <td className="p-2 border">{p.amount.toFixed(2)}</td>
                  <td className="p-2 border">{p.party?.name || p.party_type}</td>
                  <td className="p-2 border">{p.payment_date}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-gray-500">No payments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
