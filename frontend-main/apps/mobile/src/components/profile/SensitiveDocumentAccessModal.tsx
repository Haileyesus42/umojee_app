import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { styles } from '../../theme/styles';

export type SensitiveDocumentAction = 'view' | 'update';

type SensitiveDocumentAccessModalProps = {
  action: SensitiveDocumentAction;
  busy: boolean;
  documentLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  onPasswordChange: (value: string) => void;
  onTwoFactorCodeChange: (value: string) => void;
  password: string;
  twoFactorCode: string;
  twoFactorEnabled: boolean;
  visible: boolean;
};

export function SensitiveDocumentAccessModal({
  action,
  busy,
  documentLabel,
  onClose,
  onConfirm,
  onPasswordChange,
  onTwoFactorCodeChange,
  password,
  twoFactorCode,
  twoFactorEnabled,
  visible,
}: SensitiveDocumentAccessModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.profileDocumentAccessOverlay}>
        <View style={styles.profileDocumentAccessCard}>
          <View style={styles.profileDocumentAccessHeader}>
            <View style={styles.profileDocumentAccessIcon}>
              <ShieldIcon color="#FFFFFF" size={22} />
            </View>
            <Text style={styles.profileDocumentAccessEyebrow}>
              {action === 'update' ? 'Secure update' : 'Secure view'}
            </Text>
            <Text style={styles.profileDocumentAccessTitle}>
              {action === 'update' ? 'Unlock document field' : 'Reveal document number'}
            </Text>
            <Text style={styles.profileDocumentAccessSubtitle}>
              Confirm your password to {action === 'update' ? 'edit' : 'view'} {documentLabel}.
            </Text>
          </View>

          <View style={styles.profileDocumentAccessBody}>
            <View>
              <Text style={styles.profilePersonalInfoLabel}>Password</Text>
              <View style={styles.profileDocumentAccessInput}>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={onPasswordChange}
                  placeholder="Enter your password"
                  placeholderTextColor="#6A7282"
                  secureTextEntry
                  style={styles.profileDocumentAccessInputText}
                  value={password}
                />
              </View>
            </View>

            {twoFactorEnabled ? (
              <View style={styles.profileDocumentAccessField}>
                <Text style={styles.profilePersonalInfoLabel}>Authenticator Code</Text>
                <View style={styles.profileDocumentAccessInput}>
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(value) =>
                      onTwoFactorCodeChange(value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="123456"
                    placeholderTextColor="#6A7282"
                    style={styles.profileDocumentAccessInputText}
                    value={twoFactorCode}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.profileDocumentAccessActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.profileDocumentAccessSecondaryButton,
                  pressed && styles.pressedFeedback,
                ]}
              >
                <Text style={styles.profileDocumentAccessSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.profileDocumentAccessPrimaryButton,
                  (pressed || busy) && styles.pressedFeedback,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.profilePrimaryButtonText}>
                    {action === 'update' ? 'Unlock' : 'Reveal'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ShieldIcon({ color = '#00A67E', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v5.5c0 4.4 2.8 7.4 7 9.5 4.2-2.1 7-5.1 7-9.5V6l-7-3Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}
