import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { CooldownStatsWidgetPreview } from './CooldownStats';
import { HelloWidgetPreview } from './HelloWidget';
import { StatsOverviewWidgetPreview } from './StatsOverview';

export default function Widgets() {
    return (
        <>
            <View style={styles.container}>
                <HelloWidgetPreview />
                <StatsOverviewWidgetPreview />
                <CooldownStatsWidgetPreview />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        flexDirection: 'column',
        gap: 10,
        alignItems: 'center',
    },
});