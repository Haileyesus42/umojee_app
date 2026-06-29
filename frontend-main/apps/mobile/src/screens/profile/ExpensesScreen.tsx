import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import RightArrowIcon from '../../../assets/icons/right-arrow.svg';
import type { AuthUser } from '../../api/auth/auth';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { useBudgetPreference } from '../../hooks/profile/useBudgetPreference';
import { styles as themeStyles } from '../../theme/styles';
import {
  BUDGET_CURRENCIES,
  BUDGET_MAX_VALUE,
  BUDGET_MIN_VALUE,
  BUDGET_PRESETS,
  BUDGET_STEP_VALUE,
  budgetProgress,
  formatBudgetAmount,
  getBudgetCategoryLabel,
} from '../../utils/profileBudget';

// ---------------------------------------------------------------------
// Compact style overrides (merged with theme)
// ---------------------------------------------------------------------
const compactStyles = StyleSheet.create({
  // ---------- Used by all screens ----------
  profileScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },

  profileHero: {
    paddingTop: 40,
    paddingBottom: 12,
    alignItems: 'center',
  },

  profileHeroCompact: {
    paddingTop: 0,
    paddingBottom: 12,
  },

  profilePageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignSelf: 'center',
    gap: 8,
    marginTop: 4,
  },


  // ---------- Form card (used in Documents, Companions, Expenses) ----------
  profileDocumentsForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0.05,
    elevation: 1,
    flexShrink: 0,
  },

  profileCompanionForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0.05,
    elevation: 1,
    flexShrink: 0,
  },

  // ---------- Main containers ----------
  profileDocumentsMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 0,
    paddingTop: 0,
    paddingBottom: 20,
  },

  profileCompanionsMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 0,
    paddingTop: 0,
    paddingBottom: 20,
  },

  profileExpensesMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 0,
    paddingTop: 0,
    paddingBottom: 20,
  },

    // Section heading
  profileSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 72,
    marginBottom: 24,
    flexShrink: 0,
  },

  profileSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  profileSectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Main form card
  profileExpensesForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 72,
    marginBottom: 16,
    shadowOpacity: 0.05,
    elevation: 1,
    flexShrink: 0,
  },

  // ---------- Shared input and dropdown styles ----------
  profileInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileInputText: {
    fontSize: 15,
    color: '#1A1A1A',
    flex: 1,
  },

  profileField: {
    position: 'relative',
    marginBottom: 4,
    zIndex: 1,
  },

  profileFields: {
    gap: 8,
    marginBottom: 12,
  },

  profileFormLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1A1A1A',
  },

  profileBudgetRangeCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',  // 👈 centers everything inside
  },

  profileBudgetRangeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },

  profileBudgetRangeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },

  profileBudgetRangeMin: {
    color: '#002AFF',
  },

  profileBudgetRangeMax: {
    color: '#EF4444',
  },

  profileBudgetRangeSeparator: {
    color: '#6B7280',
    marginHorizontal: 4,
  },

  profileBudgetField: {
    marginBottom: 12,
  },

  profileBudgetMetric: {
    marginBottom: 16,
  },

  profileBudgetMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  profileBudgetMetricLabel: {
    fontSize: 13,
    color: '#4B5563',
  },

  profileBudgetMetricValue: {
    fontSize: 15,
    fontWeight: '600',
  },

  profileBudgetMetricValueBlue: {
    color: '#002AFF',
  },

  profileBudgetMetricValueRed: {
    color: '#EF4444',
  },

  profileBudgetSlider: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },

  profileBudgetSliderFillFull: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },

  // Budget chips (same as companions)
  profileBudgetChipsViewport: {
    marginBottom: 12,
  },

  profileBudgetChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },

  profileBudgetChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  profileBudgetChipActive: {
    backgroundColor: '#002AFF',
    borderColor: '#002AFF',
  },

  profileBudgetChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },

  profileBudgetChipTextActive: {
    color: '#FFFFFF',
  },

  profileBudgetSaveButton: {
    marginTop: 4,
  },

  // ---------- Shared buttons ----------
  profilePrimaryButton: {
    backgroundColor: '#002AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profilePrimaryButtonDisabled: {
    opacity: 0.6,
  },

  profilePrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },

  profileSaveMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#00A67E',
    textAlign: 'center',
  },
});

// Merge with the original theme
const styles = { ...themeStyles, ...compactStyles };

