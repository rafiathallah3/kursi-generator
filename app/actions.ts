"use server";

import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";

export type StudentData = {
    NIM: string;
    Kelas: string;
    ASPRAK: string;
    [key: string]: any;
};

export async function getSheetIds(): Promise<string[]> {
    try {
        const dataPath = path.join(process.cwd(), "data.json");
        const fileContent = await fs.readFile(dataPath, "utf-8");
        const data: Record<string, string> = JSON.parse(fileContent);
        return Object.keys(data);
    } catch (error) {
        console.error("Error fetching sheet IDs:", error);
        return [];
    }
}

export async function getSheetData(id: string): Promise<StudentData[] | null> {
    try {
        const dataPath = path.join(process.cwd(), "data.json");
        const fileContent = await fs.readFile(dataPath, "utf-8");
        const data: Record<string, string> = JSON.parse(fileContent);

        const sheetUrl = data[id];
        if (!sheetUrl) return null;

        const urlObj = new URL(sheetUrl);
        urlObj.pathname = urlObj.pathname.replace(/\/edit$/, '/export');
        urlObj.searchParams.set("format", "csv");
        const finalUrl = urlObj.toString();

        const response = await fetch(finalUrl, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.statusText} from ${finalUrl}`);
        }

        const csvText = await response.text();

        // Check if the response is actually an HTML redirect/error page
        if (csvText.toLowerCase().includes("<html")) {
            console.error("Received HTML instead of CSV. Possibly an access/redirect issue.", csvText.substring(0, 500));
            return null;
        }

        const result = Papa.parse<StudentData>(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        return result.data;
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        return null;
    }
}
