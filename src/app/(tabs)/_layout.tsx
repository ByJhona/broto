import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Home from 'lucide-react-native/icons/house';
import Users from 'lucide-react-native/icons/users';
import Sprout from 'lucide-react-native/icons/sprout';
import Leaf from 'lucide-react-native/icons/leaf';
import Scan from 'lucide-react-native/icons/scan';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const colors = useColors();
  const { t } = useTranslation('tabs');
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        headerShown: false,
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : null}>
              <Home size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: t('offers'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : null}>
              <Sprout size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="identify"
        options={{
          title: t('identify'),
          tabBarLabel: '',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...(props as any)}
              activeOpacity={0.8}
              style={[props.style, styles.customButtonContainer]}
            >
              <View style={styles.highlightButton}>
                <Scan size={34} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('community'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : null}>
              <Users size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          title: t('garden'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : null}>
              <Leaf size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  customButtonContainer: {
    top: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  activeTabIcon: {
    backgroundColor: colors.tabIconSelected + '24',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
