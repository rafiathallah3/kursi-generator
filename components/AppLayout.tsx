"use client";

import { useState } from "react";
import { Menu, X, Github } from "lucide-react";

interface AppLayoutProps {
    sidebarContent: React.ReactNode;
    headerLeftContent?: React.ReactNode;
    headerRightContent?: React.ReactNode;
    children: React.ReactNode;
}

export default function AppLayout({ sidebarContent, headerLeftContent, headerRightContent, children }: AppLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-sm text-zinc-900 overflow-hidden transition-colors duration-200">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden opacity-0'} 
				transition-all duration-300 ease-in-out flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full absolute md:relative z-20`}
            >
                <div className="p-6 flex flex-col gap-6 h-full overflow-y-auto w-64">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                            <h2 className="font-semibold uppercase text-xs tracking-wider">MADE BY RAFI ATHALLAH</h2>
                            <a href="https://github.com/rafiathallah3/kursi-generator" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <Github className="w-4 h-4" />
                            </a>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden p-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {sidebarContent}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                {/* Header Ribbon */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 -ml-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Toggle Sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        {headerLeftContent}
                    </div>

                    <div className="flex items-center gap-2">
                        {headerRightContent}
                    </div>
                </header>

                {/* Content */}
                {children}
            </main>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-10 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}
        </div>
    );
}
