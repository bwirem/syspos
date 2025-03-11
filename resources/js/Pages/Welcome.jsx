import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLifeRing, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

export default function WelcomeSupport({ auth }) {
    // Define a primary color (e.g., a shade of blue)
    const primaryColor = 'blue-500'; // Tailwind class for a medium blue
    const primaryColorHover = 'blue-600'; // Tailwind class for a slightly darker blue on hover
    const primaryColorDark = 'blue-700'; // Tailwind class for a dark blue text

    return (
        <>
            <Head title="Welcome to SysPos" />
            <div className="relative min-h-screen flex items-center justify-center text-white">
                {/* Full-page Background Image */}
                <img
                    id="background"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    src="/img/register.jpg" // Ensure this image is in public/img
                    alt="Background"
                />

                {/* Overlay (for readability) */}
                <div className="absolute inset-0 bg-black bg-opacity-50 z-10"></div>

                {/* Content Container */}
                <div className="relative z-20 w-full max-w-2xl px-6 lg:max-w-7xl">
                    <header className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 py-10 text-center md:text-left">
                        {/* Logo and Title (Combined) */}
                        <div className="md:col-start-2 flex flex-col items-center">
                            <h1 className={`text-4xl md:text-5xl font-bold text-${primaryColor}`}>SysPos</h1> {/* Use the primary color */}
                        </div>

                        {/* Navigation */}
                        <nav className="flex justify-center md:justify-end">
                            {auth && auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className={`bg-${primaryColor} text-white px-6 py-3 rounded-full hover:bg-${primaryColorHover} transition focus:outline-none focus-visible:ring-${primaryColor} focus-visible:ring-2 focus-visible:ring-offset-2`}
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <div className="flex space-x-4">
                                    <Link
                                        href={route('login')}
                                        className={`bg-${primaryColor} text-white px-6 py-3 rounded-full hover:bg-${primaryColorHover} transition focus:outline-none focus-visible:ring-${primaryColor} focus-visible:ring-2 focus-visible:ring-offset-2`}
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className={`bg-transparent text-${primaryColor} px-6 py-3 rounded-full hover:bg-${primaryColor} hover:text-white transition focus:outline-none focus-visible:ring-${primaryColor} focus-visible:ring-2 focus-visible:ring-offset-2 ring-1 ring-${primaryColor}`}
                                    >
                                        Register
                                    </Link>
                                </div>
                            )}
                        </nav>
                    </header>

                    <main className="mt-8 md:mt-12">
                        <div className="grid gap-8 md:grid-cols-2">
                            {/* Feature Blocks (Styled for Overlay) */}
                            <div className={`flex items-start gap-4 rounded-lg bg-white bg-opacity-90 p-6 shadow-lg ring-1 ring-white/[0.05]  transition transform hover:scale-105`}>
                                <div className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-${primaryColor}/10 sm:size-16`}>
                                    <FontAwesomeIcon icon={faShieldAlt} className={`text-${primaryColor} size-5 sm:size-6`} />
                                </div>
                                <div className="pt-3 sm:pt-5">
                                    <h2 className="text-xl font-semibold text-black">
                                        Your Business, Simplified
                                    </h2>
                                    <p className="mt-4 text-sm/relaxed text-gray-700">
                                        Take control of your business with SysPos. Securely manage your records, get real-time updates, and easily share with partners.
                                    </p>
                                </div>
                            </div>

                            <div className={`flex items-start gap-4 rounded-lg bg-white bg-opacity-90 p-6 shadow-lg ring-1 ring-white/[0.05]  transition transform hover:scale-105`}>
                                <div className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-${primaryColor}/10 sm:size-16`}>
                                    <FontAwesomeIcon icon={faLifeRing} className={`text-${primaryColor} size-5 sm:size-6`} />
                                </div>
                                <div className="pt-3 sm:pt-5">
                                    <h2 className="text-xl font-semibold text-black">
                                        We're Here for Support
                                    </h2>
                                    <p className="mt-4 text-sm/relaxed text-gray-700">
                                        Get instant support for any questions. Our team is dedicated to making your SysPos experience seamless.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="py-16 text-center text-sm">
                        SysPos
                    </footer>
                </div>
            </div>
        </>
    );
}