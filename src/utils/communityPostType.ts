import HelpCircle from 'lucide-react-native/icons/circle-question-mark';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Trophy from 'lucide-react-native/icons/trophy';
import type { LucideIcon } from 'lucide-react-native';
import { i18n } from '@/i18n';
import type { ThemeColors } from '@/theme';
import { COMMUNITY_POST_TYPE, type CommunityPostType } from '@/types';

export const COMMUNITY_POST_TYPE_ICONS: Record<CommunityPostType, LucideIcon> = {
  [COMMUNITY_POST_TYPE.CONQUISTA]: Trophy,
  [COMMUNITY_POST_TYPE.DUVIDA]: HelpCircle,
  [COMMUNITY_POST_TYPE.DICA]: Lightbulb,
};

const COMMUNITY_POST_TYPE_VALUES: CommunityPostType[] = Object.values(COMMUNITY_POST_TYPE);

export function communityPostTypes(): { value: CommunityPostType; label: string; icon: LucideIcon }[] {
  return COMMUNITY_POST_TYPE_VALUES.map((value) => ({
    value,
    label: communityPostTypeLabel(value),
    icon: COMMUNITY_POST_TYPE_ICONS[value],
  }));
}

export function communityPostTypeLabel(type: CommunityPostType): string {
  return i18n.t(`communityPostType:${type}`);
}

export function communityPostTypeColor(type: CommunityPostType, colors: ThemeColors): string {
  if (type === COMMUNITY_POST_TYPE.CONQUISTA) return colors.primary;
  if (type === COMMUNITY_POST_TYPE.DUVIDA) return colors.secondaryForeground;
  return colors.leaf;
}
