// src/utils/gym-calculator.ts
// Gym gain calculation utilities based on Torn formulas

const CONSTS = {
    a: 3.480061091e-7,
    b: 250,
    c: 3.091619094e-6,
    d: 6.82775184551527e-5,
    e: -0.0301431777,
};

/**
 * Calculate total modifier M from bonus percentages.
 * Example: bonusPercents: [0.10, 0.02, 0.05] => M = 1.10 * 1.02 * 1.05
 */
export function calcModifier(bonusPercents: number[]): number {
    return bonusPercents.reduce((m, p) => m * (1 + p), 1);
}

/**
 * Calculate gain per single train.
 * @param S - Current stat value (e.g. Strength being trained)
 * @param H - Current happiness
 * @param E - Energy per train (e.g. 10 or 25)
 * @param G - Gym dots for that stat (scale 0..10, e.g. 8.5)
 * @param M - Total modifier (multiplied bonuses)
 */
export function gainPerTrain(
    S: number,
    H: number,
    E: number,
    G: number,
    M: number = 1
): number {
    const { a, b, c, d, e } = CONSTS;
    const Hb = H + b;
    const base = (a * Math.log(Hb) + c) * S + d * Hb + e;
    return M * G * E * base;
}

export type HappyLossMode = "avg" | "random";

export interface SimulationResult {
    trains: number;
    S_final: number;
    H_final: number;
    totalGain: number;
    avgGainPerEnergy: number;
}

/**
 * Simulate bulk training session with S and H updates per train.
 * @param params - Simulation parameters
 */
export function simulateSession(params: {
    S0: number;           // Starting stat
    H0: number;           // Starting happiness
    totalEnergy: number;  // Total energy to spend (e.g. 1000)
    energyPerTrain: number; // Energy per single train (E)
    gymDots: number;      // Gym dots for the stat (G, 0..10)
    modifier: number;     // Total modifier (M)
    mode?: HappyLossMode;
}): SimulationResult {
    const {
        S0,
        H0,
        totalEnergy,
        energyPerTrain: E,
        gymDots: G,
        modifier: M,
        mode = "avg",
    } = params;

    const trains = Math.floor(totalEnergy / E);

    let S = S0;
    let H = H0;

    for (let i = 0; i < trains; i++) {
        const gain = gainPerTrain(S, H, E, G, M);
        S += gain;

        let happyLoss: number;
        if (mode === "avg") {
            happyLoss = 0.5 * E; // Average
        } else {
            happyLoss = E * (0.4 + Math.random() * 0.2); // 40%..60%
        }
        H = Math.max(0, H - happyLoss);
    }

    const totalGain = S - S0;
    const usedEnergy = trains * E;
    return {
        trains,
        S_final: S,
        H_final: H,
        totalGain,
        avgGainPerEnergy: usedEnergy > 0 ? totalGain / usedEnergy : 0,
    };
}
