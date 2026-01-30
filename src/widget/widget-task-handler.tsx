"use no memo";

import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { CooldownStatusWidget } from './CooldownStatusWidget';
import { StatusOverviewWidget } from './StatusOverviewWidget';

const nameToWidget = {
    StatusOverview: StatusOverviewWidget,
    CooldownStatus: CooldownStatusWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    const widgetInfo = props.widgetInfo;
    const Widget = nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];

    switch (props.widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED':
            props.renderWidget(<Widget />);
            break;

        case 'WIDGET_DELETED':
        case 'WIDGET_CLICK':
        default:
            break;
    }
}
