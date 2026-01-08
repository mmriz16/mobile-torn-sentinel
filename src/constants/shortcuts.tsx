import { Bell, Coins, Dumbbell, FileUser, Flag, LandPlot, Settings, ShoppingBag } from 'lucide-react-native';

// Import local SVGs

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
        icon: LandPlot,
        isSvg: false,
        route: '/(quick-actions)/property'
    },
    {
        id: 'gym',
        label: 'Gym',
        icon: Dumbbell,
        isSvg: false,
        route: '/(quick-actions)/gym'
    },
    {
        id: 'stats',
        label: 'Stats',
        icon: FileUser,
        isSvg: false,
        route: '/(quick-actions)/stats'
    },
    {
        id: 'networth',
        label: 'Networth',
        icon: Coins,
        isSvg: false,
        route: '/(quick-actions)/networth'
    },
    // New items using Lucide icons
    {
        id: 'market',
        label: 'Market',
        icon: ShoppingBag,
        isSvg: false,
        route: '/(quick-actions)/market' // Placeholder
    },
    {
        id: 'faction',
        label: 'Faction',
        icon: Flag,
        isSvg: false,
        route: '/(quick-actions)/faction' // Placeholder
    },
    {
        id: 'alerts',
        label: 'Alerts',
        icon: Bell,
        isSvg: false,
        route: '/(quick-actions)/alerts' // Placeholder
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        isSvg: false,
        route: '/(quick-actions)/settings' // Placeholder
    }
];

export const DEFAULT_SHORTCUTS = ['property', 'gym', 'stats', 'networth'];
