import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLifeRing, faShieldAlt, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import "@fortawesome/fontawesome-svg-core/styles.css";

// Add 'canRegister' to the props
export default function WelcomeSupport({ auth, canRegister }) { 

    const primaryButtonClasses = "bg-blue-500 hover:bg-blue-600 focus-visible:ring-blue-500";
    const primaryTextClass = "text-blue-500"; 
    const primaryIconBgClass = "bg-blue-100"; 
    const primaryIconTextClass = "text-blue-600";
    const outlineButtonClasses = "bg-transparent text-blue-500 ring-1 ring-blue-500 hover:bg-blue-500 hover:text-white";

    return (
        <>
            <Head title="Welcome to SysPos" />
            <div className="relative min-h-screen flex flex-col items-center justify-center text-white antialiased">
                <div
                    className="absolute inset-0 w-full h-full bg-cover bg-center z-0"
                    style={{ backgroundImage: "url('/img/register.jpg')" }} 
                ></div>

                <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70 z-10"></div>

                <div className="relative z-20 w-full max-w-4xl px-6 py-10 lg:max-w-7xl lg:py-16">
                    <header className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
                        <div className="flex-shrink-0">
                            <h1 className={`text-5xl md:text-6xl font-bold ${primaryTextClass} drop-shadow-lg`}>SysPos</h1>
                        </div>

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
                                    
                                    {/* Conditionally Render the Register Button */}
                                    {canRegister && (
                                        <Link
                                            href={route('register')}
                                            className={`inline-block px-7 py-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${outlineButtonClasses}`}
                                        >
                                            Register
                                        </Link>
                                    )}
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
                    </footer>
                </div>
            </div>
        </>
    );
}