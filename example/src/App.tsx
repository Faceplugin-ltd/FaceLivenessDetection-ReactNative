import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from './navigation';
import AboutScreen from './screens/AboutScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import { FP } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: FP.bg,
    card: FP.bg,
    text: FP.text,
    primary: FP.accent,
    border: FP.stroke,
  },
};

/**
 * FacePlugin Face Liveness demo for React Native.
 *
 * Home, Settings and About are React Native; the two camera screens are the **native** FacePlugin
 * ones, launched through the plugin, so liveness behaves exactly as it does in the Android and iOS
 * apps.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={FP.bg} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: FP.bg },
            headerTintColor: FP.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: FP.bg },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
