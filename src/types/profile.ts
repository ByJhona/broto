export type UserProfile = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  locale: 'en' | 'pt';
  created_at?: string;
  updated_at?: string;
};

export type FollowCounts = {
  followers: number;
  following: number;
};
