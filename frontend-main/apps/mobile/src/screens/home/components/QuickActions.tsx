import { Pressable, ScrollView, Text, View } from 'react-native';

import { quickActions } from '../../../data/homeData';
import { styles } from '../../../theme/styles';
import { IconComponent } from '../../../types/icons';

type QuickActionsProps = {
  onOpenChat?: () => void;
};

export function QuickActions({ onOpenChat }: QuickActionsProps) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.quickActions}
      showsHorizontalScrollIndicator={false}
      style={styles.quickActionsViewport}
    >
      {quickActions.map((action) => (
        <QuickActionButton
          key={action.label}
          color={action.color}
          iconLeft={action.iconLeft}
          label={action.label}
          labelHeight={action.labelHeight}
          labelLeft={action.labelLeft}
          labelWidth={action.labelWidth}
          Icon={action.icon}
          height={action.height}
          onPress={onOpenChat}
          width={action.width}
        />
      ))}
    </ScrollView>
  );
}

function QuickActionButton({
  color,
  iconLeft,
  label,
  labelHeight,
  labelLeft,
  labelWidth,
  Icon,
  height,
  onPress,
  width,
}: {
  color: string;
  iconLeft: number;
  label: string;
  labelHeight: number;
  labelLeft: number;
  labelWidth: number;
  Icon: IconComponent;
  height: number;
  onPress?: () => void;
  width: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { height, width },
        pressed && styles.pressedFeedback,
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: color, left: iconLeft }]}>
        <Icon style={styles.quickIconImage} />
      </View>
      <Text
        style={[styles.quickLabel, { height: labelHeight, left: labelLeft, width: labelWidth }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
