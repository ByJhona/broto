import type { LucideIcon } from 'lucide-react-native';

export type Plan = {
  id: string;
  name: string;
  description: string;
  price?: string;
};

export type SettingsItem = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

export type UserProfile = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type FollowCounts = {
  followers: number;
  following: number;
};
