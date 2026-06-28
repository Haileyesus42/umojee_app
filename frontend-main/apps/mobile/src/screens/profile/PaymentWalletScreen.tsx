import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import RightArrowIcon from '../../../assets/icons/right-arrow.svg';
import SpeakIcon from '../../../assets/icons/whisper/speak-line-#002AFF.svg';
import { applePayLogoImage, googlePayLogoImage, samsungWalletLogoImage } from '../../assets/images';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { styles } from '../../theme/styles';

type PaymentWalletScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onLogout?: () => void;
  onOpenChat?: () => void;
  onOpenCompanions: () => void;
  onOpenDocuments: () => void;
  onOpenExpenses: () => void;
  onOpenHome: () => void;
  onOpenJourneys: () => void;
  onOpenNotifications: () => void;
  onOpenPreferences: () => void;
  onOpenProfile: () => void;
  onOpenSecurity: () => void;
  onOpenTravelSupport: () => void;
  onOpenWallet: () => void;
  onOpenWhisper: () => void;
  profileImageUri?: string | null;
};

type ProfilePageLabel =
  | 'Profile'
  | 'Documents'
  | 'Companions'
  | 'Expenses'
  | 'Whisper'
  | 'Preferences'
  | 'Security';

type PaymentMethod = {
  action: string;
  description: string;
  icon: 'card' | 'crypto' | 'apple' | 'samsung' | 'google';
  savedCards?: { detail: string; title: string }[];
  title: string;
};

type Transaction = {
  amount: string;
  kind: 'payment' | 'recharge';
  meta: string;
  title: string;
};

const profilePages: { label: ProfilePageLabel; icon: typeof UserIcon }[] = [
  { label: 'Profile', icon: UserIcon },
  { label: 'Documents', icon: DocumentsIcon },
  { label: 'Companions', icon: CompanionsIcon },
  { label: 'Expenses', icon: ExpensesIcon },
  { label: 'Whisper', icon: SpeakMenuIcon },
  { label: 'Preferences', icon: SettingsIcon },
  { label: 'Security', icon: LockIcon },
];

const paymentMethods: PaymentMethod[] = [
  {
    action: 'Add Credit/Debit Card',
    description: 'Visa, Mastercard, American Express, and Discover',
    icon: 'card',
    savedCards: [
      { title: 'Visa **** 4242', detail: 'Expires 12/26' },
      { title: 'Mastercard **** 8888', detail: 'Expires 09/25' },
    ],
    title: 'Credit/Debit Card',
  },
  {
    action: 'Add Cryptocurrency',
    description: 'BTC, ETH, USDT, and more',
    icon: 'crypto',
    title: 'Cryptocurrency',
  },
  {
    action: 'Add Apple Pay',
    description: 'Pay quickly using Apple Pay',
    icon: 'apple',
    title: 'Apple Pay',
  },
  {
    action: 'Add Samsung Wallet',
    description: 'Pay quickly using Samsung Wallet',
    icon: 'samsung',
    title: 'Samsung Wallet',
  },
  {
    action: 'Add Google Pay',
    description: 'Pay quickly using Google Pay',
    icon: 'google',
    title: 'Google Pay',
  },
];

const transactions: Transaction[] = [
  { amount: '+$500', kind: 'recharge', meta: '2026-01-04 - Card', title: 'Recharge' },
  { amount: '-$120', kind: 'payment', meta: '2026-01-03 - Umojee Wallet', title: 'Payment' },
  { amount: '+$1000', kind: 'recharge', meta: '2026-01-02 - Crypto', title: 'Recharge' },
  { amount: '-$85', kind: 'payment', meta: '2026-01-01 - Card', title: 'Payment' },
];

