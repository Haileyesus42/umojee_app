import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { ChatIcon, EllipseCircleIcon } from '../../assets/icons';
import { styles } from '../../theme/styles';

type BottomUnityBarProps = {
  activePageIndex?: number;
  onOpenChat: () => void;
};

export function BottomUnityBar({ activePageIndex = 0, onOpenChat }: BottomUnityBarProps) {
  return (
    <View style={styles.bottomLayer} pointerEvents="box-none">
      <View style={styles.pagePill}>
        <LinearGradient
          colors={['rgba(119,242,246,0.2)', 'rgba(61,61,61,0)']}
          style={styles.pagePillGlow}
        />
        <View style={styles.bottomDots}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[styles.bottomDot, activePageIndex === index && styles.bottomDotActive]}
            />
          ))}
        </View>
      </View>
      <Pressable
        accessibilityLabel="Open Unity assistant"
        accessibilityRole="button"
        onPress={onOpenChat}
        style={({ pressed }) => [styles.floatingAssistantButton, pressed && styles.pressedFeedback]}
      >
        <EllipseCircleIcon style={styles.floatingAssistantCircle} />
        <ChatIcon style={styles.floatingAssistantIcon} />
      </Pressable>
    </View>
  );
}
