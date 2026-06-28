import { Text, View } from 'react-native';

import { styles } from '../../theme/styles';

type StatusPillProps = {
  label: string;
};

export function StatusPill({ label }: StatusPillProps) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}
