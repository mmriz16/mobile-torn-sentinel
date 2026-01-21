-- Seed data for app_changelogs
insert into public.app_changelogs (version, release_date, changes) values
('1.0.10', '2026-01-21', '{
    "improvements": [
        "UI Overhaul: Custom themed \"Update Available\" modal",
        "Replaced native alerts with dark-themed tactical UI",
        "Improved \"Danger Zone\" settings UX"
    ]
}'),
('1.0.9', '2026-01-21', '{
    "new": [
        "Chain List: View 404 chain targets with real-time status",
        "Auto-check status via background cronjob (every minute)",
        "Hospital countdown timer for chain targets"
    ],
    "improvements": [
        "Lazy loading for chain list (10 items per page)",
        "Blur effect now works on Android"
    ]
}'),
('1.0.8', '2026-01-21', '{
    "new": [
        "Ranked War Card now on Home Screen (Active/Preparing)",
        "Added PREPARING status for Ranked Wars"
    ],
    "improvements": [
        "Updated Timer Format to DD:HH:MM:SS",
        "Parallel API fetching for Home Screen optimization"
    ]
}'),
('1.0.7', '2026-01-20', '{
    "improvements": [
        "Refactored Quick Actions directory structure for better organization",
        "Use absolute imports (@/) for cleaner code",
        "Cleaned up legacy files"
    ],
    "fixed": [
        "Fixed \"Unmatched Route\" error on startup",
        "Fixed navigation routing consistency"
    ]
}'),
('1.0.6', '2026-01-20', '{
    "new": [
        "Stock Chart Page: View price history with interactive charts",
        "Time period selector (D/W/M/All) for stock analysis",
        "Stock analytics overview (Open, Close, High, Low, Average)"
    ]
}'),
('1.0.5', '2026-01-20', '{
    "improvements": [
        "Improved notification logic: Happy notifications now respect cooldowns",
        "Backend notification sync improvements"
    ],
    "fixed": [
        "Fixed app stability issues (lint errors, hoisting issues)"
    ]
}'),
('1.0.4', '2026-01-20', '{
    "improvements": [
        "Visual adjustments to Bank Card background (fixed sizing)"
    ]
}'),
('1.0.3', '2026-01-19', '{
    "improvements": [
        "Added \"Under Construction\" screens for active development modules",
        "Visual adjustments to Bank Card text alignment"
    ]
}'),
('1.0.2', '2026-01-19', '{
    "improvements": [
        "Changelog History: You can now scroll through previous versions",
        "Visuals: Added native blur effect to modals (requires app update)",
        "System: Auto-increment versioning workflow"
    ]
}'),
('1.0.1', '2026-01-19', '{
    "improvements": [
        "App startup speed - UI loads faster",
        "Push token auto-sync on app launch",
        "New card design for Bank screens",
        "New \"What''s New\" modal on updates"
    ],
    "fixed": [
        "Push notifications not being delivered",
        "Local notifications (Energy, Travel)",
        "Missing bank rates import error"
    ]
}');
