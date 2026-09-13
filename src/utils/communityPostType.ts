import HelpCircle from 'lucide-react-native/icons/circle-question-mark';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Trophy from 'lucide-react-native/icons/trophy';
import type { LucideIcon } from 'lucide-react-native';
import { COMMUNITY_POST_TYPE, type CommunityPostType } from '@/types';

export const COMMUNITY_POST_TYPES: { value: CommunityPostType; label: string; icon: LucideIcon }[] = [
  { value: COMMUNITY_POST_TYPE.CONQUISTA, label: 'Conquista', icon: Trophy },
  { value: COMMUNITY_POST_TYPE.DUVIDA, label: 'Dúvida', icon: HelpCircle },
  { value: COMMUNITY_POST_TYPE.DICA, label: 'Dica', icon: Lightbulb },
];
