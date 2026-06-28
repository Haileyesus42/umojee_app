import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { defaultProfileImage } from '../../assets/images';
import { colors } from '../../constants/colors';
import { styles } from '../../theme/styles';
import { Footer } from '../navigation/Footer';

type MenuOverlayProps = {
  visible: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
  onOpenHome?: () => void;
  onOpenProfile?: () => void;
  onOpenWallet?: () => void;
  onOpenJourneys?: () => void;
  onOpenTravelSupport?: () => void;
  onOpenNotifications?: () => void;
  onLogout?: () => void;
  profileImageUri?: string | null;
  notificationUnreadCount?: number;
  userName?: string;
  userEmail?: string;
  userHandle?: string;
};

type MenuIconProps = {
  color?: string;
  size?: number;
};

type MenuItem = {
  label: string;
  subtitle: string;
  icon: (props: MenuIconProps) => ReactElement;
  iconBackground: string;
  action: 'profile' | 'wallet' | 'support' | 'bookings' | 'settings' | 'logout';
  danger?: boolean;
};

const menuItems: MenuItem[] = [
  {
    label: 'Manage Account',
    subtitle: 'Update your personal information',
    icon: UserSettingsIcon,
    iconBackground: '#EEF2FF',
    action: 'profile',
  },
  {
    label: 'Wallet',
    subtitle: 'Manage payments and travel expenses',
    icon: WalletIcon,
    iconBackground: '#FFE8F9',
    action: 'wallet',
  },
  {
    label: 'Help & Support',
    subtitle: 'Get help or contact support',
    icon: AccountCircleIcon,
    iconBackground: '#F3E8FF',
    action: 'support',
  },
  {
    label: 'My Bookings',
    subtitle: 'View and manage your bookings',
    icon: BillIcon,
    iconBackground: '#DCFCE7',
    action: 'bookings',
  },
  {
    label: 'Language & Currency',
    subtitle: 'Choose your preferred settings',
    icon: GlobalIcon,
    iconBackground: '#FFF7ED',
    action: 'settings',
  },
];

const logoutItem: MenuItem = {
  label: 'Log Out',
  subtitle: 'Sign out of your account.',
  icon: DoorOpenIcon,
  iconBackground: '#FEE2E2',
  action: 'logout',
  danger: true,
};

