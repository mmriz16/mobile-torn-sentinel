import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widget';

// Register widget handler FIRST, before expo-router
registerWidgetTaskHandler(widgetTaskHandler);

// Then import expo-router entry
import 'expo-router/entry';
