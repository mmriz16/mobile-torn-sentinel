'use no memo';
import React from 'react';
import { FlexWidget, TextWidget, WidgetPreview } from 'react-native-android-widget';

export function StatsOverviewWidget() {
    return (
        <FlexWidget
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: 'wrap_content',
                width: 'match_parent',
                backgroundColor: '#1C1917',
                borderRadius: 8,
                padding: 10,
            }}
            accessibilityLabel="Stats Overview widget"
        >
            <TextWidget
                text="STATS OVERVIEW"
                style={{
                    fontSize: 14,
                    fontFamily: 'Inter_800ExtraBold',
                    fontWeight: '800',
                    color: 'rgba(255, 255, 255, 0.5)',
                }}
            />
            <FlexWidget
                style={{
                    width: 'wrap_content',
                    height: 'wrap_content',
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexGap: 4,
                    padding: 6,
                    borderWidth: 1,
                    borderColor: '#292524',
                    backgroundColor: '#0C0A09',
                    borderRadius: 2,
                }}
                accessibilityLabel="Arrive in Torn"
            >
                <TextWidget
                    text="ARRIVE IN SOUTH AFRICA:"
                    style={{
                        fontSize: 10,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontWeight: '400',
                        color: 'rgba(255, 255, 255, 0.5)',
                    }}
                />
                <TextWidget
                    text="00:00:00"
                    style={{
                        fontSize: 10,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontWeight: '400',
                        color: '#0EA5E9',
                    }}
                />
            </FlexWidget>
        </FlexWidget>
    );
}

export function StatsOverviewWidgetPreview() {
    return (
        <WidgetPreview
            renderWidget={() => <StatsOverviewWidget />}
            width={380}
            height={200}
        />
    );
}