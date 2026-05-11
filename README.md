# Kursi Generator & Realtime Leaderboard

A web application built with Next.js for managing praktikum seating and monitoring realtime praktikum journal progress.

## Features

- **Kursi Generator**: Effortlessly generate and manage praktikum seating arrangements.
- **Realtime Leaderboard**: Monitor student progress in realtime via SSE (Server-Sent Events).
- **Auto-Processing**: Automatically parses Moodle/HTML tables into a clean leaderboard format.
- **Visual Statistics**: Track completion and praktikum journal performance with dynamic charts and cards.
- **Stale Data Detection**: Built-in indicator to alert when the leaderboard data hasn't been refreshed recently.
- **Responsive Design**: Fully optimized for both desktop and mobile viewing with a premium dark/light mode.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rafiathallah3/kursi-generator.git
   cd kursi-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file and add:
   ```env
   NEXT_PUBLIC_URL_LINK=your_backend_url
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.