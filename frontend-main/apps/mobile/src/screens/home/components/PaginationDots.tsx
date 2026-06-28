import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

import { styles } from '../../../theme/styles';

type PaginationDotsProps = {
  activeIndex?: number;
  style?: StyleProp<ViewStyle>;
};

export function PaginationDots({ activeIndex = 0, style }: PaginationDotsProps) {
  const cappedActiveIndex = Math.min(activeIndex, 2);

  return (
    <View style={[styles.dots, style]}>
      {[0, 1, 2].map((dotIndex) => (
        <View
          key={dotIndex}
          style={[styles.dot, dotIndex === cappedActiveIndex && styles.dotActive]}
        />
      ))}
    </View>
  );
}