// ---------------------------------------------------------------------
// Types and component (unchanged from original)
// ---------------------------------------------------------------------
type ExpensesScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onLogout?: () => void;
  onOpenChat?: () => void;
  onOpenCompanions: () => void;
  onOpenDocuments: () => void;
  onOpenHome: () => void;
  onOpenJourneys: () => void;
  onOpenNotifications: () => void;
  onOpenPaymentWallet: () => void;
  onOpenPreferences: () => void;
  onOpenProfile: () => void;
  onOpenSecurity: () => void;
  onOpenTravelSupport: () => void;
  onOpenWhisper: () => void;
  onUserUpdate?: (user: AuthUser) => Promise<void>;
  profileImageUri?: string | null;
  token: string | null;
  user: AuthUser | null;
};

export function ExpensesScreen({
  notificationUnreadCount = 0,
  onBack,
  onLogout,
  onOpenChat,
  onOpenCompanions,
  onOpenDocuments,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenPaymentWallet,
  onOpenPreferences,
  onOpenProfile,
  onOpenSecurity,
  onOpenTravelSupport,
  onOpenWhisper,
  onUserUpdate,
  profileImageUri,
  token,
  user,
}: ExpensesScreenProps) {
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const dropdownTranslateY = useRef(new Animated.Value(330)).current;
  const { budget, hasChanges, message, saveBudget, saving, updateBudget } = useBudgetPreference({
    onUserUpdate,
    token,
    user,
  });
  const selectedCurrency = BUDGET_CURRENCIES.find((currency) => currency.code === budget.currency);
  const minimumAmount = formatBudgetAmount(budget.min, budget.currency);
  const maximumAmount = formatBudgetAmount(budget.max, budget.currency);
  const isSaveDisabled = saving || !hasChanges;
  const activeBudgetCategory = getBudgetCategoryLabel(budget);

  useEffect(() => {
    Animated.timing(dropdownTranslateY, {
      duration: 260,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [dropdownTranslateY]);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.profileScreen}>
      <ScrollView
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: dropdownTranslateY }] }}>
          <View style={styles.profileExpensesMain}>
            <View style={styles.profileSectionHeading}>
              <View>
                <Text style={styles.profileSectionTitle}>Expenses</Text>
                <Text style={styles.profileSectionSubtitle}>Set estimated budget per journey</Text>
              </View>
            </View>

            <View style={styles.profileExpensesForm}>
              <View style={styles.profileBudgetRangeCard}>
                <Text style={styles.profileBudgetRangeLabel}>Budget Range</Text>
                <Text style={styles.profileBudgetRangeValue}>
                  <Text style={styles.profileBudgetRangeMin}>{minimumAmount} </Text>
                  <Text style={styles.profileBudgetRangeSeparator}>-</Text>
                  <Text style={styles.profileBudgetRangeMax}> {maximumAmount}</Text>
                </Text>
              </View>

              <View style={styles.profileBudgetField}>
                <Text style={styles.profileFormLabel}>Currency</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsCurrencyMenuOpen(true)}
                  style={({ pressed }) => [styles.profileInput, pressed && styles.pressedFeedback]}
                >
                  <Text style={styles.profileInputText}>
                    {selectedCurrency?.label || budget.currency}
                  </Text>
                  <ChevronDownIcon size={24} />
                </Pressable>
              </View>

              <BudgetMetric
                fillPercent={budgetProgress(budget.min)}
                label="Minimum Budget"
                maximumValue={10000}
                minimumValue={BUDGET_MIN_VALUE}
                onSliderChange={(value) => updateBudget({ min: value })}
                tone="blue"
                value={budget.min}
                valueLabel={minimumAmount}
              />
              <BudgetMetric
                fillPercent={budgetProgress(budget.max)}
                label="Maximum Budget"
                maximumValue={BUDGET_MAX_VALUE}
                minimumValue={200}
                onSliderChange={(value) => updateBudget({ max: value })}
                tone="red"
                value={budget.max}
                valueLabel={maximumAmount}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.profileBudgetChipsViewport}
                contentContainerStyle={styles.profileBudgetChips}
              >
                {BUDGET_PRESETS.map((preset) => {
                  const isActive = activeBudgetCategory === preset.label;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={preset.label}
                      onPress={() => updateBudget({ max: preset.max, min: preset.min })}
                      style={({ pressed }) => [
                        styles.profileBudgetChip,
                        isActive && styles.profileBudgetChipActive,
                        pressed && styles.pressedFeedback,
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileBudgetChipText,
                          isActive && styles.profileBudgetChipTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                accessibilityRole="button"
                disabled={isSaveDisabled}
                onPress={saveBudget}
                style={({ pressed }) => [
                  styles.profilePrimaryButton,
                  styles.profileBudgetSaveButton,
                  isSaveDisabled && styles.profilePrimaryButtonDisabled,
                  pressed && styles.pressedFeedback,
                ]}
              >
                <Text style={styles.profilePrimaryButtonText}>
                  {saving ? 'Saving...' : 'Save Budget Preferences'}
                </Text>
              </Pressable>
              {message ? <Text style={styles.profileSaveMessage}>{message}</Text> : null}
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
        onOpenWallet={onOpenPaymentWallet}
        profileImageUri={profileImageUri}
        source="profileExpenses"
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setIsCurrencyMenuOpen(false)}
        transparent
        visible={isCurrencyMenuOpen}
      >
        <Pressable
          accessibilityLabel="Close currency menu"
          onPress={() => setIsCurrencyMenuOpen(false)}
          style={styles.profileMenuOverlay}
        >
          <Pressable style={styles.profileMenuCard}>
            <ScrollView
              contentContainerStyle={styles.profileMenuScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {BUDGET_CURRENCIES.map((currency, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={currency.code}
                  onPress={() => {
                    updateBudget({ currency: currency.code });
                    setIsCurrencyMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.profileMenuItem,
                    index > 0 && styles.profileMenuItemDivider,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <WalletIcon color="#002AFF" size={20} />
                  <Text style={styles.profileMenuItemText}>{currency.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------
// Sub‑components (BudgetMetric, GradientBudgetSlider – unchanged)
// ---------------------------------------------------------------------
function BudgetMetric({
  fillPercent,
  label,
  maximumValue,
  minimumValue,
  onSliderChange,
  tone,
  value,
  valueLabel,
}: {
  fillPercent: number;
  label: string;
  maximumValue: number;
  minimumValue: number;
  onSliderChange: (value: number) => void;
  tone: 'blue' | 'red';
  value: number;
  valueLabel: string;
}) {
  return (
    <View style={styles.profileBudgetMetric}>
      <View style={styles.profileBudgetMetricRow}>
        <Text style={styles.profileBudgetMetricLabel}>{label}</Text>
        <Text
          style={[
            styles.profileBudgetMetricValue,
            tone === 'blue'
              ? styles.profileBudgetMetricValueBlue
              : styles.profileBudgetMetricValueRed,
          ]}
        >
          {valueLabel}
        </Text>
      </View>
      <GradientBudgetSlider
        fillPercent={fillPercent}
        maximumValue={maximumValue}
        minimumValue={minimumValue}
        onChange={onSliderChange}
        value={value}
      />
    </View>
  );
}

function GradientBudgetSlider({
  fillPercent,
  maximumValue,
  minimumValue,
  onChange,
  value,
}: {
  fillPercent: number;
  maximumValue: number;
  minimumValue: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const trackWidthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const updateFromPosition = (positionX: number) => {
    const width = trackWidthRef.current;

    if (!width) {
      return;
    }

    const ratio = Math.max(0, Math.min(1, positionX / width));
    const rawValue = minimumValue + ratio * (maximumValue - minimumValue);
    const steppedValue = Math.round(rawValue / BUDGET_STEP_VALUE) * BUDGET_STEP_VALUE;

    onChange(Math.max(minimumValue, Math.min(maximumValue, steppedValue)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        setIsDragging(true);
        updateFromPosition(event.nativeEvent.locationX);
      },
      onPanResponderMove: (event) => updateFromPosition(event.nativeEvent.locationX),
      onPanResponderRelease: () => setIsDragging(false),
      onPanResponderTerminate: () => setIsDragging(false),
      onStartShouldSetPanResponder: () => true,
    }),
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    trackWidthRef.current = event.nativeEvent.layout.width;
  };
  const normalizedFill = Number.isFinite(value)
    ? Math.max(4, Math.min(100, ((value - minimumValue) / (maximumValue - minimumValue)) * 100))
    : fillPercent;

  return (
    <View
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      onLayout={handleLayout}
      style={styles.profileBudgetSlider}
    >
      <LinearGradient
        colors={['#002AFF', '#77F2F6']}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 0 }}
        style={[styles.profileBudgetSliderFillFull, { width: `${normalizedFill}%` }]}
      />
      {isDragging ? (
        <View
          pointerEvents="none"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#002AFF',
            borderRadius: 8,
            borderWidth: 2,
            height: 16,
            left: `${normalizedFill}%`,
            marginLeft: -8,
            marginTop: -4,
            position: 'absolute',
            width: 16,
          }}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------
// Icons (unchanged – kept from original)
// ---------------------------------------------------------------------
function ArrowLeftIcon() {
  return <RightArrowIcon color="#FFFFFF" height={18} style={styles.profileBackIcon} width={18} />;
}

function ChevronDownIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m7 10 5 5 5-5" stroke="#0A0A0A" strokeLinecap="round" strokeWidth={2} />
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

function WalletIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16v12H4V7Z" stroke={color} strokeLinejoin="round" strokeWidth={1.9} />
      <Path d="M7 7V5h10v2" stroke={color} strokeLinejoin="round" strokeWidth={1.9} />
      <Rect x={14} y={11} width={4} height={3} rx={1} stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}