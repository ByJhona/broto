import { HelpCircle, Lightbulb, Trophy, type LucideIcon } from 'lucide-react-native';

export type CommunityPostType = 'conquista' | 'duvida' | 'dica';

export const COMMUNITY_POST_TYPES: { value: CommunityPostType; label: string; icon: LucideIcon }[] = [
  { value: 'conquista', label: 'Conquista', icon: Trophy },
  { value: 'duvida', label: 'Dúvida', icon: HelpCircle },
  { value: 'dica', label: 'Dica', icon: Lightbulb },
];
