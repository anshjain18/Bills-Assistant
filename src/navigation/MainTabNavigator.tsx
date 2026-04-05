import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { HomeScreen } from '../screens/HomeScreen';
import { SpendingScreen } from '../screens/SpendingScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import type { MainTabParamList } from './types';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: '600', color: colors.text },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Bills',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="camera-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Spending"
        component={SpendingScreen}
        options={{
          title: 'Spending',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-box-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tag-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
