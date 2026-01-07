// File: src/utils/responsive.ts
import { Dimensions } from 'react-native';

// 1. Ambil ukuran layar HP user saat ini
const { width, height } = Dimensions.get('window');

// 2. Tentukan ukuran standar desain FIGMA Anda
const guidelineBaseWidth = 412;  // Lebar Samsung A51 / Figma Anda
const guidelineBaseHeight = 917; // Tinggi Figma Anda

// 3. LOGIKA PENGAMAN (Safety Lock) 🔒
// Jika layar user lebih lebar dari 550px (Tablet/iPad), 
// kita pura-pura anggap lebarnya cuma 550px. 
// Supaya font tidak membesar jadi raksasa.
const scaleWidth = width > 550 ? 550 : width;

// --- RUMUS MATEMATIKA ---

// Gunakan untuk: Width, Margin Horizontal, Padding Horizontal
const horizontalScale = (size: number) => (scaleWidth / guidelineBaseWidth) * size;

// Gunakan untuk: Height, Margin Vertical, Padding Vertical
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

// Gunakan untuk: FONT SIZE, ICON SIZE, Radius
// factor = 0.5 artinya: "Tolong besarkan, tapi cuma setengah kekuatannya aja"
const moderateScale = (size: number, factor = 0.5) => {
    // Trik tambahan: Kalau tablet, factor-nya kita kecilin lagi jadi 0.3 biar makin kalem
    const finalFactor = width > 550 ? 0.3 : factor;
    return size + (horizontalScale(size) - size) * finalFactor;
};

export { horizontalScale, moderateScale, verticalScale };

