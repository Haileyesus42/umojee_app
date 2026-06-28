import { Image, Pressable, Text, View } from 'react-native';

import { BellIcon } from '../../assets/icons';
import { logoImage } from '../../assets/images';
import { styles } from '../../theme/styles';

type HeaderProps = {
  notificationUnreadCount?: number;
  onOpenHome: () => void;
  onOpenNotifications: () => void;
};

export function Header({
  notificationUnreadCount = 0,
  onOpenHome,
  onOpenNotifications,
}: HeaderProps) {
  const hasUnreadNotifications = notificationUnreadCount > 0;
  const notificationLabel = notificationUnreadCount > 99 ? '99+' : String(notificationUnreadCount);

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go to home screen"
        accessibilityRole="button"
        onPress={onOpenHome}
        style={({ pressed }) => [styles.logoRing, pressed && styles.pressedFeedback]}
      >
        <Image accessibilityLabel="Umojee logo" source={logoImage} style={styles.logo} />
      </Pressable>
      <Text style={styles.brandName}>Umojee</Text>
      <View style={styles.headerSpacer} />
      <Pressable
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        onPress={onOpenNotifications}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressedFeedback]}
      >
        <BellIcon style={styles.headerIconImage} />
        {hasUnreadNotifications ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationLabel}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
