import { View } from '@/rn';
import {
  FiPieChart,
  FiCreditCard,
  FiUsers,
  FiFileText,
  FiPlus,
  FiArrowRight,
  FiChevronLeft,
  FiCheck,
  FiX,
  FiShare2,
  FiDollarSign,
  FiSend,
} from 'react-icons/fi';

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  overview: FiPieChart,
  expenses: FiCreditCard,
  members: FiUsers,
  settlements: FiFileText,
  plus: FiPlus,
  arrowRight: FiArrowRight,
  chevronLeft: FiChevronLeft,
  check: FiCheck,
  x: FiX,
  share: FiShare2,
  dollar: FiDollarSign,
  send: FiSend,
};

export function Icon({
  name,
  size = 20,
  color = 'var(--dabbu-text, #FFFFFF)',
}: {
  name: keyof typeof iconMap;
  size?: number;
  color?: string;
}) {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    return null;
  }
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <IconComponent size={size} color={color} />
    </View>
  );
}
