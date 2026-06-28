import { Pressable, Text, View } from 'react-native';

import { styles } from '../../../theme/styles';

type SeeAllProps = {
  onPress?: () => void;
};

export function SeeAll({ onPress }: SeeAllProps) {
  const content = (
    <View style={styles.seeAllLink}>
      <Text style={styles.seeAll}>See all</Text>
      <Text style={styles.seeAllArrow}>{'\u203a'}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityLabel="See all inspirations"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressedFeedback}
    >
      {content}
    </Pressable>
  );
}
