# Torn Sentinel 🛡️

**Torn Sentinel** is a powerful mobile companion application for Torn City players, built with React Native (Expo) and Supabase. It offers real-time stat monitoring, intelligent notifications, and deep integration with Torn's banking and stock systems.

## ✨ Key Features

### 📊 Dashboard & Stats
- **Real-time Status**: Monitor Energy, Nerve, Happy, and Life bars with precise countdowns.
- **Cooldown Tracking**: Automatic timers for Drug, Booster, Medical, and Jail usage.
- **Networth & Profit**: Track daily profit gains and total networth breakdown.

### ✈️ Travel & Trading
- **Travel Agent**: Real-time landing time countdowns and notifications.
- **Foreign Stocks**: View available stock in other countries to plan trade runs.
- **Item Market**: Browse items by category (Weapons, Armor, Medical, etc.) with search functionality.

### 🏦 Banking & Finance
- **Torn Bank**: View bank balance, active investments, and calculate investment returns.
- **City Bank Investment**: Visual progress bar for investment maturity with profit calculations.
- **Investment Calculator**: Smart inputs for "Current Wallet" or "2B Cap" investment strategies to maximize returns.
- **Offshore & Stocks**: *[Under Construction]* Modules for additional financial management.

### 🏋️ Gym & Training
- **Jump Calculators**: Built-in presets for **"Happy Jump"** and **"Choco Jump"**.
- **Energy Optimization**: Calculate exact item requirements (Xanax, E-DVDs) based on current energy and limits.

### 👥 Faction
- **Member Status**: See who is active, traveling, in hospital, or in jail at a glance.
- **Chain Watcher**: Real-time chain timeout monitoring and alerts to prevent breaks.
- **Ranked Wars**: View active war status and targets.

### 🔔 Smart Notifications
- **Local Alerts**: 
  - Energy/Nerve/Life Full
  - Travel Arrival (2 mins before & on landing)
  - Happy Reset (every 15 mins, smart-checked)
  - Chain Timeout Warnings
  - Cooldown Expiry (Drugs, Boosters, Hospital, Jail)
- **Push System**: Robust scheduling handles app backgrounding and restarts, ensuring you never miss a beat.

### 🛠️ App Features
- **Changelog**: Built-in "What's New" modal to track version history and updates.
- **Secure Handling**: API Keys stored securely on the device using Expo SecureStore.
- **Optimized UI**: Dark mode, blurred modals (`expo-blur`), and responsive design.

## 🛠️ Tech Stack

- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS)
- **UI Components**: Lucide Icons, Expo Blur
- **Navigation**: Expo Router (File-based routing)
- **Backend/DB**: Supabase (PostgreSQL, Edge Functions, Auth)
- **API**: Torn API v2

## 📂 Project Structure

```
├── app/                  # Expo Router pages/screens
│   ├── (tabs)/           # Main tab navigation (Home, Market, Stats, Assets, Settings)
│   ├── (qa-home)/        # Quick actions (Gym, Travel, Bank, etc.)
│   ├── (qa-factions)/    # Faction modules (Members, Chain, War)
│   ├── (modals)/         # Global modals (Changelog, API Key)
│   └── _layout.tsx       # Root layout & providers
├── src/
│   ├── components/       # Reusable UI components
│   ├── constants/        # App constants & config
│   ├── services/         # API integrations (Torn, Supabase)
│   ├── styles/           # Global styles & themes
│   ├── types/            # TypeScript definitions
│   └── utils/            # Helper functions (notifications, formatters)
├── supabase/             # Supabase migrations & Edge Functions
└── assets/               # Images and fonts
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: LTS version recommended.
2. **Torn API Key**: A valid API Key from [Torn Preferences](https://www.torn.com/preferences.php).
3. **Supabase Project**: Set up a Supabase project for specific sync features.

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
   Create a `.env` file in the root based on your Supabase credentials.

4. Run the app:
   ```bash
   npx expo start
   ```

## 📱 Build & Deployment

This project uses **EAS (Expo Application Services)** for CI/CD.

**Development Build:**
```bash
eas build --profile development --platform android
```

**Production Release:**
```bash
eas build --profile production --platform android
```

**OTA Update (Hotfix):**
```bash
# Uses the custom workflow for auto-incrementing version
eas-update
```

## 📄 Documentation

- **Workflows**: Check `.agent/workflows/` for automated tasks.
- **Commands**: Check `command.md` for CLI cheatsheet.

## ⚠️ Disclaimer

This application is a third-party tool and is not affiliated with Torn City. Usage of the Torn API must comply with Torn's [API Terms of Service](https://www.torn.com/api.html).
