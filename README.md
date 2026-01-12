# Torn Sentinel 🛡️

**Torn Sentinel** is a mobile companion application for Torn City players, built with React Native (Expo) and Supabase. It provides real-time monitoring of user stats, faction tracking, and intelligent notifications.

## ✨ Features

- **Dashboard**: Real-time stats (Energy, Nerve, Happy, Life), Networth tracking, and Daily Profit calculator.
- **Faction Tracking**: 
  - View faction members list with detailed status (Okay, Traveling, Hospital, Jail).
  - **Real-time Travel Tracking**: See accurate arrival times for faction members who use the app.
  - Syncs data seamlessly via Supabase.
- **Gym & Education**: Track active courses and gym train estimates.
- **Quick Actions**: Customizable shortcuts for frequently used Torn features.
- **Smart Notifications**: Push notifications for full energy, nerve, travel arrival, hospitalization, etc. (Powered by Supabase Edge Functions).
- **Multiple Environments**: Dev, Preview, and Production builds.

## 🛠️ Tech Stack

- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS)
- **Navigation**: Expo Router (File-based routing)
- **Backend/DB**: Supabase (PostgreSQL, Edge Functions, Auth)
- **API**: Torn API

## 📂 Project Structure

```
├── app/                  # Expo Router pages/screens
│   ├── (tabs)/           # Main tab navigation
│   ├── (qa-home)/        # Quick actions for Home
│   └── (qa-factions)/    # Faction related screens
├── src/
│   ├── components/       # Reusable UI components
│   ├── constants/        # App constants & config
│   ├── services/         # API integrations (Torn, Supabase)
│   ├── styles/           # Global styles & themes
│   ├── types/            # TypeScript definitions
│   └── utils/            # Helper functions
├── supabase/             # Supabase migrations & Edge Functions
└── assets/               # Images and fonts
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: LTS version recommended.
2. **Torn API Key**: You need a valid API Key from [Torn Preferences](https://www.torn.com/preferences.php).
3. **Supabase Project**: Set up a Supabase project for backend syncing.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mmriz16/mobile-torn-sentinel.git
   cd mobile-torn-sentinel
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root based on your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the app:
   ```bash
   npx expo start
   ```

## 📱 Build & Deployment

This project uses EAS (Expo Application Services) for building.

**Development Build (Torn Sentinel Dev):**
```bash
eas build --profile development --platform android
```

**Production Build (Torn Sentinel):**
```bash
eas build --profile production --platform android
```

## 📄 Documentation

- **Supabase Edge Functions**: See `supabase/functions/README.md` (if available) or check `command.md` for deployment cheatsheet.
- **Commands**: Check `command.md` for useful CLI commands used in this project.

## ⚠️ Disclaimer

This application is a third-party tool and is not affiliated with Torn City. Usage of the Torn API must comply with Torn's [API Terms of Service](https://www.torn.com/api.html).
