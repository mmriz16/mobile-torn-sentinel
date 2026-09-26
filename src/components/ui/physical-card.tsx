import { ImageBackground, StyleProp, ViewProps, ViewStyle } from "react-native";
import { moderateScale as ms } from '../../utils/responsive';

// ISO/IEC 7810 ID-1 (bank card): 85.60mm x 53.98mm
export const PHYSICAL_CARD_ASPECT_RATIO = 85.6 / 53.98;

interface PhysicalCardProps extends ViewProps {
    style?: StyleProp<ViewStyle>;
}

/**
 * Bank-card shaped hero card with the card.png artwork stretched over the whole card.
 * Children are spread top-to-bottom (header, amount, footer).
 */
export function PhysicalCard({ style, children, ...props }: PhysicalCardProps) {
    return (
        <ImageBackground
            source={require('@/assets/images/card.png')}
            resizeMode="cover"
            className="bg-tactical-900 border border-tactical-800 rounded-lg overflow-hidden"
            style={[{ width: '100%', aspectRatio: PHYSICAL_CARD_ASPECT_RATIO, padding: ms(16), justifyContent: 'space-between' }, style]}
            imageStyle={{ borderRadius: 8, width: '100%', height: '100%' }}
            {...props}
        >
            {children}
        </ImageBackground>
    );
}
