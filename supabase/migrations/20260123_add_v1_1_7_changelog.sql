INSERT INTO app_changelogs (version, release_date, changes)
VALUES (
    '1.1.7',
    NOW(),
    '{
        "new": [
            "Ranked War card on Home screen",
            "Dedicated Ranked War page with chain status"
        ],
        "improvements": [
            "Refined Faction Member status display",
            "Optimized navigation flow"
        ]
    }'::jsonb
);
