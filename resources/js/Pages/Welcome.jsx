import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLifeRing, faShieldAlt, faArrowRight } from '@fortawesome/free-solid-svg-icons'; // Added faArrowRight
import "@fortawesome/fontawesome-svg-core/styles.css"; // If not globally imported

// No need for AuthenticatedLayout here as it's a public welcome page
// import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function WelcomeSupport({ auth }) { // auth prop to check if user is logged in

    // Define color classes directly for Tailwind's JIT compiler
    // These are based on your 'blue-500' example. Adjust if your primary color is different.
    const primaryButtonClasses = "bg-blue-500 hover:bg-blue-600 focus-visible:ring-blue-500";
    const primaryTextClass = "text-blue-500"; // For main title
    const primaryIconBgClass = "bg-blue-100"; // Lighter shade for icon backgrounds
    const primaryIconTextClass = "text-blue-600"; // Icon color to stand out on light bg
    const outlineButtonClasses = "bg-transparent text-blue-500 ring-1 ring-blue-500 hover:bg-blue-500 hover:text-white";

    return (
        <>
            <Head title="Welcome to SysPos" />
            <div className="relative min-h-screen flex flex-col items-center justify-center text-white antialiased">
                {/* Full-page Background Image */}
                <div
                    className="absolute inset-0 w-full h-full bg-cover bg-center z-0"
                    style={{ backgroundImage: "url('/img/register.jpg')" }} // Ensure this image is in public/img
                ></div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70 z-10"></div>

                {/* Content Container */}
                <div className="relative z-20 w-full max-w-4xl px-6 py-10 lg:max-w-7xl lg:py-16">
                    <header className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
                        {/* Logo and Title */}
                        <div className="flex-shrink-0">
                             {/* If you have an SVG logo, you can place it here */}
                            {/* <img src="/logo.svg" alt="SysPos Logo" className="h-12 w-auto" /> */}
                            <h1 className={`text-5xl md:text-6xl font-bold ${primaryTextClass} drop-shadow-lg`}>SysPos</h1>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-shrink-0">
                            {auth && auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className={`inline-block text-white px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${primaryButtonClasses}`}
                                >
                                    Go to Dashboard
                                    <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                                </Link>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                                    <Link
                                        href={route('login')}
                                        className={`inline-block text-white px-7 py-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${primaryButtonClasses}`}
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className={`inline-block px-7 py-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${outlineButtonClasses}`}
                                    >
                                        Register
                                    </Link>
                                </div>
                            )}
                        </nav>
                    </header>

                    <main className="mt-12 md:mt-16">
                        <div className="text-center mb-10 md:mb-12">
                            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white drop-shadow-md">
                                Empowering Your Business Operations
                            </h2>
                            <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
                                SysPos provides a secure and efficient platform to manage your business records, streamline workflows, and collaborate effectively.
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-2">
                            {/* Feature Block 1 */}
                            <div className="flex flex-col items-start gap-4 rounded-xl bg-white/90 backdrop-blur-sm p-6 shadow-xl transition duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
                                <div className={`flex size-14 shrink-0 items-center justify-center rounded-full ${primaryIconBgClass} shadow-md`}>
                                    <FontAwesomeIcon icon={faShieldAlt} className={`${primaryIconTextClass} size-7`} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        Your Business, Simplified
                                    </h3>
                                    <p className="mt-3 text-gray-700 leading-relaxed">
                                        Take control of your business with SysPos. Securely manage your records, get real-time updates, and easily share with partners. Our intuitive interface makes complex tasks easy.
                                    </p>
                                </div>
                            </div>

                            {/* Feature Block 2 */}
                            <div className="flex flex-col items-start gap-4 rounded-xl bg-white/90 backdrop-blur-sm p-6 shadow-xl transition duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
                                <div className={`flex size-14 shrink-0 items-center justify-center rounded-full ${primaryIconBgClass} shadow-md`}>
                                    <FontAwesomeIcon icon={faLifeRing} className={`${primaryIconTextClass} size-7`} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        Dedicated Support When You Need It
                                    </h3>
                                    <p className="mt-3 text-gray-700 leading-relaxed">
                                        Get instant support for any questions. Our team is dedicated to making your SysPos experience seamless and productive, ensuring you get the most out of our platform.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="pt-16 pb-8 text-center text-sm text-gray-400">
                        © {new Date().getFullYear()} SysPos. All rights reserved.
                        {/* Optional: Add privacy policy or terms links here */}
                        {/* <div className="mt-2">
                            <Link href="/privacy-policy" className="hover:text-white underline">Privacy Policy</Link>
                            <span className="mx-2">|</span>
                            <Link href="/terms-of-service" className="hover:text-white underline">Terms of Service</Link>
                        </div> */}
                    </footer>
                </div>
            </div>
        </>
    );
}