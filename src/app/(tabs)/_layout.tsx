import { Metrics, useColors, type ThemeColors } from '@/theme';
import { Tabs } from 'expo-router';
import Home from 'lucide-react-native/icons/house';
import Users from 'lucide-react-native/icons/users';
import Camera from 'lucide-react-native/icons/camera';
import Leaf from 'lucide-react-native/icons/leaf';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.tabIconSelected, tabBarShowLabel: true, headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
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
          title: 'Comunidade',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : null}>
              <Users size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="photo"
        options={{
          title: 'Foto',
          tabBarLabel: '',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...(props as any)}
              activeOpacity={0.8}
              style={[props.style, styles.customButtonContainer]}
            >
              <View style={styles.highlightButton}>
                <Camera size={34} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          title: 'Meu jardim',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : null}>
              <Leaf size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: 'Ajuda',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : null}>
              <CircleHelp size={Metrics.icon.normal} color={color} strokeWidth={Metrics.icon.strokeWidth} />
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
