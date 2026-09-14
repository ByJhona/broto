import Camera from 'lucide-react-native/icons/camera';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import Droplet from 'lucide-react-native/icons/droplet';
import Leaf from 'lucide-react-native/icons/leaf';
import Scissors from 'lucide-react-native/icons/scissors';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import SprayCan from 'lucide-react-native/icons/spray-can';
import Sprout from 'lucide-react-native/icons/sprout';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from '@/i18n';
import { TASK_CATEGORY, type TaskCategory } from '@/types';

const TASK_CATEGORY_VALUES: TaskCategory[] = Object.values(TASK_CATEGORY);

export const CATEGORY_ICONS: Record<TaskCategory, LucideIcon> = {
  [TASK_CATEGORY.WATERING]: Droplet,
  [TASK_CATEGORY.MISTING]: SprayCan,
  [TASK_CATEGORY.SOIL_CHECK]: Sprout,
  [TASK_CATEGORY.FERTILIZING]: Leaf,
  [TASK_CATEGORY.PRUNING]: Scissors,
  [TASK_CATEGORY.PURCHASE]: ShoppingCart,
  [TASK_CATEGORY.GROWTH_CHECK]: Camera,
  [TASK_CATEGORY.OTHER]: CircleDot,
};

export function useTaskCategories(): { value: TaskCategory; label: string; icon: LucideIcon }[] {
  const { t } = useTranslation('taskCategories');
  return TASK_CATEGORY_VALUES.map((value) => ({ value, label: t(value), icon: CATEGORY_ICONS[value] }));
}
