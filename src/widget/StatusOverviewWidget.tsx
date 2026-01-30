"use no memo";

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function StatusOverviewWidget() {
    return (
        <FlexWidget
            style={{
                flex: 1,
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#1a1a2e',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
            }}
        >
            <TextWidget
                text="Status Overview"
                style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#ffffff',
                }}
            />
        </FlexWidget>
    );
}
