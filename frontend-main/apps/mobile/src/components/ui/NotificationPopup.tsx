import { useRef } from 'react';
import { Image, PanResponder, Text, View } from 'react-native';

import { popupNotificationLogoImage } from '../../assets/images';
import { styles } from '../../theme/styles';

type NotificationPopupProps = {
  accessibilityLabel?: string;
  body: string;
  onDismiss: () => void;
  timeLabel: string;
  title: string;
};

export function NotificationPopup({
  accessibilityLabel,
  body,
  onDismiss,
  timeLabel,
  title,
}: NotificationPopupProps) {
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const horizontalDistance = Math.abs(gestureState.dx);
        const verticalDistance = Math.abs(gestureState.dy);

        return horizontalDistance > 4 && horizontalDistance > verticalDistance;
      },
      onPanResponderRelease: (_, gestureState) => {
        const horizontalSwipe = Math.abs(gestureState.dx) > 40;
        const tap = Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8;

        if (horizontalSwipe || tap) {
          onDismiss();
        }
      },
      onPanResponderTerminate: () => undefined,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || `${title}. ${body}`}
      style={styles.rideNotificationPopup}
    >
      <View style={styles.rideNotificationLogoTile}>
        <Image source={popupNotificationLogoImage} style={styles.rideNotificationLogo} />
      </View>
      <View style={styles.rideNotificationCopy}>
        <Text style={styles.rideNotificationTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rideNotificationMessage}>{body}</Text>
      </View>
      <Text style={styles.rideNotificationTime}>{timeLabel}</Text>
    </View>
  );
}
