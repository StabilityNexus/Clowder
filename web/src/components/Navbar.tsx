"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import ConnectWallet from "./ConnectWallet";
import logo_light from "../images/logo_light.png";
import logo_dark from "../images/logo_dark.png";
import { useTheme } from "next-themes";
import { ModeToggle } from "../components/darkModeToggle";
import Avatar from "./Avatar";
import { useWallet } from "@/hooks/WalletConnectProvider";
import { Menu, X } from "lucide-react";

const Navbar = () => {
    const { address } = useWallet();
    const { resolvedTheme } = useTheme(); // Use resolvedTheme for accurate theme detection
    const [isThemeReady, setIsThemeReady] = useState(false); // Track theme readiness
    const [isMenuOpen, setIsMenuOpen] = useState(false); // State to toggle menu

    useEffect(() => {
        // Ensure theme is ready before rendering
        if (resolvedTheme) {
            setIsThemeReady(true);
        }
    }, [resolvedTheme]);

    // Avoid rendering the navbar until the theme is resolved
    if (!isThemeReady) return null;

    return (
        <header className={`p-5 bg-[#B5E8F8] dark:bg-black`}>
            <div className="container mx-auto flex items-center justify-between relative">
                {/* Logo and Text */}
                <div>
                    <Link href="/">
                        <div className="absolute ml-[-23px] flex items-baseline items-center left-0 top-1/2 transform -translate-y-1/2 mt-[36px]">
                            <Image
                                src={resolvedTheme === "dark" ? logo_dark : logo_light}
                                alt="Clowder"
                                width={120}
                                height={120}
                                priority
                            />
                            <h1
                                className="text-4xl font-bold ml-[-10px] pb-2 dark:text-[#BA9901]"
                                style={{
                                    fontFamily: "var(--font-bebas-nueue)",
                                    marginLeft: "-58px",
                                }}
                            >
                                LOWDER
                            </h1>
                        </div>
                    </Link>
                </div>

                {/* Hamburger Menu and ModeToggle for Small Screens */}
                <div className="flex items-center space-x-4 md:hidden">
                    <button
                        className="z-20"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? (
                            <X className="w-8 h-8" />
                        ) : (
                            <Menu className="w-8 h-8" />
                        )}
                    </button>
                    <ModeToggle />
                </div>

                {/* Mobile Navigation Links */}
                {isMenuOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 z-10 flex items-center justify-center">
                        <nav className="bg-white dark:bg-gray-800 p-8 rounded-lg w-4/5 max-w-md shadow-lg relative">
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="absolute top-4 right-4 hover:bg-gray-300 dark:hover:bg-gray-600 text-black dark:text-white font-bold py-2 px-4 rounded"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <ul
                                className="flex flex-col space-y-4 text-2xl font-semibold text-center"
                                style={{ fontFamily: "var(--font-bebas-nueue)" }}
                            >
                                <li>
                                    <Link
                                        href="/"
                                        className="block py-2 hover:text-blue-600"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        HOME
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/create"
                                        className="block py-2 hover:text-blue-600"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        CREATE
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/#Services"
                                        className="block py-2 hover:text-blue-600"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        SERVICES
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/#Contact"
                                        className="block py-2 hover:text-blue-600"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        CONTACT
                                    </Link>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}

                {/* Desktop Navigation Links */}
                <nav
                    className="hidden md:flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 space-x-4 lg:space-x-8 text-xl lg:text-2xl font-semibold text-center whitespace-nowrap overflow-x-auto max-w-[calc(100%-400px)]"
                    style={{ fontFamily: "var(--font-bebas-nueue)" }}
                >
                    <Link href="/" className="hover:text-blue-600 px-2">
                        HOME
                    </Link>
                    <Link href="/create" className="hover:text-blue-600 px-2">
                        CREATE
                    </Link>
                    <Link href="/#Services" className="hover:text-blue-600 px-2">
                        SERVICES
                    </Link>
                    <Link href="/#Contact" className="hover:text-blue-600 px-2">
                        CONTACT
                    </Link>
                </nav>

                {/* Connect Wallet and Light/Dark Toggle for Desktop */}
                <div className="hidden md:flex items-center space-x-4">
                    {address ? (
                        <Link href="./my-cats">
                            <Avatar />
                        </Link>
                    ) : (
                        <ConnectWallet />
                    )}
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
};

export default Navbar;
