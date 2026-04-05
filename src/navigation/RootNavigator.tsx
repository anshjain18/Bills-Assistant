import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabNavigator } from './MainTabNavigator';
import { SaveBillScreen } from '../screens/SaveBillScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';
import type { RootStackParamList } from './types';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '600', color: colors.text },
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="SaveBill"
        component={SaveBillScreen}
        options={{
          title: 'Save receipt',
          presentation: 'modal',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={({ route }) => ({
          title: route.params.categoryName,
          headerShadowVisible: false,
        })}
      />
    </Stack.Navigator>
  );
}
