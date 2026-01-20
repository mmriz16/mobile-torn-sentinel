import { Banknote, Bell, Coins, Dumbbell, FileUser, Flag, LandPlot, Landmark, Link, Plane, Settings, ShoppingBag, Swords, Users } from 'lucide-react-native';

// Import local SVGs

export interface ShortcutItem {
    id: string;
    label: string;
    icon: any; // Component or Lucide Icon
    isSvg: boolean;
    route: any; // Href
}

const AVAILABLE_HOME_SHORTCUTS: ShortcutItem[] = [
    {
        id: 'property',
        label: 'Property',
        icon: LandPlot,
        isSvg: false,
        route: '/home/(quick-actions)/property'
    },
    {
        id: 'gym',
        label: 'Gym',
        icon: Dumbbell,
        isSvg: false,
        route: '/home/(quick-actions)/gym'
    },
    {
        id: 'stats',
        label: 'Stats',
        icon: FileUser,
        isSvg: false,
        route: '/home/(quick-actions)/stats'
    },
    {
        id: 'networth',
        label: 'Networth',
        icon: Coins,
        isSvg: false,
        route: '/home/(quick-actions)/networth'
    },
    {
        id: 'bank',
        label: 'Bank',
        icon: Landmark,
        isSvg: false,
        route: '/home/(quick-actions)/bank'
    },
    {
        id: 'market',
        label: 'Market',
        icon: ShoppingBag,
        isSvg: false,
        route: '/home/(quick-actions)/market' // Placeholder
    },
    {
        id: 'faction',
        label: 'Faction',
        icon: Flag,
        isSvg: false,
        route: '/home/(quick-actions)/faction' // Placeholder
    },
    {
        id: 'travel',
        label: 'Travel',
        icon: Plane,
        isSvg: false,
        route: '/home/(quick-actions)/travel'
    },
    {
        id: 'alerts',
        label: 'Alerts',
        icon: Bell,
        isSvg: false,
        route: '/home/(quick-actions)/alerts' // Placeholder
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        isSvg: false,
        route: '/home/(quick-actions)/settings' // Placeholder
    }
];

const AVAILABLE_FACTION_SHORTCUTS: ShortcutItem[] = [
    {
        id: 'ranked-war',
        label: 'Ranked War',
        icon: Swords,
        isSvg: false,
        route: '/home/(quick-actions)/faction/ranked-war'
    },
    {
        id: 'chain-list',
        label: 'Chain',
        icon: Link,
        isSvg: false,
        route: '/home/(quick-actions)/faction/chain-list'
    },
    {
        id: 'payday',
        label: 'Payday',
        icon: Banknote,
        isSvg: false,
        route: '/home/(quick-actions)/faction/payday'
    },
    {
        id: 'members',
        label: 'Members',
        icon: Users,
        isSvg: false,
        route: '/home/(quick-actions)/faction/members'
    }
];

export const AVAILABLE_SHORTCUTS: ShortcutItem[] = [
    ...AVAILABLE_HOME_SHORTCUTS,
    ...AVAILABLE_FACTION_SHORTCUTS
];

export { AVAILABLE_FACTION_SHORTCUTS, AVAILABLE_HOME_SHORTCUTS };

export const DEFAULT_SHORTCUTS = ['property', 'gym', 'stats', 'networth'];
export const DEFAULT_FACTION_SHORTCUTS = ['ranked-war', 'chain-list', 'payday', 'members'];
