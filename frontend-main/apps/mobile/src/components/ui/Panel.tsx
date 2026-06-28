import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { styles } from '../../theme/styles';

type PanelProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Panel({ children, style }: PanelProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
}
