import Camera from 'lucide-react-native/icons/camera';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import Droplet from 'lucide-react-native/icons/droplet';
import Leaf from 'lucide-react-native/icons/leaf';
import Scissors from 'lucide-react-native/icons/scissors';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import SprayCan from 'lucide-react-native/icons/spray-can';
import Sprout from 'lucide-react-native/icons/sprout';
import type { LucideIcon } from 'lucide-react-native';
import { TASK_CATEGORY, type TaskCategory } from '@/types';

export const TASK_CATEGORIES: { value: TaskCategory; label: string; icon: LucideIcon }[] = [
  { value: TASK_CATEGORY.WATERING, label: 'Regar', icon: Droplet },
  { value: TASK_CATEGORY.MISTING, label: 'Borrifar', icon: SprayCan },
  { value: TASK_CATEGORY.SOIL_CHECK, label: 'Checar solo', icon: Sprout },
  { value: TASK_CATEGORY.FERTILIZING, label: 'Adubar', icon: Leaf },
  { value: TASK_CATEGORY.PRUNING, label: 'Podar', icon: Scissors },
  { value: TASK_CATEGORY.PURCHASE, label: 'Comprar', icon: ShoppingCart },
  { value: TASK_CATEGORY.GROWTH_CHECK, label: 'Analisar planta', icon: Camera },
  { value: TASK_CATEGORY.OTHER, label: 'Outro', icon: CircleDot },
];

export const CATEGORY_ICONS: Record<TaskCategory, LucideIcon> = Object.fromEntries(
  TASK_CATEGORIES.map((item) => [item.value, item.icon])
) as Record<TaskCategory, LucideIcon>;
