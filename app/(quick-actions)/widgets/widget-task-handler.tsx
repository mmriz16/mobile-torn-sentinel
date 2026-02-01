import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { CooldownStatsWidget } from './CooldownStats';
import { HelloWidget } from './HelloWidget';
import { StatsOverviewWidget } from './StatsOverview';

const nameToWidget = {
    // Hello will be the **name** with which we will reference our widget.
    Hello: HelloWidget,
    StatusOverview: StatsOverviewWidget,
    CooldownStatus: CooldownStatsWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const widgetInfo = props.widgetInfo;
    const Widget =
        nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];

    if (!Widget) {
        console.warn(`Widget not found: ${widgetInfo.widgetName}`);
        return;
    }

    switch (props.widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED':
            props.renderWidget(<Widget />);
            break;

        case 'WIDGET_DELETED':
            // Not needed for now
            break;

        case 'WIDGET_CLICK':
            // Not needed for now
            break;

        default:
            break;
    }
}