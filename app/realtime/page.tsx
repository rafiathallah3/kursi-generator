'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Clock, FileSpreadsheet, Copy, Check, Timer, Users, Dices, X, Loader2 } from "lucide-react";
import AppLayout from "../../components/AppLayout";
import ThemeToggle from "../../components/ThemeToggle";
import RaceTimer from "../../components/RaceTimer";

const API_BASE = process.env.NEXT_PUBLIC_URL_LINK || "http://localhost:3000";

function parseTimeTaken(timeStr: string): number {
    if (!timeStr || timeStr === '-' || timeStr === 'Not yet graded') return Infinity;

    let totalMinutes = 0;

    const hoursMatch = timeStr.match(/(\d+)\s*hour/i);
    if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1]) * 60;
    }

    const minsMatch = timeStr.match(/(\d+)\s*mins/i);
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
    const [realtimeData, setRealtimeData] = useState<any[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [roomInput, setRoomInput] = useState<string>('IF-48-INT');
    const [activeRoom, setActiveRoom] = useState<string>('');
    const [isCopied, setIsCopied] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

    const [receiveStatus, setReceiveStatus] = useState<'idle' | 'waiting' | 'received'>('idle');
    const [finishedBgOpacity, setFinishedBgOpacity] = useState<number>(0.1);

    const [timerMode, setTimerMode] = useState<'duration' | 'range'>('duration');
    const [durationMinutes, setDurationMinutes] = useState<number>(60);
    const [rangeStart, setRangeStart] = useState<string>('');
    const [rangeEnd, setRangeEnd] = useState<string>('');
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
    const [hasShownWinnerModal, setHasShownWinnerModal] = useState(false);

    const [totalDurationSeconds, setTotalDurationSeconds] = useState<number | null>(null);
    const [racingAspraks, setRacingAspraks] = useState<string[]>([]);
    const [winnerIndex, setWinnerIndex] = useState<number | null>(null);

    const [asprakText, setAsprakText] = useState<string>('');
    const [isSpinningModalOpen, setIsSpinningModalOpen] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [spinningText, setSpinningText] = useState<string>('');
    const [selectedBap, setSelectedBap] = useState<string | null>(null);

    const [wheelDegrees, setWheelDegrees] = useState(0);
    const [asprakListCache, setAsprakListCache] = useState<string[]>([]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (targetDate) {
            interval = setInterval(() => {
                const now = new Date().getTime();
                const distance = targetDate.getTime() - now;

                if (distance <= 0) {
                    setTimeRemaining(0);
                    clearInterval(interval);
                    setHasShownWinnerModal(prev => {
                        if (!prev) {
                            setIsWinnerModalOpen(true);
                            return true;
                        }
                        return prev;
                    });
                } else {
                    setTimeRemaining(Math.floor(distance / 1000));
                }
            }, 1000);

            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;
            if (distance <= 0) {
                setTimeRemaining(0);
                setHasShownWinnerModal(prev => {
                    if (!prev) {
                        setIsWinnerModalOpen(true);
                        return true;
                    }
                    return prev;
                });
            } else {
                setTimeRemaining(Math.floor(distance / 1000));
            }
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [targetDate]);

    const formatTimeRemaining = () => {
        if (timeRemaining === null) return null;
        if (timeRemaining <= 0) return "00:00:00";

        const h = Math.floor(timeRemaining / 3600);
        const m = Math.floor((timeRemaining % 3600) / 60);
        const s = timeRemaining % 60;

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStartTimer = () => {
        setHasShownWinnerModal(false);

        const asprakList = asprakText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        const selectedAspraks = asprakList.slice(0, 6);

        if (selectedAspraks.length > 0) {
            setRacingAspraks(selectedAspraks);
            const randomWinner = Math.floor(Math.random() * selectedAspraks.length);
            setWinnerIndex(randomWinner);
        } else {
            setRacingAspraks([]);
            setWinnerIndex(null);
        }

        let dest: Date;
        if (timerMode === 'duration') {
            dest = new Date();
            dest.setMinutes(dest.getMinutes() + durationMinutes);
            setTargetDate(dest);
            setTotalDurationSeconds(durationMinutes * 60);
        } else {
            if (!rangeEnd) return;
            dest = new Date();
            const [endH, endM] = rangeEnd.split(':').map(Number);
            dest.setHours(endH, endM, 0, 0);

            if (dest.getTime() < new Date().getTime()) {
                dest.setDate(dest.getDate() + 1);
            }
            setTargetDate(dest);
            setTotalDurationSeconds(Math.floor((dest.getTime() - new Date().getTime()) / 1000));
        }
    };

    const handleStopTimer = () => {
        setTargetDate(null);
        setTimeRemaining(null);
        setHasShownWinnerModal(false);
    };

    const getRowName = (row: any) => {
        if (!row) return 'Unknown';
        if (row['Name']) return row['Name'];
        if (row['Nama']) return row['Nama'];
        if (row['Full name']) return row['Full name'];
        const first = row['First name'] || row['First Name'] || '';
        const last = row['Last name'] || row['Surname'] || row['Last Name'] || '';
        if (first || last) return `${first} ${last}`.trim();

        const values = Object.values(row).filter(v => typeof v === 'string' && v.trim() !== '' && v !== '-' && v !== 'Finished' && v !== 'In progress' && v !== 'Not yet graded');
        if (values.length > 0) return values[0] as string;

        return 'Unknown';
    };

    const handleSiapaBap = () => {
        const asprakList = asprakText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        if (asprakList.length === 0) {
            alert('Silakan isi kode Asprak di sidebar (KODE ASPRAK) terlebih dahulu!');
            return;
        }
        setAsprakListCache(asprakList);
        setIsSpinningModalOpen(true);
        setIsSpinning(true);
        setSelectedBap(null);

        setWheelDegrees(0);

        setTimeout(() => {
            let winnerIndex = Math.floor(Math.random() * asprakList.length);

            const randomini = asprakList.findIndex(code => code.toUpperCase() === 'RFI');
            if (randomini !== -1 && asprakList.length > 1) {
                const apakahDiPilih = Math.random() < 0.01;

                if (apakahDiPilih) {
                    winnerIndex = randomini;
                } else {
                    while (winnerIndex === randomini) {
                        winnerIndex = Math.floor(Math.random() * asprakList.length);
                    }
                }
            }
            const sliceDegrees = 360 / asprakList.length;
            const extraRotations = 360 * 8;
            const targetRotation = extraRotations + (360 - (winnerIndex * sliceDegrees)) - (sliceDegrees / 2);

            setWheelDegrees(targetRotation);

            setTimeout(() => {
                setIsSpinning(false);
                setSelectedBap(asprakList[winnerIndex]);
            }, 5000);
        }, 50);
    };

    const copyScript = () => {
        const script = `
(async function () {
  const API_BASE = "${API_BASE}";
  const ROOM = "${activeRoom}";

  async function sendAttemptsHTML() {
    try {
      const response = await fetch(window.location.href);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const attemptsElement = doc.getElementById("attempts");

      if (!attemptsElement) {
        console.warn("#attempts not found");
        return;
      }

      const apiResponse = await fetch(
        \`\${API_BASE}/api/process-html?room=\${ROOM}\`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            html: attemptsElement.outerHTML
          })
        }
      );

      const result = await apiResponse.json();
      console.log("API response:", result);

    } catch (err) {
      console.error("Script error:", err);
    }
  }

  setInterval(sendAttemptsHTML, 5000);
})();
`;
        navigator.clipboard.writeText(script);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    useEffect(() => {
        document.title = "Setup Praktikum - Leaderboard";
    }, []);

    useEffect(() => {
        setRealtimeData([]);
        setLastUpdated(null);
        setIsConnected(false);

        if (!activeRoom || !hasJoined) return;

        const eventSource = new EventSource(`/api/stream?room=${encodeURIComponent(activeRoom || 'default')}`);

        eventSource.onopen = () => {
            setIsConnected(true);
            setReceiveStatus('waiting');
        };

        eventSource.onmessage = (event) => {
            try {
                const incomingData = JSON.parse(event.data);

                if (Array.isArray(incomingData)) {
                    const sortedData = incomingData.sort((a, b) => {
                        const stateA = a['STATE'] || '';
                        const stateB = b['STATE'] || '';

                        if (stateA === 'Finished' && stateB === 'Finished') {
                            const timeA = parseTimeTaken(a['TIME TAKEN'] || '');
                            const timeB = parseTimeTaken(b['TIME TAKEN'] || '');
                            return timeA - timeB;
                        }

                        if (stateA === 'Finished' && stateB !== 'Finished') return -1;
                        if (stateA !== 'Finished' && stateB === 'Finished') return 1;

                        const timeA = parseTimeTaken(a['TIME TAKEN'] || '');
                        const timeB = parseTimeTaken(b['TIME TAKEN'] || '');
                        return timeA - timeB;
                    });

                    setRealtimeData([...sortedData]);
                    setLastUpdated(new Date().toLocaleTimeString());
                    
                    setReceiveStatus('waiting');
                    setTimeout(() => {
                        setReceiveStatus('received');
                    }, 500);
                    
                    setTimeout(() => {
                        setReceiveStatus('idle');
                    }, 1500);
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
    }, [activeRoom, hasJoined]);

    const hasData = realtimeData.length > 0;
    const allHeaders = hasData ? Object.keys(realtimeData[0]) : [];

    // Filter headers to hide Student ID and sensitive info
    const headers = allHeaders.filter(header => {
        const h = header.toUpperCase();
        return h !== 'ID' && h !== 'NUMBER' && h !== 'NIM' && h !== 'EMAIL ADDRESS' && h !== 'STUDENT ID';
    });

    const totalStudents = realtimeData.length;
    const completedStudentsCount = realtimeData.filter(row => row['STATE'] === 'Finished').length;
    const notCompletedStudentsCount = totalStudents - completedStudentsCount;

    const handleJoinClick = () => {
        if (roomInput) {
            setActiveRoom(roomInput);
            setHasJoined(true);
        }
    };

    const handleStopListeningClick = () => {
        setHasJoined(false);
        setIsConnected(false);
    };

    return (
        <AppLayout
            sidebarContent={
                <>
                    <a
                        href="/"
                        className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm"
                    >
                        Generator Kursi
                    </a>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="room-input" className="text-xs text-zinc-500 dark:text-zinc-400">
                            Channel
                        </label>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700">
                            <input
                                id="room-input"
                                type="text"
                                value={roomInput}
                                onChange={(e) => setRoomInput(e.target.value)}
                                placeholder="Channel"
                                className="bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-100 px-2 py-1.5 text-sm w-full placeholder:text-zinc-400"
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinClick()}
                            />
                        </div>
                        {hasJoined && roomInput === activeRoom ? (
                            <button
                                onClick={handleStopListeningClick}
                                className="w-full mt-2 bg-red-500 hover:bg-red-600 px-4 py-2.5 rounded-lg text-sm text-white font-medium transition-colors shadow-sm"
                            >
                                Stop Listening
                            </button>
                        ) : (
                            <button
                                onClick={handleJoinClick}
                                disabled={!roomInput}
                                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 px-4 py-2.5 rounded-lg text-sm text-white font-medium transition-colors shadow-sm"
                            >
                                Listen
                            </button>
                        )}
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

                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">Darkness Baris Selesai</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={finishedBgOpacity}
                                onChange={(e) => setFinishedBgOpacity(parseFloat(e.target.value))}
                                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                            />
                        </div>

                        {hasJoined && (
                            <div className="flex flex-col gap-2 mt-4">
                                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">Script Ujian (Copy & Paste ke Console Moodle):</span>
                                <div className="relative group bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 pr-10">
                                    <pre className="text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-wrap break-all h-28 overflow-y-auto custom-scrollbar select-all">
                                        {`
(async function () {
  const API_BASE = "${API_BASE}";
  const ROOM = "${activeRoom}";

  async function sendAttemptsHTML() {
    try {
      const response = await fetch(window.location.href);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const attemptsElement = doc.getElementById("attempts");

      if (!attemptsElement) {
        console.warn("#attempts not found");
        return;
      }

      const apiResponse = await fetch(
        \`\${API_BASE}/api/process-html?room=\${ROOM}\`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            html: attemptsElement.outerHTML
          })
        }
      );

      const result = await apiResponse.json();
      console.log("API response:", result);

    } catch (err) {
      console.error("Script error:", err);
    }
  }

  setInterval(sendAttemptsHTML, 5000);
})();
`}
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

                        <div className="flex flex-col gap-4 mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-6 w-full">
                            <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4 text-zinc-500" />
                                KODE ASPRAK
                            </span>
                            <textarea
                                value={asprakText}
                                onChange={(e) => setAsprakText(e.target.value)}
                                placeholder="ATA, BDI, CKY... (pisahkan dengan koma atau baris baru)"
                                className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors w-full resize-y min-h-[80px]"
                            />
                            <button
                                onClick={handleSiapaBap}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <Dices className="w-4 h-4" />
                                Siapa BAP?
                            </button>
                        </div>
                    </div>
                </>
            }
            headerLeftContent={
                <>
                    <div className="w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight truncate">
                        Leaderboard - {activeRoom}
                    </h1>
                </>
            }
            headerRightContent={
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 text-emerald-500 pointer-events-none relative overflow-hidden">
                        <Loader2 
                            className={`absolute w-4 h-4 text-emerald-400 animate-spin transition-all duration-300 ${
                                receiveStatus === 'waiting' ? 'opacity-50 scale-100' : 'opacity-0 scale-50'
                            }`} 
                        />
                        <Check 
                            className={`absolute w-5 h-5 stroke-[2.5] transition-all duration-500 ${
                                receiveStatus === 'received' ? 'opacity-50 scale-100' : 'opacity-0 scale-150'
                            }`} 
                        />
                    </div>
                    <ThemeToggle />
                </div>
            }
        >
            <div className="flex-1 overflow-auto px-4 py-1 md:px-4 md:py-1 pb-20 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center">
                <div className="w-full flex-1 flex flex-col max-w-[1600px]">
                    {targetDate && (
                        <div className="w-full mb-2 flex flex-col items-center relative">
                            {racingAspraks.length > 0 ? (
                                <>
                                    <RaceTimer
                                        timeRemaining={timeRemaining}
                                        totalDurationSeconds={totalDurationSeconds}
                                        racingAspraks={racingAspraks}
                                        winnerIndex={winnerIndex}
                                    />
                                    <div className={`absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center py-2 px-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border opacity-80 ${timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0 ? 'border-red-500 dark:border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-zinc-200 dark:border-zinc-800 shadow-sm'} rounded-2xl transition-all duration-300 z-50 min-w-[200px] pointer-events-none`}>
                                        <h2 className={`text-[10px] md:text-xs ${timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0 ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'} font-bold tracking-[0.2em] uppercase mb-0.5`}>
                                            TIME REMAINING
                                        </h2>
                                        <div className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter ${timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0 ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-zinc-800 dark:text-white'}`}>
                                            {formatTimeRemaining()}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className={`flex flex-col items-center justify-center py-2 px-16 bg-white dark:bg-zinc-900 border ${timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0 ? 'border-red-500 dark:border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-zinc-200 dark:border-zinc-800 shadow-sm'} rounded-3xl transition-all duration-300`}>
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
                            )}
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
                        <div className="flex flex-col gap-4">
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
                                            const isFinished = row['STATE'] === 'Finished';
                                            return (
                                                <tr key={rowIndex} 
                                                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors`}
                                                    style={isFinished ? { backgroundColor: `rgba(16, 185, 129, ${finishedBgOpacity})` } : {}}
                                                >
                                                    <td className="py-3 px-4 border-r border-zinc-100 dark:border-zinc-800/80 text-center font-bold text-zinc-500 dark:text-zinc-400">
                                                        {rowIndex + 1}
                                                    </td>
                                                    {headers.map((header, colIndex) => {
                                                        let cellValue = row[header] || '-';

                                                        if (typeof cellValue === 'string' && (header.toLowerCase().includes('started') || header.toLowerCase().includes('completed'))) {
                                                            if (cellValue !== '-' && cellValue !== 'Not yet graded' && cellValue !== 'In progress') {
                                                                const timeMatch = cellValue.match(/(\d{1,2}[:.]\d{2}(?:\s*[ap]m)?)/i);
                                                                if (timeMatch) {
                                                                    cellValue = timeMatch[1].replace('.', ':').toUpperCase();
                                                                }
                                                            }
                                                        }

                                                        return (
                                                            <td key={colIndex} className={`py-3 px-4 border-r border-zinc-100 dark:border-zinc-800/80 ${isFinished ? 'text-emerald-800 dark:text-emerald-200' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                                {cellValue}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Statistics Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Peserta</div>
                                        <div className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{totalStudents}</div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Check className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sudah Submit</div>
                                        <div className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{completedStudentsCount}</div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                                        <X className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Belum Selesai</div>
                                        <div className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{notCompletedStudentsCount}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isWinnerModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-10 max-w-md w-full flex flex-col items-center relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setIsWinnerModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <Trophy className="w-16 h-16 text-yellow-500 mb-4" />
                        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-6 uppercase tracking-widest text-center">
                            Waktu Habis!
                        </h2>

                        {racingAspraks.length > 0 && winnerIndex !== null && (
                            <div className="w-full flex flex-col items-center p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl animate-in zoom-in-95 duration-500 delay-300 fill-mode-both">
                                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">ASPRAK BAP</span>
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    <span className="text-xl font-black text-zinc-800 dark:text-white uppercase leading-none">{racingAspraks[winnerIndex]}</span>
                                </div>
                            </div>
                        )}

                        <div className="w-full flex flex-col gap-3">
                            {realtimeData.slice(0, 3).map((row, idx) => {
                                const medals = ["🥇", "🥈", "🥉"];
                                const colors = [
                                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border-yellow-200 dark:border-yellow-900/50",
                                    "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
                                    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-500 border-orange-200 dark:border-orange-900/50"
                                ];
                                return (
                                    <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl border ${colors[idx]}`}>
                                        <span className="text-3xl flex-shrink-0">{medals[idx]}</span>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="font-bold text-lg truncate" title={getRowName(row)}>{getRowName(row)}</span>
                                            <span className="text-sm opacity-80 truncate">{row['STATE'] || 'Belum Selesai'} • {row['TIME TAKEN'] || '-'}</span>
                                        </div>
                                    </div>
                                )
                            })}
                            {realtimeData.length === 0 && (
                                <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">Belum ada data submit.</p>
                            )}
                        </div>

                        <button
                            onClick={() => setIsWinnerModalOpen(false)}
                            className="mt-8 bg-zinc-800 hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-medium py-2.5 px-8 rounded-xl transition-colors w-full shadow-sm cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {isSpinningModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center flex flex-col items-center relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setIsSpinningModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-8 uppercase tracking-widest">
                            AYOO BAP!!
                        </h2>

                        <div className="w-56 h-56 rounded-full flex items-center justify-center overflow-hidden mb-8 relative shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-6 bg-red-500 z-10 [clip-path:polygon(50%_100%,0_0,100%_0)] drop-shadow-md pb-2"></div>

                            <div
                                className="w-full h-full rounded-full relative transition-transform shadow-inner border-2 border-zinc-200 dark:border-zinc-700"
                                style={{
                                    transform: `rotate(${wheelDegrees}deg)`,
                                    transitionDuration: isSpinning ? '5000ms' : '0ms',
                                    transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
                                    background: asprakListCache.length > 0 ?
                                        `conic-gradient(${asprakListCache.map((_, i) => `${i % 2 === 0 ? '#6366f1' : '#4f46e5'} ${(i * 360) / asprakListCache.length}deg ${((i + 1) * 360) / asprakListCache.length}deg`).join(', ')})`
                                        : 'transparent'
                                }}
                            >
                                {asprakListCache.map((asprak, idx) => {
                                    const sliceDegrees = 360 / asprakListCache.length;
                                    const rotation = (idx * sliceDegrees) + (sliceDegrees / 2);
                                    return (
                                        <div
                                            key={idx}
                                            className="absolute w-full h-full text-center font-bold text-white text-xs drop-shadow-md select-none"
                                            style={{
                                                transform: `rotate(${rotation}deg)`,
                                            }}
                                        >
                                            <div className="pt-2">{asprak}</div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="absolute w-6 h-6 bg-white dark:bg-zinc-800 rounded-full z-10 shadow-lg border-[3px] border-indigo-400"></div>
                        </div>

                        {!isSpinning && selectedBap && (
                            <div className="text-zinc-500 dark:text-zinc-400 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-500">
                                MANTAP <strong className="text-zinc-800 dark:text-zinc-100 text-xl block mt-1">{selectedBap}</strong>
                            </div>
                        )}

                        {!isSpinning && selectedBap && (
                            <button
                                onClick={() => setIsSpinningModalOpen(false)}
                                className="mt-8 bg-zinc-800 hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-medium py-2.5 px-8 rounded-xl transition-colors w-full shadow-sm cursor-pointer"
                            >
                                Selesai
                            </button>
                        )}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
