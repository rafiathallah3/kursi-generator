'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, X, RadioReceiver, Trophy, Clock, Zap, FileSpreadsheet, Copy, Check, Timer } from "lucide-react";

function parseTimeTaken(timeStr: string): number {
    if (!timeStr || timeStr === '-' || timeStr === 'Not yet graded') return Infinity;

    let totalMinutes = 0;

    const hoursMatch = timeStr.match(/(\d+)\s*hour/i);
    if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1]) * 60;
    }

    const minsMatch = timeStr.match(/(\d+)\s*min/i);
    if (minsMatch) {
        totalMinutes += parseInt(minsMatch[1]);
    }

    const secsMatch = timeStr.match(/(\d+)\s*sec/i);
    if (secsMatch) {
        totalMinutes += parseInt(secsMatch[1]) / 60;
    }

    return totalMinutes === 0 ? Infinity : totalMinutes;
}

export default function RealtimeDataPage() {
    const { theme, setTheme } = useTheme();

    const [realtimeData, setRealtimeData] = useState<any[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [roomInput, setRoomInput] = useState<string>('IF-48-INT');
    const [activeRoom, setActiveRoom] = useState<string>('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

    // Timer States
    const [timerMode, setTimerMode] = useState<'duration' | 'range'>('duration');
    const [durationMinutes, setDurationMinutes] = useState<number>(60);
    const [rangeStart, setRangeStart] = useState<string>('');
    const [rangeEnd, setRangeEnd] = useState<string>('');
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    // Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (targetDate) {
            interval = setInterval(() => {
                const now = new Date().getTime();
                const distance = targetDate.getTime() - now;

                if (distance <= 0) {
                    setTimeRemaining(0);
                    clearInterval(interval);
                } else {
                    setTimeRemaining(Math.floor(distance / 1000));
                }
            }, 1000);

            // Initial call to set time immediately instead of waiting 1s
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;
            if (distance <= 0) {
                setTimeRemaining(0);
            } else {
                setTimeRemaining(Math.floor(distance / 1000));
            }
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [targetDate]);

    // Format Remaining Time
    const formatTimeRemaining = () => {
        if (timeRemaining === null) return null;
        if (timeRemaining <= 0) return "00:00:00";

        const h = Math.floor(timeRemaining / 3600);
        const m = Math.floor((timeRemaining % 3600) / 60);
        const s = timeRemaining % 60;

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStartTimer = () => {
        if (timerMode === 'duration') {
            const dest = new Date();
            dest.setMinutes(dest.getMinutes() + durationMinutes);
            setTargetDate(dest);
        } else {
            if (!rangeEnd) return;
            const dest = new Date();
            const [endH, endM] = rangeEnd.split(':').map(Number);
            dest.setHours(endH, endM, 0, 0);

            // If end time is earlier than current time, assume it's for tomorrow to avoid instant expiry
            if (dest.getTime() < new Date().getTime()) {
                dest.setDate(dest.getDate() + 1);
            }
            setTargetDate(dest);
        }
    };

    const handleStopTimer = () => {
        setTargetDate(null);
        setTimeRemaining(null);
    };

    const copyScript = () => {
        const script = `fetch('https://superaverage-deloise-addictedly.ngrok-free.dev/api/process-html?room=${activeRoom}', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    },
    body: document.getElementById('attempts').outerHTML
}).then(v => v.json()).then(v => {console.log(v)});`;
        navigator.clipboard.writeText(script);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    useEffect(() => {
        document.title = "Setup Ujian - Leaderboard";
    }, []);

    useEffect(() => {
        // Reset state when switching rooms
        setRealtimeData([]);
        setLastUpdated(null);
        setIsConnected(false);

        // Connect to our Next.js Server-Sent Events endpoint with the specific room
        const eventSource = new EventSource(`/api/stream?room=${encodeURIComponent(activeRoom || 'default')}`);

        eventSource.onopen = () => {
            setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const incomingData = JSON.parse(event.data);

                // Set the newest incoming data batch
                if (Array.isArray(incomingData)) {
                    // Sort as a Leaderboard: 'Finished' first, then closest time taken
                    const sortedData = incomingData.sort((a, b) => {
                        const stateA = a['State'] || '';
                        const stateB = b['State'] || '';

                        // Both Finished: Sort by Time Taken
                        if (stateA === 'Finished' && stateB === 'Finished') {
                            const timeA = parseTimeTaken(a['Time taken'] || '');
                            const timeB = parseTimeTaken(b['Time taken'] || '');
                            return timeA - timeB;
                        }

                        // One Finished: It goes to the top
                        if (stateA === 'Finished' && stateB !== 'Finished') return -1;
                        if (stateA !== 'Finished' && stateB === 'Finished') return 1;

                        // Neither Finished: Sort by Time Taken as well or leave as is
                        const timeA = parseTimeTaken(a['Time taken'] || '');
                        const timeB = parseTimeTaken(b['Time taken'] || '');
                        return timeA - timeB;
                    });

                    setRealtimeData([...sortedData]);
                    setLastUpdated(new Date().toLocaleTimeString());
                }
            } catch (error) {
                console.error("Failed parsing message:", error);
            }
        };

        eventSource.onerror = () => {
            console.error('SSE Error occurred');
            setIsConnected(false);
        };

        return () => {
            eventSource.close();
        };
    }, [activeRoom]);

    const hasData = realtimeData.length > 0;
    const headers = hasData ? Object.keys(realtimeData[0]) : [];

    const handleJoinClick = () => {
        if (roomInput) {
            setActiveRoom(roomInput);
            setHasJoined(true);
        }
    };

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-sm text-zinc-900 overflow-hidden transition-colors duration-200">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden opacity-0'} 
				transition-all duration-300 ease-in-out flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full absolute md:relative z-20`}
            >
                <div className="p-6 flex flex-col gap-6 h-full overflow-y-auto w-64">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider">MADE BY RAFI ATHALLAH</h2>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden p-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="room-input" className="text-xs text-zinc-500 dark:text-zinc-400">
                            Channel / Class
                        </label>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700">
                            <input
                                id="room-input"
                                type="text"
                                value={roomInput}
                                onChange={(e) => setRoomInput(e.target.value)}
                                placeholder="Channel / Class"
                                className="bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-100 px-2 py-1.5 text-sm w-full placeholder:text-zinc-400"
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinClick()}
                            />
                        </div>
                        <button
                            onClick={handleJoinClick}
                            disabled={!roomInput || (roomInput === activeRoom && hasJoined)}
                            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 px-4 py-2.5 rounded-lg text-sm text-white font-medium transition-colors shadow-sm"
                        >
                            Listen
                        </button>
                    </div>

                    <div className="flex flex-col gap-4 mt-2">
                        <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">Status Koneksi:</span>

                        <div className="flex items-center gap-3 text-sm bg-zinc-100 dark:bg-zinc-800/50 px-3 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <div className="relative flex h-3 w-3 flex-shrink-0">
                                {isConnected ? (
                                    <>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </>
                                ) : (
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                )}
                            </div>
                            <span className="text-zinc-700 dark:text-zinc-300 font-medium tracking-wide text-xs truncate">
                                {isConnected ? `CONNECTED: ${activeRoom}` : 'DISCONNECTED'}
                            </span>
                        </div>

                        {lastUpdated && (
                            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
                                <Clock className="w-4 h-4" />
                                <span>Updated: <strong className="text-zinc-800 dark:text-zinc-200">{lastUpdated}</strong></span>
                            </div>
                        )}

                        {hasJoined && (
                            <div className="flex flex-col gap-2 mt-4">
                                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">Script Ujian (Copy & Paste ke Console Moodle):</span>
                                <div className="relative group bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 pr-10">
                                    <pre className="text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-wrap break-all h-28 overflow-y-auto custom-scrollbar select-all">
                                        {`fetch('https://superaverage-deloise-addictedly.ngrok-free.dev/api/process-html?room=${activeRoom}', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    },
    body: document.getElementById('attempts').outerHTML
}).then(v => v.json()).then(v => {console.log(v)});`}
                                    </pre>
                                    <button
                                        onClick={copyScript}
                                        className="absolute top-2 right-2 p-1.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-colors shadow-sm"
                                        title={isCopied ? "Copied!" : "Copy Script"}
                                    >
                                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-6 w-full">
                            <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium tracking-wider flex items-center gap-2">
                                <Timer className="w-4 h-4 text-zinc-500" />
                                PENGATURAN WAKTU
                            </span>

                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setTimerMode('duration')}
                                    className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${timerMode === 'duration' ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                >
                                    Durasi (Menit)
                                </button>
                                <button
                                    onClick={() => setTimerMode('range')}
                                    className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${timerMode === 'range' ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                >
                                    Pukul Selesai
                                </button>
                            </div>

                            {timerMode === 'duration' ? (
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                        className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors w-full"
                                        placeholder="Misal: 60"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-1 w-full flex-1">
                                        <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">Mulai</label>
                                        <input
                                            type="time"
                                            value={rangeStart}
                                            onChange={(e) => setRangeStart(e.target.value)}
                                            className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-800 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors w-full"
                                        />
                                    </div>
                                    <span className="text-zinc-400 mt-4">-</span>
                                    <div className="flex flex-col gap-1 w-full flex-1">
                                        <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">Selesai</label>
                                        <input
                                            type="time"
                                            value={rangeEnd}
                                            onChange={(e) => setRangeEnd(e.target.value)}
                                            className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-800 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors w-full"
                                        />
                                    </div>
                                </div>
                            )}

                            {!targetDate ? (
                                <button
                                    onClick={handleStartTimer}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm"
                                >
                                    Mulai Waktu
                                </button>
                            ) : (
                                <button
                                    onClick={handleStopTimer}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm"
                                >
                                    Hentikan Waktu
                                </button>
                            )}
                        </div>
                    </div>
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
                        <div className="w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight truncate">
                            Leaderboard - {activeRoom}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href="/"
                            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors hidden sm:block"
                        >
                            Generator Kursi
                        </a>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Toggle Theme"
                        >
                            <Sun className="h-5 w-5 dark:hidden" />
                            <Moon className="h-5 w-5 hidden dark:block" />
                        </button>
                    </div>
                </header>

                {/* Scrollable Tables View Container */}
                <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center">
                    <div className="w-full flex-1 flex flex-col max-w-[1600px]">
                        {targetDate && (
                            <div className="w-full flex justify-center mb-8 mt-2">
                                <div className={`flex flex-col items-center justify-center py-6 px-16 bg-white dark:bg-zinc-900 border ${timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0 ? 'border-red-500 dark:border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-zinc-200 dark:border-zinc-800 shadow-sm'} rounded-3xl transition-all duration-300`}>
                                    <h2 className={`text-xs ${timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0 ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'} font-bold tracking-[0.25em] uppercase mb-1`}>
                                        TIME REMAINING
                                    </h2>
                                    <div className={`text-6xl md:text-7xl font-black tabular-nums tracking-tighter ${timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0 ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-zinc-800 dark:text-white'}`}>
                                        {formatTimeRemaining()}
                                    </div>
                                    {timerMode === 'range' && rangeEnd && (
                                        <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 font-medium">
                                            Akan berakhir pada {rangeEnd}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!hasData ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                <FileSpreadsheet className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4" />
                                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Menunggu Data...</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm">
                                    Send a raw HTML table to <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">/api/process-html?room={encodeURIComponent(activeRoom || 'default')}</code>.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden overflow-x-auto flex flex-col min-w-0">
                                <table className="w-full text-left text-sm whitespace-normal">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                                        <tr>
                                            <th className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium border-r border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider w-12 text-center">Rnk</th>
                                            {headers.map((header, idx) => (
                                                <th key={idx} className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium border-r border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider whitespace-nowrap">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                        {realtimeData.map((row, rowIndex) => {
                                            const isFinished = row['State'] === 'Finished';
                                            return (
                                                <tr key={rowIndex} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${isFinished ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                                                    <td className="py-3 px-4 border-r border-zinc-100 dark:border-zinc-800/80 text-center font-bold text-zinc-500 dark:text-zinc-400">
                                                        {rowIndex + 1}
                                                    </td>
                                                    {headers.map((header, colIndex) => (
                                                        <td key={colIndex} className={`py-3 px-4 border-r border-zinc-100 dark:border-zinc-800/80 ${isFinished ? 'text-emerald-800 dark:text-emerald-200' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                            {row[header] || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
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
