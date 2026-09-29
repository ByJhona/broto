import { Elevation, Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Home from 'lucide-react-native/icons/house';
import Users from 'lucide-react-native/icons/users';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import Leaf from 'lucide-react-native/icons/leaf';
import Scan from 'lucide-react-native/icons/scan';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const colors = useColors();
  const { t } = useTranslation('tabs');
  const styles = useThemedStyles(makeStyles);
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
                <Scan size={Metrics.icon.large} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
              </View>
            </TouchableOpacity>
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
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : null}>
              <CircleUserRound size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.strokeWidth} />
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
    top: -Metrics.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightButton: {
    width: Metrics.size.xxl,
    height: Metrics.size.xxl,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    ...Elevation.high,
  },
  activeTabIcon: {
    backgroundColor: colors.tabIconSelected + '24',
    paddingHorizontal: Metrics.spacing.lg,
    paddingVertical: Metrics.spacing.sm,
    borderRadius: Metrics.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
