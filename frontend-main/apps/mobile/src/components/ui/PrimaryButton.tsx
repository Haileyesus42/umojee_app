import { Pressable, Text } from 'react-native';

import { styles } from '../../theme/styles';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  small?: boolean;
};

export function PrimaryButton({ label, onPress, small = false }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        small && styles.primaryButtonSmall,
        pressed && styles.pressedFeedback,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.primaryButtonText, small && styles.primaryButtonTextSmall]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
