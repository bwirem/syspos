import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faFilter, faChartLine } from '@fortawesome/free-solid-svg-icons';
// You might want to use a charting library like Chart.js or Recharts
// import { Line } from 'react-chartjs-2';
// import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);


const formatCurrency = (amount, currencyCode = 'TZS') => {
    // ... (same as your daily report)
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return `${currencyCode} 0.00`;
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    return parsedAmount.toLocaleString(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function SalesSummaryReport({ auth, reportData, filters }) {
    const { data, setData, get, processing } = useForm({
        start_date: filters.start_date || new Date(new Date().setDate(1)).toISOString().slice(0, 10), // Default to start of current month
        end_date: filters.end_date || new Date().toISOString().slice(0, 10), // Default to today
        group_by: filters.group_by || 'day',
    });

    const handleInputChange = (e) => {
        setData(e.target.name, e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        get(route('reports.sales.summary'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Chart.js options (example)
    // const chartOptions = {
    //     responsive: true,
    //     plugins: {
    //         legend: { position: 'top' },
    //         title: { display: true, text: reportData?.grouped_data_title || 'Sales Data' },
    //     },
    // };
    // const chartDisplayData = {
    //     labels: reportData?.chart_labels || [],
    //     datasets: [
    //         {
    //             label: 'Total Sales',
    //             data: reportData?.chart_data || [],
    //             borderColor: 'rgb(75, 192, 192)',
    //             backgroundColor: 'rgba(75, 192, 192, 0.5)',
    //         },
    //     ],
    // };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Sales Summary Report</h2>}
        >
            <Head title="Sales Summary Report" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                <input type="date" name="start_date" id="start_date" value={data.start_date} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                <input type="date" name="end_date" id="end_date" value={data.end_date} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label htmlFor="group_by" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group By</label>
                                <select name="group_by" id="group_by" value={data.group_by} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                    <option value="day">Day</option>
                                    <option value="week">Week</option>
                                    <option value="month">Month</option>
                                    <option value="item_group">Item Group</option>
                                    <option value="product">Product</option>
                                </select>
                            </div>
                            <button type="submit" disabled={processing} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                                {processing ? 'Generating...' : 'Generate Report'}
                            </button>
                        </form>

                        {reportData && (
                            <div className="space-y-8">
                                <h3 className="text-2xl font-semibold text-center text-gray-800 dark:text-gray-100">
                                    {reportData.report_title}
                                </h3>

                                {/* Overall Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales Amount</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{formatCurrency(reportData.total_sales_amount)}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Transactions</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{reportData.number_of_transactions}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Discount</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{formatCurrency(reportData.total_discount)}</p>
                                    </div>
                                </div>

                                {/* Chart (Example using a placeholder) */}
                                {/* {reportData.chart_labels && reportData.chart_labels.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow mb-8">
                                        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Sales Trend</h4>
                                        <div style={{ height: '300px', width: '100%' }}>
                                            { <Line options={chartOptions} data={chartDisplayData} /> }
                                            <p className="text-center text-gray-400 italic">(Chart placeholder: Integrate your charting library here)</p>
                                        </div>
                                    </div>
                                )} */}


                                {/* Grouped Data Table */}
                                {reportData.grouped_sales_data && reportData.grouped_sales_data.length > 0 && (
                                     <section>
                                        <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">{reportData.grouped_data_title}</h4>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                                <thead className="bg-gray-100 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            {reportData.group_by_selected === 'item_group' ? 'Group Name' :
                                                             reportData.group_by_selected === 'product' ? 'Product Name' :
                                                             'Period'}
                                                        </th>
                                                        { (reportData.group_by_selected === 'item_group' || reportData.group_by_selected === 'product') &&
                                                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Quantity</th>
                                                        }
                                                        { (reportData.group_by_selected === 'day' || reportData.group_by_selected === 'week' || reportData.group_by_selected === 'month') &&
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Transactions</th>
                                                        }
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Sales</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {reportData.grouped_sales_data.map((row, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{row.period_label}</td>
                                                            { (reportData.group_by_selected === 'item_group' || reportData.group_by_selected === 'product') &&
                                                              <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{row.total_quantity}</td>
                                                            }
                                                            { (reportData.group_by_selected === 'day' || reportData.group_by_selected === 'week' || reportData.group_by_selected === 'month') &&
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{row.transactions}</td>
                                                            }
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.total_sales)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                )}


                                {!reportData.grouped_sales_data?.length && !processing &&
                                    <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No sales data found for the selected criteria.</p>
                                }

                            </div>
                        )}
                         {!reportData && !processing && (
                             <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                                Please select criteria and generate the report.
                            </p>
                        )}

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}