'use no memo';
import React from 'react';
import { FlexWidget, TextWidget, WidgetPreview } from 'react-native-android-widget';

export function HelloWidget() {
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#1C1917',
                borderRadius: 8,
                padding: 10,
            }}
            accessibilityLabel="Hello world widget"
        >
            <TextWidget
                text="Hello"
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

export function HelloWidgetPreview() {
    return (
        <WidgetPreview
            renderWidget={() => <HelloWidget />}
            width={380}
            height={200}
        />
    );
}