export function MenuOverlay({
  visible,
  onClose,
  onOpenChat,
  onOpenHome,
  onOpenProfile,
  onOpenWallet,
  onOpenJourneys,
  onOpenTravelSupport,
  onOpenNotifications,
  onLogout,
  profileImageUri,
  notificationUnreadCount = 0,
  userName = 'John Doe',
  userEmail = 'johndoe@email.com',
  userHandle = '@johndoe123',
}: MenuOverlayProps) {
  const insets = useSafeAreaInsets();
  const [profileImageLoadFailed, setProfileImageLoadFailed] = useState(false);
  const profileImageSource =
    profileImageUri && !profileImageLoadFailed ? { uri: profileImageUri } : defaultProfileImage;
  const topPadding = Math.max(insets.top + 18, 42);
  const normalizedHandle = userHandle.trim() || 'johndoe123';
  const displayHandle = normalizedHandle.startsWith('@')
    ? normalizedHandle
    : `@${normalizedHandle}`;

  useEffect(() => {
    setProfileImageLoadFailed(false);
  }, [profileImageUri]);

  const closeThen = (callback?: () => void) => {
    onClose();
    callback?.();
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.action === 'profile') {
      closeThen(onOpenProfile);
      return;
    }

    if (item.action === 'wallet') {
      closeThen(onOpenWallet);
      return;
    }

    if (item.action === 'support') {
      closeThen(onOpenTravelSupport);
      return;
    }

    if (item.action === 'bookings') {
      closeThen(onOpenJourneys);
      return;
    }

    if (item.action === 'logout') {
      closeThen(onLogout);
      return;
    }

    onClose();
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close menu" onPress={onClose} style={styles.menuOverlayRoot}>
        <Pressable style={menuOverlayStyles.panel}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              menuOverlayStyles.scrollContent,
              { paddingTop: topPadding },
            ]}
            showsVerticalScrollIndicator={false}
            style={menuOverlayStyles.scroll}
          >
            <View style={menuOverlayStyles.header}>
              <View>
                <Text style={menuOverlayStyles.title}>Menu</Text>
                <Text style={menuOverlayStyles.subtitle}>Manage your account and preferences.</Text>
              </View>
              <Pressable
                accessibilityLabel="Open notifications"
                accessibilityRole="button"
                onPress={() => closeThen(onOpenNotifications)}
                style={({ pressed }) => [
                  menuOverlayStyles.notificationButton,
                  pressed && styles.pressedFeedback,
                ]}
              >
                <BellIcon color={colors.ink} size={22} />
                {notificationUnreadCount > 0 ? (
                  <View style={menuOverlayStyles.notificationBadge}>
                    <Text style={menuOverlayStyles.notificationBadgeText}>
                      {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            <View style={menuOverlayStyles.profileCard}>
              <View style={menuOverlayStyles.profileImageOuter}>
                <Image
                  onError={() => setProfileImageLoadFailed(true)}
                  source={profileImageSource}
                  style={menuOverlayStyles.profileImage}
                />
              </View>
              <View style={menuOverlayStyles.profileCopy}>
                <View style={menuOverlayStyles.profileNameRow}>
                  <Text numberOfLines={1} style={menuOverlayStyles.profileName}>
                    {userName}
                  </Text>
                  <Text numberOfLines={1} style={menuOverlayStyles.profileHandle}>
                    {displayHandle}
                  </Text>
                </View>
                <Text numberOfLines={1} style={menuOverlayStyles.profileEmail}>
                  {userEmail}
                </Text>
                <View style={menuOverlayStyles.premiumBadge}>
                  <PremiumIcon color={colors.blue} size={12} />
                  <Text style={menuOverlayStyles.premiumBadgeText}>Umoja Premium</Text>
                </View>
              </View>
            </View>

            <Text style={menuOverlayStyles.sectionLabel}>Account</Text>
            <View style={menuOverlayStyles.itemGroup}>
              {menuItems.map((item) => (
                <MenuRow item={item} key={item.label} onPress={() => handleMenuPress(item)} />
              ))}
            </View>

            <Text style={[menuOverlayStyles.sectionLabel, menuOverlayStyles.otherLabel]}>
              Other
            </Text>
            <View style={menuOverlayStyles.itemGroup}>
              <MenuRow item={logoutItem} onPress={() => handleMenuPress(logoutItem)} />
            </View>
          </ScrollView>

          <Footer
            onOpenChat={() => closeThen(onOpenChat)}
            onOpenFlow={() => closeThen(onOpenTravelSupport)}
            onOpenHome={() => closeThen(onOpenHome)}
            onOpenMenu={onClose}
            onOpenTrips={() => closeThen(onOpenJourneys)}
            source="menuOverlay"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuRow({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  const Icon = item.icon;
  const iconColor = item.danger ? '#EF4444' : colors.blue;
  const titleStyle = item.danger
    ? [menuOverlayStyles.itemTitle, menuOverlayStyles.dangerTitle]
    : menuOverlayStyles.itemTitle;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [menuOverlayStyles.itemRow, pressed && styles.pressedFeedback]}
    >
      <View style={[menuOverlayStyles.itemIconTile, { backgroundColor: item.iconBackground }]}>
        <Icon color={iconColor} size={19} />
      </View>
      <View style={menuOverlayStyles.itemCopy}>
        <Text style={titleStyle}>{item.label}</Text>
        <Text numberOfLines={1} style={menuOverlayStyles.itemSubtitle}>
          {item.subtitle}
        </Text>
      </View>
      <ChevronRightIcon color={item.danger ? '#EF4444' : '#9CA3AF'} size={18} />
    </Pressable>
  );
}

function BellIcon({ color = '#111111', size = 22 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 9.5v3.8l1.6 3.2H4.4L6 13.3V9.5a6 6 0 0 1 12 0Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path d="M9.5 19a2.7 2.7 0 0 0 5 0" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function PremiumIcon({ color = '#111111', size = 12 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m12 3 2.4 5 5.5.8-4 3.9.9 5.5L12 15.6l-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3Z"
        fill={color}
      />
    </Svg>
  );
}

function ChevronRightIcon({ color = '#9CA3AF', size = 18 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m9 18 6-6-6-6"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function UserSettingsIcon({ color = '#111111', size = 19 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 21c1-4 3.3-6 7-6 1.7 0 3.1.4 4.2 1.2"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
      <Path
        d="M18.5 15.2v1.2m0 4.2v1.2m3.1-3.3h1.2m-7 0H17m3.5-2.1-.8.8m-2.4 2.4-.8.8m4 0-.8-.8m-2.4-2.4-.8-.8"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}

function WalletIcon({ color = '#111111', size = 19 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2H7a3 3 0 0 0 0 6h13v2a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path d="M17 12h.1" stroke={color} strokeLinecap="round" strokeWidth={3} />
    </Svg>
  );
}

function AccountCircleIcon({ color = '#111111', size = 19 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={9} r={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M6.8 19c.9-3 2.6-4.5 5.2-4.5S16.3 16 17.2 19"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function BillIcon({ color = '#111111', size = 19 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3h10a2 2 0 0 1 2 2v16l-3-1.7-3 1.7-3-1.7L7 21V5a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path d="M9 8h6M9 12h6M9 16h4" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function GlobalIcon({ color = '#111111', size = 19 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path
        d="M3.5 12h17M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function DoorOpenIcon({ color = '#111111', size = 19 }: MenuIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 21h14M7 21V4.5L16 3v18"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Rect fill={color} height={1.5} rx={0.75} width={1.5} x={11.5} y={11} />
    </Svg>
  );
}

const menuOverlayStyles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 31,
    paddingLeft: 4,
  },
  title: {
    color: '#111827',
    fontFamily: 'DMSans-Bold',
    fontSize: 26,
    lineHeight: 31,
  },
  subtitle: {
    color: '#9CA3AF',
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 1,
  },
  notificationButton: {
    alignItems: 'center',
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 24.5,
    borderWidth: 1,
    height: 49,
    justifyContent: 'center',
    marginRight: 11,
    width: 49,
  },
  notificationBadge: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderColor: colors.panel,
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: -8,
    top: -5,
    width: 26,
  },
  notificationBadgeText: {
    color: colors.panel,
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    lineHeight: 16,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 20,
    flexDirection: 'row',
    minHeight: 109,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#4F74FF',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  profileImageOuter: {
    alignItems: 'center',
    borderRadius: 33,
    height: 66,
    justifyContent: 'center',
    marginRight: 12,
    width: 66,
  },
  profileImage: {
    borderColor: '#E5E7EB',
    borderRadius: 30.5,
    borderWidth: 0.5,
    height: 61,
    width: 61,
  },
  profileCopy: {
    flex: 1,
  },
  profileNameRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    minWidth: 0,
  },
  profileName: {
    color: colors.panel,
    flexShrink: 1,
    fontFamily: 'DMSans-Bold',
    fontSize: 17,
    lineHeight: 21,
    maxWidth: 112,
  },
  profileHandle: {
    color: colors.panel,
    flexShrink: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 8,
    opacity: 0.94,
  },
  profileEmail: {
    color: colors.panel,
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 1,
    opacity: 0.96,
  },
  premiumBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.panel,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 6,
    height: 26,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  premiumBadgeText: {
    color: colors.blue,
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    lineHeight: 15,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.1,
    lineHeight: 14,
    marginBottom: 10,
    marginLeft: 4,
    marginTop: 28,
    textTransform: 'uppercase',
  },
  otherLabel: {
    marginTop: 26,
  },
  itemGroup: {
    backgroundColor: colors.panel,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 70,
    paddingHorizontal: 16,
  },
  itemIconTile: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    marginRight: 12,
    width: 42,
  },
  itemCopy: {
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flex: 1,
    height: 70,
    justifyContent: 'center',
    paddingRight: 10,
  },
  itemTitle: {
    color: '#111827',
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    lineHeight: 18,
  },
  dangerTitle: {
    color: '#EF4444',
  },
  itemSubtitle: {
    color: '#9CA3AF',
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  copyright: {
    alignItems: 'center',
    marginTop: 122,
  },
  footerLogos: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
  },
  footerLogo: {
    height: 41,
    resizeMode: 'contain',
    width: 34,
  },
  footerDivider: {
    backgroundColor: '#D9D9D9',
    height: 41,
    width: 1,
  },
  footerNexusLogo: {
    height: 41,
    resizeMode: 'contain',
    width: 50,
  },
  copyrightText: {
    color: '#000000',
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 21,
    textAlign: 'center',
  },
});
