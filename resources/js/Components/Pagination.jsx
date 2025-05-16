// Example Pagination.jsx (simplified)
import { Link } from '@inertiajs/react';

export default function Pagination({ links }) {
    if (!links || links.length <= 3) return null; // Hide if only prev, current, next without numbers

    return (
        <nav aria-label="Pagination">
            <div className="flex items-center justify-between">
                 {/* Optional: Showing X-Y of Z results */}
                <div className="flex flex-1 justify-between sm:justify-end">
                    {links.map((link, index) => (
                        <Link
                            key={index}
                            href={link.url || '#'}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border
                                        ${link.active ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}
                                        ${index === 0 ? 'rounded-l-md' : ''}
                                        ${index === links.length - 1 ? 'rounded-r-md' : ''}
                                        ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                            preserveScroll
                            preserveState
                            disabled={!link.url}
                        />
                    ))}
                </div>
            </div>
        </nav>
    );
}