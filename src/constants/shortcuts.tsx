import { Bell, Flag, Settings, ShoppingBag } from 'lucide-react-native';

// Import local SVGs
import QaCompany from '../../assets/icons/qa-company.svg';
import QaNetworth from '../../assets/icons/qa-networth.svg';
import QaProperty from '../../assets/icons/qa-property.svg';
import QaStats from '../../assets/icons/qa-stats.svg';

export interface ShortcutItem {
    id: string;
    label: string;
    icon: any; // Component or Lucide Icon
    isSvg: boolean;
    route: any; // Href
}

export const AVAILABLE_SHORTCUTS: ShortcutItem[] = [
    {
        id: 'property',
        label: 'Property',
        icon: QaProperty,
        isSvg: true,
        route: '/(quick-actions)/property'
    },
    {
        id: 'company',
        label: 'Company',
        icon: QaCompany,
        isSvg: true,
        route: '/(quick-actions)/company'
    },
    {
        id: 'stats',
        label: 'Stats',
        icon: QaStats,
        isSvg: true,
        route: '/(quick-actions)/stats'
    },
    {
        id: 'networth',
        label: 'Networth',
        icon: QaNetworth,
        isSvg: true,
        route: '/(quick-actions)/networth'
    },
    // New items using Lucide icons
    {
        id: 'market',
        label: 'Market',
        icon: ShoppingBag,
        isSvg: false,
        route: '/(quick-actions)/property' // Placeholder
    },
    {
        id: 'faction',
        label: 'Faction',
        icon: Flag,
        isSvg: false,
        route: '/(quick-actions)/property' // Placeholder
    },
    {
        id: 'alerts',
        label: 'Alerts',
        icon: Bell,
        isSvg: false,
        route: '/(quick-actions)/property' // Placeholder
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        isSvg: false,
        route: '/(quick-actions)/property' // Placeholder
    }
];

export const DEFAULT_SHORTCUTS = ['property', 'company', 'stats', 'networth'];
