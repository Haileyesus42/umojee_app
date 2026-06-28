import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { UnityIcon } from '../../assets/icons';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';

type FooterItemLabel = 'Home' | 'Trips' | 'Flow' | 'Menu';

type FooterProps = {
  onOpenFlow?: () => void;
  onOpenChat: () => void;
  onOpenHome?: () => void;
  onOpenMenu?: () => void;
  onOpenTrips?: () => void;
  source?: string;
};

export function Footer({
  onOpenChat,
  onOpenFlow,
  onOpenHome,
  onOpenMenu,
  onOpenTrips,
  source = 'unknown',
}: FooterProps) {
  const activeItem = getActiveFooterItem(source);

  return (
    <View style={footerStyles.footerSafeArea}>
      <View style={footerStyles.footer}>
        <FooterItem
          active={activeItem === 'Home'}
          icon={(color) => <HomeIcon color={color} />}
          label="Home"
          onPress={() => {
            onOpenHome?.();
          }}
        />
        <FooterItem
          active={activeItem === 'Trips'}
          icon={(color) => <TripsIcon color={color} />}
          label="Trips"
          onPress={() => {
            onOpenTrips?.();
          }}
        />
        <Pressable
          accessibilityLabel="Open Unity assistant"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => {
            console.log(`[Footer] Center Unity icon clicked from ${source}; opening AI chat page`);
            onOpenChat();
          }}
          style={({ pressed }) => [
            footerStyles.unityButton,
            pressed && sharedStyles.pressedFeedback,
          ]}
        >
          <UnityIcon style={footerStyles.unityIcon} />
        </Pressable>
        <FooterItem
          active={activeItem === 'Flow'}
          icon={(color) => <FlowIcon color={color} />}
          label="Flow"
          onPress={() => {
            onOpenFlow?.();
          }}
        />
        <FooterItem
          active={activeItem === 'Menu'}
          icon={(color) => <MenuIcon color={color} />}
          label="Menu"
          onPress={() => {
            onOpenMenu?.();
          }}
        />
      </View>
    </View>
  );
}

function FooterItem({
  active = false,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  icon: (color: string) => React.ReactNode;
  label: FooterItemLabel;
  onPress?: () => void;
}) {
  const iconColor = active ? '#FFFFFF' : colors.ink;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [footerStyles.footerItem, pressed && sharedStyles.pressedFeedback]}
    >
      <View style={[footerStyles.footerCircle, active && footerStyles.footerCircleActive]}>
        {icon(iconColor)}
        <Text style={[footerStyles.footerLabel, active && footerStyles.footerLabelActive]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function getActiveFooterItem(source: string): FooterItemLabel | null {
  if (source === 'home') {
    return 'Home';
  }

  if (source === 'journeys') {
    return 'Trips';
  }

  if (source === 'flow' || source === 'travelSupport') {
    return 'Flow';
  }

  if (source === 'menuOverlay' || source.startsWith('profile')) {
    return 'Menu';
  }

  return null;
}

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg height={18} viewBox="0 0 18 18" width={18}>
      <Path
        d="M9.75 14.2498H14.25V7.48343L9 3.40009L3.75 7.48343V14.2498H8.25V9.74977H9.75V14.2498ZM15.75 14.9998C15.75 15.414 15.4142 15.7498 15 15.7498H3C2.58579 15.7498 2.25 15.414 2.25 14.9998V7.11661C2.25 6.88517 2.35685 6.66669 2.53954 6.5246L8.53957 1.85793C8.8104 1.64729 9.1896 1.64729 9.46043 1.85793L15.4604 6.5246C15.6431 6.66669 15.75 6.88517 15.75 7.11661V14.9998Z"
        fill={color}
      />
    </Svg>
  );
}

function TripsIcon({ color }: { color: string }) {
  return (
    <Svg height={18} viewBox="0 0 18 18" width={18}>
      <Path
        d="M11.25 2.25C11.6642 2.25 12 2.58579 12 3V4.5H15C15.4142 4.5 15.75 4.83579 15.75 5.25V14.25H17.25V15.75H0.75V14.25H2.25V5.25C2.25 4.83579 2.58579 4.5 3 4.5H6V3C6 2.58579 6.33579 2.25 6.75 2.25H11.25ZM6 6H3.75V14.25H6V6ZM10.5 6H7.5V14.25H10.5V6ZM14.25 6H12V14.25H14.25V6ZM10.5 3.75H7.5V4.5H10.5V3.75Z"
        fill={color}
      />
    </Svg>
  );
}

function FlowIcon({ color }: { color: string }) {
  return (
    <Svg height={18} viewBox="0 0 18 18" width={18}>
      <Path
        d="M9 3C11.0615 3 12.8812 4.0397 13.9617 5.625H12V7.125H16.5V2.625H15V4.49952C13.6321 2.67875 11.4543 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9H3C3 5.68629 5.68629 3 9 3ZM15 9C15 12.3137 12.3137 15 9 15C6.93858 15 5.11881 13.9603 4.03832 12.375H6V10.875H1.5V15.375H3V13.5005C4.36786 15.3212 6.54573 16.5 9 16.5C13.1421 16.5 16.5 13.1421 16.5 9H15Z"
        fill={color}
      />
    </Svg>
  );
}

function MenuIcon({ color }: { color: string }) {
  return (
    <Svg height={18} viewBox="0 0 18 18" width={18}>
      <Path
        d="M13.5 13.5V15H4.5V13.5H13.5ZM15.75 8.25V9.75H2.25V8.25H15.75ZM13.5 3V4.5H4.5V3H13.5Z"
        fill={color}
      />
    </Svg>
  );
}

const footerStyles = StyleSheet.create({
  footerSafeArea: {
    backgroundColor: 'transparent',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F0F0F5',
    borderTopWidth: 1,
    elevation: 7,
    flexDirection: 'row',
    gap: 9,
    height: 122,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16.7,
  },
  footerItem: {
    alignItems: 'center',
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  footerCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CFCFCF',
    borderRadius: 29,
    borderWidth: 1.5,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  footerCircleActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  footerLabel: {
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
    marginTop: 4,
  },
  footerLabelActive: {
    color: '#FFFFFF',
  },
  unityButton: {
    alignItems: 'center',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  unityIcon: {
    height: 64,
    width: 64,
  },
});
