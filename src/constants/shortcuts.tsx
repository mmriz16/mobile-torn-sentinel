import { Banknote, Bell, Coins, Dumbbell, FileUser, Flag, LandPlot, Link, Settings, ShoppingBag, Swords, Users } from 'lucide-react-native';

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
        route: '/(qa-home)/property'
    },
    {
        id: 'gym',
        label: 'Gym',
        icon: Dumbbell,
        isSvg: false,
        route: '/(qa-home)/gym'
    },
    {
        id: 'stats',
        label: 'Stats',
        icon: FileUser,
        isSvg: false,
        route: '/(qa-home)/stats'
    },
    {
        id: 'networth',
        label: 'Networth',
        icon: Coins,
        isSvg: false,
        route: '/(qa-home)/networth'
    },
    {
        id: 'market',
        label: 'Market',
        icon: ShoppingBag,
        isSvg: false,
        route: '/(qa-home)/market' // Placeholder
    },
    {
        id: 'faction',
        label: 'Faction',
        icon: Flag,
        isSvg: false,
        route: '/(qa-home)/faction' // Placeholder
    },
    {
        id: 'alerts',
        label: 'Alerts',
        icon: Bell,
        isSvg: false,
        route: '/(qa-home)/alerts' // Placeholder
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        isSvg: false,
        route: '/(qa-home)/settings' // Placeholder
    }
];

const AVAILABLE_FACTION_SHORTCUTS: ShortcutItem[] = [
    {
        id: 'ranked-war',
        label: 'Ranked War',
        icon: Swords,
        isSvg: false,
        route: '/(qa-factions)/ranked-war'
    },
    {
        id: 'chain-list',
        label: 'Chain',
        icon: Link,
        isSvg: false,
        route: '/(qa-factions)/chain-list'
    },
    {
        id: 'payday',
        label: 'Payday',
        icon: Banknote,
        isSvg: false,
        route: '/(qa-factions)/payday'
    },
    {
        id: 'members',
        label: 'Members',
        icon: Users,
        isSvg: false,
        route: '/(qa-factions)/members'
    }
];

export const AVAILABLE_SHORTCUTS: ShortcutItem[] = [
    ...AVAILABLE_HOME_SHORTCUTS,
    ...AVAILABLE_FACTION_SHORTCUTS
];

export { AVAILABLE_FACTION_SHORTCUTS, AVAILABLE_HOME_SHORTCUTS };

export const DEFAULT_SHORTCUTS = ['property', 'gym', 'stats', 'networth'];
export const DEFAULT_FACTION_SHORTCUTS = ['ranked-war', 'chain-list', 'payday', 'members'];
