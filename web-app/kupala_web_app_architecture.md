# Kupala Night Web App - Architecture & Tech Stack Proposal

This document outlines the architecture design and technology stack for the Progressive Web App (PWA) controller described in the **PeachGames v2 (Noc Kupały)** plan.

## 🚀 Technology Stack

To ensure the application runs smoothly on any smartphone without requiring installation from app stores, while allowing rapid development for the organizing team, the following stack is proposed:

*   **Platform:** Progressive Web App (PWA). PWA provides app-like experience (fullscreen, no URL bar) and can be easily accessed via a QR code or simple URL.
*   **Frontend Framework:** **React + Vite + TypeScript**. Vite is extremely fast and lightweight, perfect for this scale compared to heavier SSR frameworks like Next.js.
*   **Styling & UI:** **Vanilla CSS** with modern features (CSS variables, Grid, Flexbox). We will design a rich, immersive aesthetic: Dark Mode by default, glassmorphism UI elements, glowing neon accents matching the elements (Perun/Lightning, Weles/Magic, Mokosz/Nature), and smooth micro-animations. *No TailwindCSS, keeping it purely custom.*
*   **Backend & Real-time:** **Supabase**. It provides PostgreSQL as a service, out-of-the-box Auth (anonymous or simple PIN-based), Real-time subscriptions for synced game-state across the party, and File Storage (for photo uploads).
*   **Hosting:** **Vercel** or **Netlify** for frontend hosting (seamless GitHub integration). Supabase hosts the backend.
*   **Hardware APIs:**
    *   **QR Scanner:** `html5-qrcode` library or native Barcode Detection API.
    *   **GPS/Geolocation:** HTML5 Geolocation API (`navigator.geolocation`) with the Haversine formula calculation running on the client-side.
    *   **Camera:** HTML5 `<input type="file" accept="image/*" capture="environment">`.

---

## 🏗️ Core Application Modules

### 1. Onboarding & Authentication
*   Users launch the app via a simple URL (e.g., `play.peachgames.com`).
*   Instead of complex email logins, they scan the **Runa Początku** (starting QR code) or type their name.
*   The system assigns them to **Klan Peruna, Welesa, lub Mokoszy** strictly according to a pre-defined schema established by the "Gods" (Game Masters). The GMs retain the ability to dynamically change a player's Klan assignment at any time via the Admin Dashboard.

### 2. Main Dashboard (The Hub)
*   **Klan Status:** Large, aesthetic display of the current Klan's points and collected artifacts.
*   **Quest Log:** Active GPS missions, available QR scanning spots, logic puzzles.
*   **Feed:** A real-time activity feed showing when other Klans complete missions (building competitive tension).

### 3. Hardware & Sensor Components
*   **GPS Tracker (Wyprawa Gońców):** A radar-like UI showing distance to the target coordinates using the device’s GPS API. Triggers success when distance < 15m.
*   **QR Scanner (Totemy):** In-app camera view to scan physical codes hidden in the garden after completing physical challenges.
*   **Camera Upload (Misja Sklep):** Directly opens the native camera to take a photo of the receipt, uploading it securely to Supabase Storage for GM approval.

### 4. Interactive Puzzle Modules
*   **Digital Locks:** UI components resembling combination locks or safes (for the "Duchy Dzieciństwa" task).
*   **Trade Terminal (Targowisko Tajemnic):** Real-time UI where players can digitally exchange "Words of the Spell" using Supabase presence or by pairing devices (e.g., generating temporary connection codes).

### 5. Shop (Sklep Żercy)
*   A digital marketplace where Klans can spend their hard-earned points on "Buffs" (like the leaf blower) or "Curses" against other teams. Updates state globally in real-time.

### 6. Game Master (Admin) Dashboard
*   A hidden route (`/admin`) for Kamil and Spider.
*   Allows manual point overrides, instant acceptance of receipt photos, and triggering global events (e.g., forcefully starting *ETAP 4: Kupała Rave* which would lock out standard tasks and turn player screens into glowing tribal UI elements).
*   **Gods' Interface:** Text-input interface to send chat messages or dispatch TTS audio events to specific Klans or all players simultaneously.

### 7. Communication Channel (Głos Bogów)
*   A dedicated global or per-Klan text communication tab allowing direct chat between the Klans and the "Gods" (Game Masters).
*   **Future/Optional TTS Extension:** The GM can type a message and select an option to broadcast it using the Web Speech API Text-to-Speech (TTS). This would allow the message to be dramatically read aloud on the players' phones as a divine proclamation.

---

## 🗄️ Database Schema Proposal (Supabase)

*   `players`: `id`, `name`, `klan_id`, `created_at`
*   `klans`: `id`, `name`, `points`, `theme_color`
*   `quests`: `id`, `title`, `description`, `type` (gps, qr, physical, photo), `reward_points`
*   `quest_completions`: `klan_id`, `quest_id`, `completed_at`, `photo_url` (optional)
*   `inventory`: Tracks bought buffs/curses from Sklep Żercy.
*   `messages`: `id`, `klan_id` (optional for global), `sender` ('god' or 'klan'), `content`, `created_at`, `tts_requested` (boolean).

## 🎨 Next Steps for the UI/UX
Once the team approves the tech stack, the next step is scaffolding the Vite app and designing the core CSS architecture (Variables, Fonts, Glassmorphism layers). We can create a quick mock-up or generate reference images for the layout.
