import Camera from 'lucide-react-native/icons/camera';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import Droplet from 'lucide-react-native/icons/droplet';
import Leaf from 'lucide-react-native/icons/leaf';
import Scissors from 'lucide-react-native/icons/scissors';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import SprayCan from 'lucide-react-native/icons/spray-can';
import Sprout from 'lucide-react-native/icons/sprout';
import type { LucideIcon } from 'lucide-react-native';
import type { TaskCategory } from '@/types';

export const TASK_CATEGORIES: { value: TaskCategory; label: string; icon: LucideIcon }[] = [
  { value: 'watering', label: 'Regar', icon: Droplet },
  { value: 'misting', label: 'Borrifar', icon: SprayCan },
  { value: 'soil_check', label: 'Checar solo', icon: Sprout },
  { value: 'fertilizing', label: 'Adubar', icon: Leaf },
  { value: 'pruning', label: 'Podar', icon: Scissors },
  { value: 'purchase', label: 'Comprar', icon: ShoppingCart },
  { value: 'growth_check', label: 'Analisar planta', icon: Camera },
  { value: 'other', label: 'Outro', icon: CircleDot },
];

export const CATEGORY_ICONS: Record<TaskCategory, LucideIcon> = Object.fromEntries(
  TASK_CATEGORIES.map((item) => [item.value, item.icon])
) as Record<TaskCategory, LucideIcon>;
