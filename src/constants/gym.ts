// src/constants/gyms.ts

export interface GymStat {
    energy: number; // Energi yang dibutuhkan per satu kali klik train
    str: number;    // Strength gain dot
    spd: number;    // Speed gain dot
    def: number;    // Defense gain dot
    dex: number;    // Dexterity gain dot
    note?: string;  // Catatan tambahan (misal requirement khusus)
}

// Data lengkap berdasarkan Torn Wiki
export const GYM_DATA: Record<string, GymStat> = {
    // --- LIGHT-WEIGHT GYMS ---
    "Premier Fitness": { energy: 5, str: 2.0, spd: 2.0, def: 2.0, dex: 2.0 },
    "Average Joes": { energy: 5, str: 2.4, spd: 2.4, def: 2.7, dex: 2.4 },
    "Woody's Workout": { energy: 5, str: 2.7, spd: 3.2, def: 3.0, dex: 2.7 },
    "Beach Bods": { energy: 5, str: 3.2, spd: 3.2, def: 3.2, dex: 0 },
    "Silver Gym": { energy: 5, str: 3.4, spd: 3.6, def: 3.4, dex: 3.2 },
    "Pour Femme": { energy: 5, str: 3.4, spd: 3.6, def: 3.6, dex: 3.8 },
    "Davies Den": { energy: 5, str: 3.7, spd: 0, def: 3.7, dex: 3.7 },
    "Global Gym": { energy: 5, str: 4.0, spd: 4.0, def: 4.0, dex: 4.0 },

    // --- MIDDLE-WEIGHT GYMS ---
    "Knuckle Heads": { energy: 10, str: 4.8, spd: 4.4, def: 4.0, dex: 4.2 },
    "Pioneer Fitness": { energy: 10, str: 4.4, spd: 4.6, def: 4.8, dex: 4.4 },
    "Anabolic Anomalies": { energy: 10, str: 5.0, spd: 4.6, def: 5.2, dex: 4.6 },
    "Core": { energy: 10, str: 5.0, spd: 5.2, def: 5.0, dex: 5.0 },
    "Racing Fitness": { energy: 10, str: 5.0, spd: 5.4, def: 4.8, dex: 5.2 },
    "Complete Cardio": { energy: 10, str: 5.5, spd: 5.7, def: 5.5, dex: 5.2 },
    "Legs, Bums and Tums": { energy: 10, str: 0, spd: 5.5, def: 5.5, dex: 5.7 },
    "Deep Burn": { energy: 10, str: 6.0, spd: 6.0, def: 6.0, dex: 6.0 },

    // --- HEAVY-WEIGHT GYMS ---
    "Apollo Gym": { energy: 10, str: 6.0, spd: 6.2, def: 6.4, dex: 6.2 },
    "Gun Shop": { energy: 10, str: 6.5, spd: 6.4, def: 6.2, dex: 6.2 },
    "Force Training": { energy: 10, str: 6.4, spd: 6.5, def: 6.4, dex: 6.8 },
    "Cha Cha's": { energy: 10, str: 6.4, spd: 6.4, def: 6.8, dex: 7.0 },
    "Atlas": { energy: 10, str: 7.0, spd: 6.4, def: 6.4, dex: 6.5 },
    "Last Round": { energy: 10, str: 6.8, spd: 6.5, def: 7.0, dex: 6.5 },
    "The Edge": { energy: 10, str: 6.8, spd: 7.0, def: 7.0, dex: 6.8 },
    "George's": { energy: 10, str: 7.3, spd: 7.3, def: 7.3, dex: 7.3, note: "Stops gym exp gain" },

    // --- SPECIALIST GYMS ---
    "Balboas Gym": { energy: 25, str: 0, spd: 0, def: 7.5, dex: 7.5, note: "Req: Def+Dex 25% > Str+Spd" },
    "Frontline Fitness": { energy: 25, str: 7.5, spd: 7.5, def: 0, dex: 0, note: "Req: Str+Spd 25% > Dex+Def" },
    "Gym 3000": { energy: 50, str: 8.0, spd: 0, def: 0, dex: 0, note: "Req: Str 25% higher than 2nd stat" },
    "Mr. Isoyamas": { energy: 50, str: 0, spd: 0, def: 8.0, dex: 0, note: "Req: Def 25% higher than 2nd stat" },
    "Total Rebound": { energy: 50, str: 0, spd: 8.0, def: 0, dex: 0, note: "Req: Spd 25% higher than 2nd stat" },
    "Elites": { energy: 50, str: 0, spd: 0, def: 0, dex: 8.0, note: "Req: Dex 25% higher than 2nd stat" },
    "The Sports Science Lab": { energy: 25, str: 9.0, spd: 9.0, def: 9.0, dex: 9.0, note: "Req: Max 150 Xanax/Ecstasy taken" },
    "Fight Club": { energy: 10, str: 10.0, spd: 10.0, def: 10.0, dex: 10.0, note: "Invite Only" },

    // --- JAIL GYM ---
    "Jail Gym": { energy: 5, str: 3.4, spd: 3.4, def: 4.6, dex: 0, note: "Only accessible in Jail" }
};

// Helper list for Dropdown (Optional)
export const GYM_NAMES = Object.keys(GYM_DATA);

// Mapping from Gym ID (from API) to Gym Name
// Based on Torn Wiki gym order
export const GYM_ID_TO_NAME: Record<number, string> = {
    1: "Premier Fitness",
    2: "Average Joes",
    3: "Woody's Workout",
    4: "Beach Bods",
    5: "Silver Gym",
    6: "Pour Femme",
    7: "Davies Den",
    8: "Global Gym",
    9: "Knuckle Heads",
    10: "Pioneer Fitness",
    11: "Anabolic Anomalies",
    12: "Core",
    13: "Racing Fitness",
    14: "Complete Cardio",
    15: "Legs, Bums and Tums",
    16: "Deep Burn",
    17: "Apollo Gym",
    18: "Gun Shop",
    19: "Force Training",
    20: "Cha Cha's",
    21: "Atlas",
    22: "Last Round",
    23: "The Edge",
    24: "George's",
    25: "Balboas Gym",
    26: "Frontline Fitness",
    27: "Gym 3000",
    28: "Mr. Isoyamas",
    29: "Total Rebound",
    30: "Elites",
    31: "The Sports Science Lab",
    32: "Fight Club"
};