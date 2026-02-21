"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, X } from "lucide-react";
import { getSheetIds, getSheetData, StudentData } from "./actions";
import { motion, AnimatePresence } from "framer-motion";
import { flushSync } from "react-dom";

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
	const newArr = [...array];
	for (let i = newArr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[newArr[i], newArr[j]] = [newArr[j], newArr[i]];
	}
	return newArr;
}

export default function Home() {
	const { theme, setTheme } = useTheme();

	const [ids, setIds] = useState<string[]>([]);
	const [selectedMatkul, setSelectedMatkul] = useState<string>("");
	const [selectedClass, setSelectedClass] = useState<string>("");
	const [allData, setAllData] = useState<StudentData[] | null>(null);
	const [shuffledStudents, setShuffledStudents] = useState<StudentData[]>([]);

	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const [unavailableSeats, setUnavailableSeats] = useState<Set<number>>(new Set());
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	// Fetch initial Matkul IDs
	useEffect(() => {
		getSheetIds().then((fetchedIds) => {
			setIds(fetchedIds);
			if (fetchedIds.length > 0) {
				setSelectedMatkul(fetchedIds[0]);
			}
		});
	}, []);

	// Fetch data when Matkul changes
	useEffect(() => {
		if (!selectedMatkul) return;

		let isMounted = true;
		setLoading(true);
		setError(null);
		setAllData(null);
		setSelectedClass(""); // Reset class when Matkul changes

		getSheetData(selectedMatkul)
			.then((result) => {
				if (!isMounted) return;
				if (result) {
					setAllData(result);
				} else {
					setError("Failed to fetch data or sheet is empty.");
				}
			})
			.catch((err) => {
				if (!isMounted) return;
				setError(err.message || "An error occurred.");
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [selectedMatkul]);

	// Extract unique classes from the data
	const classes = useMemo(() => {
		if (!allData) return [];
		const classSet = new Set<string>();
		allData.forEach((row) => {
			const cls = row["Kelas"] || row["Class"];
			if (cls && typeof cls === "string" && cls.trim() !== "") {
				classSet.add(cls.trim());
			}
		});
		return Array.from(classSet).sort();
	}, [allData]);

	// Auto-select the first class when classes are loaded
	useEffect(() => {
		if (classes.length > 0 && !selectedClass) {
			setSelectedClass(classes[0]);
		}
	}, [classes, selectedClass]);

	// Shuffle logic: re-evaluate whenever selectedClass or allData changes
	const performShuffle = useCallback(() => {
		if (!allData || !selectedClass) {
			setShuffledStudents([]);
			return;
		}
		const filtered = allData.filter((row) => {
			const cls = row["Kelas"] || row["Class"];
			return cls && cls.trim() === selectedClass;
		});
		setShuffledStudents(shuffleArray(filtered));
	}, [allData, selectedClass]);

	useEffect(() => {
		performShuffle();
	}, [performShuffle]);


	// Toggle seat availability
	const toggleSeat = (seatNum: number) => {
		setUnavailableSeats((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(seatNum)) {
				newSet.delete(seatNum);
			} else {
				newSet.add(seatNum);
			}
			return newSet;
		});
	};

	// Generate the seating map
	const seats = useMemo(() => {
		const totalSeats = 50;
		const layout = [];
		let studentIndex = 0;

		for (let i = 1; i <= totalSeats; i++) {
			if (unavailableSeats.has(i)) {
				layout.push({ seatNumber: i, isAvailable: false, student: null });
			} else {
				if (studentIndex < shuffledStudents.length) {
					layout.push({ seatNumber: i, isAvailable: true, student: shuffledStudents[studentIndex] });
					studentIndex++;
				} else {
					// Empty available seat
					layout.push({ seatNumber: i, isAvailable: true, student: null });
				}
			}
		}
		return layout;
	}, [shuffledStudents, unavailableSeats]);

	// Split seats into 5 tables of 10
	const tables = useMemo(() => {
		const chunks = [];
		for (let i = 0; i < 5; i++) {
			chunks.push(seats.slice(i * 10, (i + 1) * 10));
		}
		return chunks;
	}, [seats]);

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
						<h2 className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider">Made by Rafi ATHALLAH</h2>
						<button
							onClick={() => setIsSidebarOpen(false)}
							className="md:hidden p-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="matkul-select" className="text-xs text-zinc-500 dark:text-zinc-400">
							Matkul
						</label>
						<select
							id="matkul-select"
							value={selectedMatkul}
							onChange={(e) => setSelectedMatkul(e.target.value)}
							className="w-full appearance-none rounded-lg border border-zinc-300 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 transition-colors"
						>
							{ids.map((id) => (
								<option key={id} value={id}>
									{id}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="kelas-select" className="text-xs text-zinc-500 dark:text-zinc-400">
							Kelas
						</label>
						<select
							id="kelas-select"
							value={selectedClass}
							onChange={(e) => setSelectedClass(e.target.value)}
							className="w-full appearance-none rounded-lg border border-zinc-300 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 transition-colors disabled:opacity-50"
							disabled={!classes.length}
						>
							<option value="">Select a class...</option>
							{classes.map((cls) => (
								<option key={cls} value={cls}>
									{cls}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-4 mt-2">
						<span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">Pilih nomor meja yang tidak bisa digunakan:</span>
						<div className="grid grid-cols-5 gap-y-3 gap-x-2">
							{Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
								<label key={num} className="flex flex-col items-center gap-1 cursor-pointer group">
									<input
										type="checkbox"
										checked={unavailableSeats.has(num)}
										onChange={() => toggleSeat(num)}
										className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:checked:bg-blue-500 cursor-pointer"
									/>
									<span className="text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">{num}</span>
								</label>
							))}
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
						<div className="w-8 h-8 bg-amber-900 dark:bg-amber-800 rounded flex items-center justify-center text-white shadow-sm">
							<svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
								<path d="M7 19v-2h10v2h2v-6c0-1.1-.9-2-2-2h-3v-2c1.7 0 3.1-1.3 3.1-3S15.7 3 14 3h-4c-1.7 0-3.1 1.3-3.1 3s1.4 3 3.1 3v2H7c-1.1 0-2 .9-2 2v6h2zm2-14h6v2H9V5zm7 8v4H8v-4h8z" />
							</svg>
						</div>
						<h1 className="text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight truncate">
							Generator Genap 26/27
						</h1>
					</div>

					<div className="flex items-center gap-2">
						<a
							href="/realtime"
							target="_blank"
							className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors hidden sm:block"
						>
							Setup Ujian
						</a>
						<button
							onClick={performShuffle}
							className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors hidden sm:block"
						>
							Ganti Tempat Duduk
						</button>
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
						<p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium mb-4">Hasil:</p>

						{loading ? (
							<div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg w-fit shadow-sm">
								<div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
								Loading student data...
							</div>
						) : error ? (
							<div className="text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-lg w-fit font-medium shadow-sm flex items-center gap-2">
								<X className="w-5 h-5 flex-shrink-0" /> {error}
							</div>
						) : (
							<div className="flex flex-col xl:flex-row gap-4 flex-1">
								{tables.map((table, tIndex) => (
									<div key={tIndex} className="flex-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-w-0">
										<div className="flex-1">
											<table className="w-full text-left text-sm whitespace-normal">
												<thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
													<tr>
														<th className="py-3 px-2 text-zinc-500 dark:text-zinc-400 font-medium w-8 border-r border-zinc-200 dark:border-zinc-800 text-center text-xs uppercase tracking-wider">NO</th>
														<th className="py-3 px-3 text-zinc-500 dark:text-zinc-400 font-medium border-r border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-wider">NIM</th>
														<th className="py-3 px-2 text-zinc-500 dark:text-zinc-400 font-medium w-16 text-center text-xs uppercase tracking-wider">ASPRAK</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
													{table.map((row) => {
														const isError = !row.isAvailable;
														const studentName = row.student ? (row.student["NIM"] || row.student["Nama"] || row.student["Name"] || "") : "";
														const studentAsprak = row.student ? (row.student["ASPRAK"] || row.student["Asprak"] || "") : "";

														return (
															<tr key={row.seatNumber} className={`h-[48px] 2xl:h-[60px] transition-colors ${isError ? 'bg-red-500 dark:bg-red-600' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
																<td className={`py-2 px-2 border-r border-zinc-100 dark:border-zinc-800/80 text-center font-medium ${isError ? 'text-transparent' : 'text-zinc-500 dark:text-zinc-400'}`}>
																	{row.seatNumber}
																</td>
																<td className={`py-2 px-3 border-r border-zinc-100 dark:border-zinc-800/80 font-medium text-xs sm:text-sm leading-tight ${isError ? 'text-transparent' : 'text-zinc-800 dark:text-zinc-200'} overflow-hidden`} title={studentName}>
																	{!isError && (
																		<div className="relative w-full h-full flex flex-col justify-center min-h-[30px] overflow-hidden">
																			<AnimatePresence mode="popLayout" initial={false}>
																				{studentName ? (
																					<motion.div
																						key={studentName}
																						initial={{ opacity: 0, y: -20, filter: "blur(2px)" }}
																						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
																						exit={{ opacity: 0, y: 20, filter: "blur(2px)" }}
																						transition={{ type: "spring", stiffness: 300, damping: 25 }}
																						className="absolute line-clamp-2 w-full"
																					>
																						{studentName}
																					</motion.div>
																				) : null}
																			</AnimatePresence>
																		</div>
																	)}
																</td>
																<td className={`py-2 px-2 text-center text-xs sm:text-sm ${isError ? 'text-transparent' : 'text-zinc-600 dark:text-zinc-400'} font-medium overflow-hidden`}>
																	{!isError && (
																		<div className="relative w-full h-full flex flex-col items-center justify-center min-h-[30px] overflow-hidden">
																			<AnimatePresence mode="popLayout" initial={false}>
																				{studentAsprak ? (
																					<motion.div
																						key={studentName + studentAsprak}
																						initial={{ opacity: 0, scale: 0.5 }}
																						animate={{ opacity: 1, scale: 1 }}
																						exit={{ opacity: 0, scale: 0.5 }}
																						transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.05 }}
																						className="absolute inset-0 flex items-center justify-center"
																					>
																						{studentAsprak}
																					</motion.div>
																				) : null}
																			</AnimatePresence>
																		</div>
																	)}
																</td>
															</tr>
														)
													})}
												</tbody>
											</table>
										</div>
									</div>
								))}
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
