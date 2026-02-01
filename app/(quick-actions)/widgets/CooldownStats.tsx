'use no memo';
import React from 'react';
import { FlexWidget, TextWidget, WidgetPreview } from 'react-native-android-widget';

export function CooldownStatsWidget() {
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#1C1917',
                borderRadius: 8,
                padding: 10,
            }}
            accessibilityLabel="Cooldown Stats widget"
        >
            <TextWidget
                text="Cooldown Stats"
                style={{
                    fontSize: 14,
                    fontFamily: 'Inter',
                    fontWeight: '800',
                    color: 'rgba(255, 255, 255, 0.5)',
                }}
            />
        </FlexWidget>
    );
}

export function CooldownStatsWidgetPreview() {
    return (
        <WidgetPreview
            renderWidget={() => <CooldownStatsWidget />}
            width={380}
            height={200}
        />
    );
}