export function PaymentWalletScreen({
  notificationUnreadCount = 0,
  onBack,
  onLogout,
  onOpenChat,
  onOpenCompanions,
  onOpenDocuments,
  onOpenExpenses,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenPreferences,
  onOpenProfile,
  onOpenSecurity,
  onOpenTravelSupport,
  onOpenWallet,
  onOpenWhisper,
  profileImageUri,
}: PaymentWalletScreenProps) {
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const dropdownTranslateY = useRef(new Animated.Value(330)).current;

  useEffect(() => {
    Animated.timing(dropdownTranslateY, {
      duration: 260,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [dropdownTranslateY]);

  const handlePagePress = (label: ProfilePageLabel) => {
    setIsPageMenuOpen(false);

    if (label === 'Profile') {
      onOpenProfile();
    }

    if (label === 'Documents') {
      onOpenDocuments();
    }

    if (label === 'Companions') {
      onOpenCompanions();
    }

    if (label === 'Expenses') {
      onOpenExpenses();
    }

    if (label === 'Preferences') {
      onOpenPreferences();
    }

    if (label === 'Security') {
      onOpenSecurity();
    }

    if (label === 'Whisper') {
      onOpenWhisper();
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.profileScreen}>
      <ScrollView
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: dropdownTranslateY }] }}>
          <View style={[styles.profileHero, styles.profileHeroCompact]}>
            <Pressable
              accessibilityLabel="Open profile page menu"
              accessibilityRole="button"
              onPress={() => setIsPageMenuOpen(true)}
              style={({ pressed }) => [
                styles.profilePageToggle,
                styles.profilePageToggleCompact,
                pressed && styles.pressedFeedback,
              ]}
            >
              <WalletIcon color="#002AFF" size={20} />
              <Text style={styles.profilePageToggleText}>Payments & Wallet</Text>
              <ChevronDownIcon size={20} />
            </Pressable>
          </View>

          <View style={styles.profilePaymentMain}>
            <View style={styles.profileSectionHeading}>
              <View style={styles.profileSectionIcon}>
                <WalletIcon color="#FFFFFF" size={21} />
              </View>
              <View>
                <Text style={styles.profileSectionTitle}>Payments & Wallet</Text>
                <Text style={styles.profileSectionSubtitle}>
                  Manage payments, cards, and Umojee Wallet
                </Text>
              </View>
            </View>

            <View style={styles.profilePaymentContent}>
              <WalletBalanceCard />

              <View style={styles.profilePaymentMethodsSection}>
                <Text style={styles.profilePaymentSectionTitle}>Payment Methods</Text>
                <Text style={styles.profilePaymentSectionSubtitle}>
                  Manage your payment options and wallet
                </Text>

                <View style={styles.profilePaymentMethodList}>
                  {paymentMethods.map((method) => (
                    <PaymentMethodCard key={method.title} method={method} />
                  ))}
                </View>
              </View>

              <View style={styles.profileTransactionsSection}>
                <Text style={styles.profilePaymentTransactionTitle}>Recent Transactions</Text>
                <View style={styles.profileTransactionList}>
                  {transactions.map((transaction) => (
                    <TransactionRow
                      key={`${transaction.title}-${transaction.meta}`}
                      item={transaction}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Pressable
        accessibilityLabel="Go back to profile"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.profileBackButton, pressed && styles.pressedFeedback]}
      >
        <ArrowLeftIcon />
      </Pressable>

      <FooterWithMenu
        notificationUnreadCount={notificationUnreadCount}
        onLogout={onLogout}
        onOpenChat={onOpenChat ?? (() => undefined)}
        onOpenFlow={onOpenTravelSupport}
        onOpenHome={onOpenHome}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        onOpenTrips={onOpenJourneys}
        onOpenWallet={onOpenWallet}
        profileImageUri={profileImageUri}
        source="profilePaymentWallet"
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setIsPageMenuOpen(false)}
        transparent
        visible={isPageMenuOpen}
      >
        <Pressable
          accessibilityLabel="Close profile page menu"
          onPress={() => setIsPageMenuOpen(false)}
          style={styles.profileMenuOverlay}
        >
          <Pressable style={styles.profileMenuCard}>
            <ScrollView
              contentContainerStyle={styles.profileMenuScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {profilePages.map(({ label, icon: Icon }, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={label}
                  onPress={() => handlePagePress(label)}
                  style={({ pressed }) => [
                    styles.profileMenuItem,
                    index > 0 && styles.profileMenuItemDivider,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <Icon color="#002AFF" size={20} />
                  <Text style={styles.profileMenuItemText}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function WalletBalanceCard() {
  return (
    <View style={styles.profileWalletBalanceCard}>
      <View style={styles.profileWalletHeadingRow}>
        <View style={styles.profilePaymentIconBox}>
          <LightningIcon />
        </View>
        <View style={styles.profilePaymentHeadingText}>
          <Text style={styles.profilePaymentCardTitle}>Umojee Wallet</Text>
          <Text style={styles.profilePaymentCardDescription}>Fast & secure payments</Text>
        </View>
      </View>

      <View style={styles.profileWalletBalanceBlock}>
        <Text style={styles.profileWalletBalanceLabel}>Current Balance</Text>
        <Text style={styles.profileWalletBalanceValue}>$1,295.00</Text>
      </View>

      <View style={styles.profileWalletActions}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.profileWalletSecondaryButton,
            pressed && styles.pressedFeedback,
          ]}
        >
          <PlusIcon color="#002AFF" />
          <Text style={styles.profileWalletSecondaryButtonText}>Recharge</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.profileWalletPrimaryButton,
            pressed && styles.pressedFeedback,
          ]}
        >
          <SendIcon />
          <Text style={styles.profileWalletPrimaryButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PaymentMethodCard({ method }: { method: PaymentMethod }) {
  const isCardMethod = method.savedCards !== undefined;

  return (
    <View
      style={[
        styles.profilePaymentMethodCard,
        isCardMethod ? styles.profilePaymentMethodCardTall : styles.profilePaymentMethodCardSmall,
      ]}
    >
      <View style={styles.profilePaymentMethodInner}>
        <View style={styles.profilePaymentMethodHeading}>
          <PaymentMethodIcon type={method.icon} />
          <View style={styles.profilePaymentHeadingText}>
            <Text style={styles.profilePaymentCardTitle}>{method.title}</Text>
            <Text
              numberOfLines={method.icon === 'card' ? 2 : 1}
              style={styles.profilePaymentCardDescription}
            >
              {method.description}
            </Text>
          </View>
        </View>

        {method.savedCards ? (
          <View style={styles.profileSavedCardList}>
            {method.savedCards.map((card) => (
              <View key={card.title} style={styles.profileSavedCardRow}>
                <View style={styles.profileSavedCardIcon}>
                  <CardIcon color="#FFFFFF" size={16} />
                </View>
                <View>
                  <Text style={styles.profileSavedCardTitle}>{card.title}</Text>
                  <Text style={styles.profileSavedCardDetail}>{card.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.profilePaymentAddButton,
            pressed && styles.pressedFeedback,
          ]}
        >
          <PlusIcon color="#002AFF" />
          <Text style={styles.profilePaymentAddButtonText}>{method.action}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PaymentMethodIcon({ type }: { type: PaymentMethod['icon'] }) {
  return (
    <View style={[styles.profilePaymentIconBox, styles.profilePaymentMethodIconBox]}>
      {type === 'card' ? <CardIcon color="#002AFF" size={24} /> : null}
      {type === 'crypto' ? <CryptoIcon /> : null}
      {type === 'apple' ? (
        <Image source={applePayLogoImage} style={styles.profilePaymentLogoImage} />
      ) : null}
      {type === 'samsung' ? (
        <Image source={samsungWalletLogoImage} style={styles.profilePaymentLogoImage} />
      ) : null}
      {type === 'google' ? (
        <Image source={googlePayLogoImage} style={styles.profilePaymentLogoImage} />
      ) : null}
    </View>
  );
}

function TransactionRow({ item }: { item: Transaction }) {
  const isRecharge = item.kind === 'recharge';

  return (
    <View style={styles.profileTransactionRow}>
      <View style={styles.profileTransactionHeading}>
        <View
          style={[
            styles.profileTransactionIcon,
            isRecharge
              ? styles.profileTransactionIconRecharge
              : styles.profileTransactionIconPayment,
          ]}
        >
          {isRecharge ? <RechargeTransactionIcon /> : <PaymentTransactionIcon />}
        </View>
        <View style={styles.profileTransactionText}>
          <Text style={styles.profileTransactionName}>{item.title}</Text>
          <Text style={styles.profileTransactionMeta}>{item.meta}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.profileTransactionAmount,
          isRecharge
            ? styles.profileTransactionAmountPositive
            : styles.profileTransactionAmountNegative,
        ]}
      >
        {item.amount}
      </Text>
    </View>
  );
}

function ArrowLeftIcon() {
  return <RightArrowIcon color="#FFFFFF" height={18} style={styles.profileBackIcon} width={18} />;
}

function CardIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M3 10h18M7 15h4" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function ChevronDownIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m7 10 5 5 5-5" stroke="#0A0A0A" strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function CryptoIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke="#F59E0B" strokeWidth={1.8} />
      <Path
        d="M10 8h3.2a2 2 0 0 1 0 4H10V8Zm0 4h3.8a2 2 0 0 1 0 4H10v-4ZM9 8h1M9 16h1M11 6v2M14 6v2M11 16v2M14 16v2"
        stroke="#F59E0B"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function LightningIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13.8 3.2 5.8 13h5.3l-.9 7.8 8-9.8h-5.3l.9-7.8Z"
        stroke="#77F2F6"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

function PaymentTransactionIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.0037 9.41421L7.39712 18.0208L5.98291 16.6066L14.5895 8H7.00373V6H18.0037V17H16.0037V9.41421Z"
        fill="#002AFF"
      />
    </Svg>
  );
}

function RechargeTransactionIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 13.589L17.6066 4.98242L19.0208 6.39664L10.4142 15.0032H18V17.0032H7V6.00324H9V13.589Z"
        fill="#002AFF"
      />
    </Svg>
  );
}

function DocumentsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 4h12v16H6V4Z" stroke={color} strokeLinejoin="round" strokeWidth={1.9} />
      <Path d="M9 9h6M9 13h6M9 17h3" stroke={color} strokeLinecap="round" strokeWidth={1.9} />
    </Svg>
  );
}

function CompanionsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Circle cx={16} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 20c.5-3 1.8-4.5 4-4.5s3.5 1.5 4 4.5M12 20c.5-3 1.8-4.5 4-4.5s3.5 1.5 4 4.5"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function ExpensesIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4v15h15"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.9}
      />
      <Path
        d="m8 15 3.2-4 3 2.2L18 8"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.9}
      />
    </Svg>
  );
}

function PlusIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="m21 3-8 18-3.2-8.8L1 9l20-6Z"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function SettingsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" stroke={color} strokeWidth={1.8} />
      <Path
        d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A8 8 0 0 0 7 6L4.6 5l-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5L7 18a8 8 0 0 0 2.6 1.5L10 22h4l.4-2.5A8 8 0 0 0 17 18l2.4 1 2-3.5-2-1.5Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function SpeakMenuIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return <SpeakIcon color={color} height={size} width={size} />;
}

function UserIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 21c.9-4 3.2-6 7-6s6.1 2 7 6"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function LockIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={1.8} />
      <Path d="M12 14v2" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function WalletIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16v12H4V7Z" stroke={color} strokeLinejoin="round" strokeWidth={1.9} />
      <Path d="M7 7V5h10v2" stroke={color} strokeLinejoin="round" strokeWidth={1.9} />
      <Rect x={14} y={11} width={4} height={3} rx={1} stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}
