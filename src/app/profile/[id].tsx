import { useLocalSearchParams } from 'expo-router';
import { ProfileView } from '@/components/profile/ProfileView';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileView userId={id} />;
}
