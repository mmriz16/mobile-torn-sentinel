import { Text as RNText, TextProps } from 'react-native';
import { moderateScale } from '../../utils/responsive';

// Definisi tipe bobot font yang tersedia di project Anda
type FontWeight =
    | 'light'      // 300
    | 'regular'    // 400
    | 'medium'     // 500
    | 'semibold'   // 600
    | 'bold'       // 700
    | 'extrabold'  // 800
    | 'black';     // 900

// Definisi tipe keluarga font
type FontFamily = 'sans' | 'mono' | 'brand';

interface TxtProps extends TextProps {
    /** * Ukuran font (angka). 
     * Otomatis di-scale menggunakan moderateScale().
     * Default: 14 
     */
    size?: number;

    /**
     * Ketebalan font.
     * Default: 'regular'
     */
    weight?: FontWeight;

    /**
     * Jenis font: 'sans' (Inter) atau 'mono' (JetBrains) atau 'brand' (PlusJakarta).
     * Default: 'sans'
     */
    family?: FontFamily;

    /**
     * Untuk dukungan NativeWind class
     */
    className?: string;
}

export function Txt({
    size = 14,
    weight = 'regular',
    family = 'sans',
    style,
    ...props
}: TxtProps) {

    // Logic untuk memilih Font Family yang tepat berdasarkan props
    const getFontFamily = (): string => {
        // 1. Logika untuk Font Monospace (JetBrains Mono)
        if (family === 'mono') {
            switch (weight) {
                case 'bold': return 'JetBrainsMono_700Bold';
                case 'extrabold': return 'JetBrainsMono_800ExtraBold';
                // JetBrains di project Anda sepertinya tidak load semua weight, fallback ke regular
                default: return 'JetBrainsMono_400Regular';
            }
        }

        // 2. Logika untuk Font Brand (Plus Jakarta Sans)
        if (family === 'brand') {
            // Anda hanya load ExtraBold untuk font ini
            return 'PlusJakartaSans_800ExtraBold';
        }

        // 3. Logika Default Font Sans (Inter)
        switch (weight) {
            case 'light': return 'Inter_300Light';
            case 'medium': return 'Inter_500Medium';
            case 'semibold': return 'Inter_600SemiBold';
            case 'bold': return 'Inter_700Bold';
            case 'extrabold': return 'Inter_800ExtraBold';
            case 'black': return 'Inter_900Black';
            default: return 'Inter_400Regular';
        }
    };

    return (
        <RNText
            style={[
                {
                    fontFamily: getFontFamily(),
                    fontSize: moderateScale(size), // Auto-scale di sini!
                    includeFontPadding: false,     // Supaya centering vertikal lebih rapi di Android
                    textAlignVertical: 'center'
                },
                style
            ]}
            {...props}
        />
    );
}