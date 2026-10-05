import { Pressable, Text, View } from 'react-native';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, type ThemeColors } from '@/theme';
import { IconBadge } from '@/components';
import { makeStyles } from './styles';

type ActionCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
};

export function ActionCard({ icon: Icon, title, subtitle, onPress, styles, colors }: Readonly<ActionCardProps>) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <IconBadge size={Metrics.size.xl} backgroundColor={colors.leafForeground}>
        <Icon size={Metrics.icon.large} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
      </IconBadge>
      <View style={styles.actionTextBox}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <ArrowRight size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
    </Pressable>
  );
}
