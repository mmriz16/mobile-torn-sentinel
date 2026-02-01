import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './app/(quick-actions)/widgets/widget-task-handler';

import 'expo-router/entry';

registerWidgetTaskHandler(widgetTaskHandler);