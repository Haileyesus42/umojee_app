// src/screens/profile/WisperScreen.tsx

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import RightArrowIcon from '../../../assets/icons/right-arrow.svg';
import ContactsIcon from '../../../assets/icons/whisper/contacts-book-3-line.svg';
import EditPenIcon from '../../../assets/icons/whisper/edit-pen.svg';
import MoreIcon from '../../../assets/icons/whisper/more-icon.svg';
import PlusIconWhite from '../../../assets/icons/whisper/plus-icon-white.svg';
import DiamondIcon from '../../../assets/icons/whisper/vip-diamond-line.svg';
import { companionAvatarImage } from '../../assets/images';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { colors } from '../../constants/colors';
import VolumeSOSServiceModule from '../../modules/VolumeSOSService/VolumeSOSServiceModule';
import { styles as themeStyles } from '../../theme/styles';
import {
  fetchEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  triggerEmergencyWebhook,
  type EmergencyContact,
  type EmergencyWebhookResponse,
} from '../../api/emergency';

// ---------------------------------------------------------------------
// Compact style overrides (merged with theme)
// ---------------------------------------------------------------------
const compactStyles = StyleSheet.create({
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
  profileSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 72,
    marginBottom: 4,
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
  profileWhisperMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 0,
    paddingTop: 60,
    paddingBottom: 20,
  },
  profileWhisperForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowOpacity: 0.05,
    elevation: 1,
    flexShrink: 0,
  },
  profilePrimaryButton: {
    backgroundColor: '#002AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

const styles = { ...themeStyles, ...compactStyles };

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
type WisperScreenProps = {
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
  onOpenPaymentWallet: () => void;
  onOpenPreferences: () => void;
  onOpenProfile: () => void;
  onOpenSecurity: () => void;
  onOpenTravelSupport: () => void;
  profileImageUri?: string | null;
  token: string | null;
};


type ContactFormData = {
  name: string;
  phone: string;
  relationship?: string;
};

type DisplayContact = {
  id?: string;
  _id?: string;
  name: string;
  phone: string;
  relationship?: string;
  initials?: string;
  priorityLabel?: string;
};


const whisperSettings = [
  {
    description: 'Activate emergency code word detection',
    enabled: true,
    title: 'Enable Whisper',
  },
  {
    description: 'Notify contacts when Whisper is triggered',
    enabled: true,
    title: 'Auto Contact Trusted Contacts',
  },
  {
    description: 'Contact authorities in critical situations',
    enabled: true,
    title: 'Emergency Authority Alert',
  },
  {
    description: 'Trigger without sound or visual feedback',
    enabled: true,
    title: 'Silent Activation',
  },
  {
    description: 'Share live location during emergencies',
    enabled: true,
    title: 'Location Sharing',
  },
  {
    description: 'Improve detection accuracy',
    enabled: true,
    title: 'Voice Recognition Sensitivity',
  },
  {
    description: 'Reduce accidental activations',
    enabled: true,
    title: 'False Trigger Protection',
  },
];

export function WisperScreen({
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
  onOpenPaymentWallet,
  onOpenPreferences,
  onOpenProfile,
  onOpenSecurity,
  onOpenTravelSupport,
  profileImageUri,
  token,
}: WisperScreenProps) {
  const [settings, setSettings] = useState(whisperSettings);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [sosTriggering, setSosTriggering] = useState(false);
  const [volumeTrigger, setVolumeTrigger] = useState<'up' | 'down' | 'both'>('both');
  const [isVolumeTriggerOpen, setIsVolumeTriggerOpen] = useState(false);
  const [codeWord, setCodeWord] = useState('"banana banana"');
  const [codeWordInput, setCodeWordInput] = useState('');
  const [codeWordFormOpen, setCodeWordFormOpen] = useState<'edit' | 'add' | null>(null);

  useEffect(() => {
    VolumeSOSServiceModule.setVolumeTriggerButton(volumeTrigger);
  }, [volumeTrigger]);
  const dropdownTranslateY = useRef(new Animated.Value(330)).current;

  useEffect(() => {
    Animated.timing(dropdownTranslateY, {
      duration: 260,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [dropdownTranslateY]);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, [token]);

  const loadContacts = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const contactsData = await fetchEmergencyContacts(token);
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert('Error', 'Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

const toggleSetting = (title: string) => {
    setSettings((currentSettings) =>
      currentSettings.map((item) =>
        item.title === title ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  const toggleSettingsExpand = () => {
    setSettingsExpanded((prev) => !prev);
  };

  const handleAddContact = async (formData: ContactFormData) => {
    if (!token) {
      Alert.alert('Error', 'Please sign in again');
      return;
    }

    try {
      setSaving(true);
      const result = await createEmergencyContact(token, {
        name: formData.name,
        phone: formData.phone,
        relationship: formData.relationship,
        priority: contacts.length + 1,
      });

      const newContact = result.data || result;
      setContacts((prev) => [...prev, newContact]);
      setIsAddContactModalOpen(false);
      Alert.alert('Success', 'Contact added successfully');
    } catch (error) {
      console.error('Failed to add contact:', error);
      Alert.alert('Error', 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  const handleEditContact = async (formData: ContactFormData) => {
    if (!token || !editingContact) {
      Alert.alert('Error', 'Please sign in again');
      return;
    }

    try {
      setSaving(true);
      const contactId = editingContact.id || editingContact._id || '';
      const result = await updateEmergencyContact(token, contactId, {
        name: formData.name,
        phone: formData.phone,
        relationship: formData.relationship,
      });

      const updatedContact = result.data || result;
      setContacts((prev) =>
        prev.map((c) =>
          (c.id || c._id) === contactId ? { ...c, ...updatedContact } : c,
        ),
      );
      setIsEditContactModalOpen(false);
      setEditingContact(null);
      Alert.alert('Success', 'Contact updated successfully');
    } catch (error) {
      console.error('Failed to update contact:', error);
      Alert.alert('Error', 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (contact: EmergencyContact) => {
    if (!token) {
      Alert.alert('Error', 'Please sign in again');
      return;
    }

    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const contactId = contact.id || contact._id || '';
              await deleteEmergencyContact(token, contactId);
              setContacts((prev) =>
                prev.filter((c) => (c.id || c._id) !== contactId),
              );
              Alert.alert('Success', 'Contact deleted successfully');
            } catch (error) {
              console.error('Failed to delete contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ],
    );
  };

  const openEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setIsEditContactModalOpen(true);
  };

  const handleSosTrigger = async () => {
    if (!token) {
      Alert.alert('Error', 'Please sign in again');
      return;
    }

    try {
      setSosTriggering(true);
      
      console.log('[Whisper] Triggering SOS...');
      const response = await triggerEmergencyWebhook(token, 'sos');
      console.log('[Whisper] SOS response:', response);
      
      // Count notified contacts
      const contactsNotified = response.contact_info 
        ? [response.contact_info.primary, response.contact_info.secondary].filter(Boolean).length
        : 0;
      
      // Format timestamp
      const timestamp = response.emergency_details?.timestamp 
        ? new Date(response.emergency_details.timestamp).toLocaleTimeString()
        : new Date().toLocaleTimeString();
      
      // Build success message
      let successMessage = 'Emergency signal sent successfully!\n\n';
      
      if (response.user_info?.current_location && response.user_info.current_location.trim()) {
        successMessage += `📍 Location: ${response.user_info.current_location}\n`;
      }
      
      if (response.user_info?.address && response.user_info.address.trim()) {
        successMessage += `🏠 Address: ${response.user_info.address}\n`;
      }
      
      if (response.user_info?.hotel && response.user_info.hotel.trim()) {
        successMessage += `🏨 Hotel: ${response.user_info.hotel}\n`;
      }
      
      if (contactsNotified > 0) {
        successMessage += `\n👥 ${contactsNotified} contact(s) notified:\n`;
        if (response.contact_info?.primary) {
          successMessage += `  • ${response.contact_info.primary.name} (${response.contact_info.primary.relationship})\n`;
        }
        if (response.contact_info?.secondary) {
          successMessage += `  • ${response.contact_info.secondary.name} (${response.contact_info.secondary.relationship})\n`;
        }
      }
      
      successMessage += `\n⏰ ${timestamp}`;
      
      Alert.alert(
        '🚨 SOS Activated',
        successMessage,
        [
          {
            text: 'Cancel SOS',
            style: 'destructive',
            onPress: () => {
              Alert.alert('SOS Cancelled', 'Emergency signal has been cancelled.');
            },
          },
          { text: 'OK', style: 'default' },
        ],
      );
    } catch (error) {
      console.error('[Whisper] SOS trigger failed:', error);
      Alert.alert(
        'SOS Failed',
        error instanceof Error 
          ? error.message 
          : 'Failed to send emergency signal. Please try again.',
      );
    } finally {
      setSosTriggering(false);
    }
  };

  const confirmSosTrigger = () => {
    Alert.alert(
      '🚨 Activate Emergency SOS?',
      'This will immediately notify your trusted contacts and share your location. Only activate in genuine emergencies.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'ACTIVATE SOS',
          style: 'destructive',
          onPress: handleSosTrigger,
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.profileScreen}>
      <ScrollView
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: dropdownTranslateY }] }}>

          <View style={styles.profileWhisperMain}>
            <View style={styles.profileSectionHeading}>
              <View>
                <Text style={styles.profileSectionTitle}>Whisper</Text>
                <Text style={styles.profileSectionSubtitle}>
                  Emergency detection & response
                </Text>
              </View>
            </View>

            <View style={styles.profileWhisperForm}>
              {/* ===== Volume Button Trigger ===== */}
              <WhisperSection icon={<VolumeIcon />} title="Volume Button Trigger">
                <View style={localStyles.volumePickerWrapper}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsVolumeTriggerOpen((o) => !o)}
                    style={({ pressed }) => [
                      styles.profilePageToggle,
                      localStyles.volumeTriggerToggle,
                      pressed && styles.pressedFeedback,
                    ]}
                  >
                    <VolumeIcon />
                    <Text style={styles.profilePageToggleText}>
                      {volumeTrigger === 'up' ? 'Volume Up' : volumeTrigger === 'down' ? 'Volume Down' : 'Both Buttons'}
                    </Text>
                    <ChevronDownIcon
                      size={20}
                      style={isVolumeTriggerOpen ? localStyles.chevronIconExpanded : localStyles.chevronIcon}
                    />
                  </Pressable>
                  {isVolumeTriggerOpen && (
                    <View style={localStyles.volumeInlineMenu}>
                      {([
                        { value: 'up', label: 'Volume Up' },
                        { value: 'down', label: 'Volume Down' },
                        { value: 'both', label: 'Both Buttons' },
                      ] as const).map(({ value, label }, index) => (
                        <Pressable
                          key={value}
                          accessibilityRole="menuitem"
                          onPress={() => { setVolumeTrigger(value); setIsVolumeTriggerOpen(false); }}
                          style={({ pressed }) => [
                            localStyles.volumeInlineOption,
                            index > 0 && localStyles.volumeInlineOptionDivider,
                            pressed && styles.pressedFeedback,
                          ]}
                        >
                          <Text style={[
                            localStyles.volumeInlineOptionText,
                            volumeTrigger === value && localStyles.volumeOptionSelected,
                          ]}>
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </WhisperSection>

              <WhisperSection icon={<DiamondIcon height={20} width={20} />} title="Code Word">
                <View style={localStyles.codeWordWrapper}>
                  <View style={localStyles.codeWordCard}>
                    <View>
                      <Text style={localStyles.helperText}>Emergency Code Word</Text>
                      <Text style={localStyles.codeWordText}>{codeWord}</Text>
                    </View>
                    <View style={localStyles.codeWordActions}>
                      <SmallActionButton
                        icon={<EditPenIcon height={13} width={13} />}
                        label="Edit"
                        onPress={() => {
                          setCodeWordInput(codeWord);
                          setCodeWordFormOpen(codeWordFormOpen === 'edit' ? null : 'edit');
                        }}
                      />
                      <SmallActionButton
                        icon={<PlusIconWhite height={13} width={13} />}
                        label="Add"
                        variant="primary"
                        onPress={() => {
                          setCodeWordInput('');
                          setCodeWordFormOpen(codeWordFormOpen === 'add' ? null : 'add');
                        }}
                      />
                    </View>
                  </View>
                </View>
              </WhisperSection>

              <WhisperSection
                icon={<ContactsIcon height={20} width={20} />}
                title="Trusted Contacts"
              >
                <View style={localStyles.contactsCard}>
                  {loading ? (
                    <View style={localStyles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.blue} />
                      <Text style={localStyles.loadingText}>Loading contacts...</Text>
                    </View>
                  ) : contacts.length === 0 ? (
                    <View style={localStyles.emptyContainer}>
                      <Text style={localStyles.emptyText}>No trusted contacts yet</Text>
                      <Text style={localStyles.emptySubtext}>
                        Add contacts who will be notified in emergencies
                      </Text>
                    </View>
                  ) : (
                    contacts.map((contact, index) => (
                      <ContactRow
                        contact={{
                          id: contact.id,
                          _id: contact._id,
                          name: contact.name,
                          phone: contact.phone,
                          relationship: contact.relationship,
                          initials: contact.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase(),
                          priorityLabel: `Priority ${contact.priority || index + 1}`,
                        }}
                        isFirst={index === 0}
                        key={contact.id || contact._id || index}
                        onEdit={() => openEditContact(contact)}
                        onDelete={() => handleDeleteContact(contact)}
                      />
                    ))
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsAddContactModalOpen(true)}
                    style={({ pressed }) => [
                      localStyles.addContactRow,
                      pressed && styles.pressedFeedback,
                    ]}
                  >
                    <View style={localStyles.addContactIcon}>
                      <PlusIconWhite
                        height={13}
                        style={localStyles.addContactPlusIcon}
                        width={13}
                      />
                    </View>
                    <Text style={localStyles.addContactText}>Add Contact</Text>
                  </Pressable>
                </View>
              </WhisperSection>

              {/* ===== Expandable General Settings ===== */}
              <View style={localStyles.expandableCard}>
                <Pressable
                  accessibilityRole="button"
                  onPress={toggleSettingsExpand}
                  style={({ pressed }) => [
                    localStyles.expandableHeader,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <View style={localStyles.expandableHeaderLeft}>
                    <GlobalIcon />
                    <Text style={localStyles.expandableTitle}>General Settings</Text>
                  </View>
                  <View style={localStyles.expandableChevron}>
                    <ChevronDownIcon
                      size={20}
                      style={[
                        localStyles.chevronIcon,
                        settingsExpanded && localStyles.chevronIconExpanded,
                      ]}
                    />
                  </View>
                </Pressable>

                {settingsExpanded && (
                  <View style={localStyles.expandableContent}>
                    {settings.map((item) => (
                      <SettingRow
                        item={item}
                        key={item.title}
                        onPress={() => toggleSetting(item.title)}
                      />
                    ))}
                  </View>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.profilePrimaryButton,
                  localStyles.saveButton,
                  pressed && styles.pressedFeedback,
                ]}
              >
                <Text style={styles.profilePrimaryButtonText}>Save Whisper</Text>
              </Pressable>
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

      <Pressable
        accessibilityLabel="Activate Emergency SOS"
        accessibilityRole="button"
        disabled={sosTriggering}
        onPress={confirmSosTrigger}
        style={({ pressed }) => [
          localStyles.sosHeaderButton,
          pressed && !sosTriggering && localStyles.sosHeaderButtonPressed,
          sosTriggering && localStyles.sosHeaderButtonDisabled,
        ]}
      >
        {sosTriggering ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <SosIconWhite size={18} />
        )}
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
        source="profilePreferences"
      />


      {/* Code Word Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={codeWordFormOpen !== null}
        onRequestClose={() => setCodeWordFormOpen(null)}
      >
        <Pressable style={localStyles.dialogOverlay} onPress={() => setCodeWordFormOpen(null)}>
          <Pressable style={localStyles.dialogCard} onPress={(e) => e.stopPropagation()}>
            <Text style={localStyles.dialogTitle}>
              {codeWordFormOpen === 'edit' ? 'Edit Code Word' : 'Add Code Word'}
            </Text>
            <TextInput
              autoFocus
              placeholder='e.g. "red umbrella"'
              placeholderTextColor="#9CA3AF"
              style={localStyles.codeWordFormInput}
              value={codeWordInput}
              onChangeText={setCodeWordInput}
            />
            <View style={localStyles.codeWordFormActions}>
              <Pressable
                style={({ pressed }) => [localStyles.codeWordFormCancel, pressed && styles.pressedFeedback]}
                onPress={() => setCodeWordFormOpen(null)}
              >
                <Text style={localStyles.codeWordFormCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [localStyles.codeWordFormSave, pressed && styles.pressedFeedback]}
                onPress={() => {
                  if (codeWordInput.trim()) setCodeWord(codeWordInput.trim());
                  setCodeWordFormOpen(null);
                }}
              >
                <Text style={localStyles.codeWordFormSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Contact Modal */}
      <ContactFormModal
        visible={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        onSubmit={handleAddContact}
        saving={saving}
        title="Add Trusted Contact"
      />

      {/* Edit Contact Modal */}
      <ContactFormModal
        visible={isEditContactModalOpen}
        onClose={() => {
          setIsEditContactModalOpen(false);
          setEditingContact(null);
        }}
        onSubmit={handleEditContact}
        saving={saving}
        title="Edit Trusted Contact"
        initialData={
          editingContact
            ? {
                name: editingContact.name,
                phone: editingContact.phone,
                relationship: editingContact.relationship || '',
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------
// Contact Form Modal Component
// ---------------------------------------------------------------------
function ContactFormModal({
  visible,
  onClose,
  onSubmit,
  saving,
  title,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
  saving: boolean;
  title: string;
  initialData?: ContactFormData;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [relationship, setRelationship] = useState(initialData?.relationship || '');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPhone(initialData.phone || '');
      setRelationship(initialData.relationship || '');
    } else {
      setName('');
      setPhone('');
      setRelationship('');
    }
  }, [initialData, visible]);

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={localStyles.dialogOverlay} onPress={onClose}>
        <Pressable style={localStyles.dialogCard} onPress={(e) => e.stopPropagation()}>
          <View style={localStyles.modalHeader}>
            <Text style={localStyles.dialogTitle}>{title}</Text>
            <Pressable onPress={onClose} style={localStyles.modalCloseButton}>
              <CloseIcon />
            </Pressable>
          </View>

          <ScrollView style={localStyles.modalBody}>
            <View style={localStyles.formField}>
              <Text style={localStyles.formLabel}>Name *</Text>
              <TextInput
                style={localStyles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor="#9CA3AF"
                editable={!saving}
              />
            </View>

            <View style={localStyles.formField}>
              <Text style={localStyles.formLabel}>Phone Number *</Text>
              <TextInput
                style={localStyles.formInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 8900"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>

            <View style={localStyles.formField}>
              <Text style={localStyles.formLabel}>Relationship</Text>
              <TextInput
                style={localStyles.formInput}
                value={relationship}
                onChangeText={setRelationship}
                placeholder="e.g., Spouse, Parent, Friend"
                placeholderTextColor="#9CA3AF"
                editable={!saving}
              />
            </View>
          </ScrollView>

          <View style={localStyles.modalFooter}>
            <Pressable
              style={[localStyles.modalButton, localStyles.modalButtonSecondary]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={localStyles.modalButtonTextSecondary}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                localStyles.modalButton,
                localStyles.modalButtonPrimary,
                saving && localStyles.modalButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={localStyles.modalButtonTextPrimary}>
                  {initialData ? 'Update' : 'Add'} Contact
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------
function WhisperSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <View style={localStyles.section}>
      <View style={localStyles.sectionHeading}>
        {icon}
        <Text style={localStyles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function SmallActionButton({
  icon,
  label,
  onPress,
  variant = 'secondary',
}: {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.smallButton,
        isPrimary ? localStyles.smallButtonPrimary : localStyles.smallButtonSecondary,
        pressed && styles.pressedFeedback,
      ]}
    >
      {icon}
      <Text
        style={[
          localStyles.smallButtonText,
          isPrimary ? localStyles.smallButtonTextPrimary : localStyles.smallButtonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ContactRow({
  contact,
  isFirst,
  onEdit,
  onDelete,
}: {
  contact: DisplayContact;
  isFirst: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={localStyles.contactRow}>
      <View style={localStyles.contactInfo}>
        <View style={localStyles.avatar}>
          {isFirst ? (
            <Image
              accessibilityIgnoresInvertColors
              source={companionAvatarImage}
              style={localStyles.avatarImage}
            />
          ) : (
            <Text style={localStyles.avatarText}>{contact.initials || '??'}</Text>
          )}
        </View>
        <View>
          <Text style={localStyles.helperText}>{contact.priorityLabel || 'Priority'}</Text>
          <Text style={localStyles.contactName}>{contact.name}</Text>
        </View>
      </View>
      <Pressable
        accessibilityLabel={`More options for ${contact.name}`}
        accessibilityRole="button"
        onPress={() => {
          Alert.alert(
            contact.name,
            'What would you like to do?',
            [
              { text: 'Edit', onPress: onEdit },
              { text: 'Delete', style: 'destructive', onPress: onDelete },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
        }}
        style={({ pressed }) => [localStyles.contactEditButton, pressed && styles.pressedFeedback]}
      >
        <MoreIcon height={20} width={20} />
      </Pressable>
      <View style={localStyles.contactBottomDivider} />
    </View>
  );
}

function SettingRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: item.enabled }}
      onPress={onPress}
      style={({ pressed }) => [localStyles.settingRow, pressed && styles.pressedFeedback]}
    >
      <View style={localStyles.settingCopy}>
        <Text style={localStyles.settingTitle}>{item.title}</Text>
        <Text style={localStyles.settingDescription}>{item.description}</Text>
      </View>
      <View
        style={[
          localStyles.switchTrack,
          item.enabled ? localStyles.switchTrackEnabled : localStyles.switchTrackDisabled,
        ]}
      >
        <View
          style={[
            localStyles.switchKnob,
            item.enabled ? localStyles.switchKnobEnabled : localStyles.switchKnobDisabled,
          ]}
        />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------
function ArrowLeftIcon() {
  return <RightArrowIcon color="#FFFFFF" height={18} style={styles.profileBackIcon} width={18} />;
}

function VolumeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5L6 9H2v6h4l5 4V5Z" stroke={colors.blue} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke={colors.blue} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke={colors.blue} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}


function ChevronDownIcon({ size, style }: { size: number; style?: any }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size} fill="none" style={style}>
      <Path d="m7 10 5 5 5-5" stroke={colors.ink} strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20} fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke="#000" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function GlobalIcon() {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20} fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.blue} strokeWidth={1.8} />
      <Path
        d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21"
        stroke={colors.blue}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
      <Path
        d="M12 3c-2.2 2.5-3.3 5.5-3.3 9S9.8 18.5 12 21"
        stroke={colors.blue}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function SosIconWhite({ size = 20 }: { size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size} fill="none">
      <Path
        d="M12 2L4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth={1.5}
      />
      <Path
        d="M12 8v4M12 16h.01"
        stroke="#DC2626"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}


// ---------------------------------------------------------------------
// Local styles
// ---------------------------------------------------------------------
const localStyles = StyleSheet.create({
  // ===== Header with SOS button =====
  whisperHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sosHeaderButton: {
    position: 'absolute',
    top: 61,
    right: 30,
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  sosHeaderButtonPressed: {
    backgroundColor: '#B91C1C',
    transform: [{ scale: 0.95 }],
  },
  sosHeaderButtonDisabled: {
    backgroundColor: '#991B1B',
    opacity: 0.7,
  },
  
  // Contact styles
  addContactIcon: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  addContactPlusIcon: {
    transform: [{ translateX: 3 }],
  },
  addContactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 12,
  },
  addContactText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginLeft: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 32,
  },
  avatarImage: {
    height: 32,
    width: 32,
  },
  avatarText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  codeWordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  codeWordCard: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    width: '100%',
  },
  codeWordText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginTop: 2,
  },
  contactBottomDivider: {
    backgroundColor: '#E5E7EB',
    bottom: 0,
    height: 1,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  contactEditButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  contactInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  contactName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginTop: 2,
  },
  contactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    position: 'relative',
  },
  contactsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  helperText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    opacity: 0.6,
  },
  saveButton: {
    marginBottom: 8,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
    width: '100%',
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 22,
    marginBottom: 8,
    width: '100%',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  settingCopy: {
    flex: 1,
    paddingRight: 12,
  },
  settingDescription: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 2,
    opacity: 0.6,
  },
  settingRow: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 68,
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    width: '100%',
  },
  settingTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  settingsList: {
    width: '100%',
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    height: 24,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: 6,
  },
  smallButtonPrimary: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  smallButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  smallButtonText: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    marginLeft: 4,
  },
  smallButtonTextPrimary: {
    color: '#FFFFFF',
  },
  smallButtonTextSecondary: {
    color: colors.blue,
  },
  switchKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 14,
    position: 'absolute',
    top: 2,
    width: 14,
  },
  switchKnobDisabled: {
    left: 2,
  },
  switchKnobEnabled: {
    right: 4,
  },
  switchTrack: {
    borderRadius: 10,
    height: 18,
    width: 36,
  },
  switchTrackDisabled: {
    backgroundColor: '#D1D5DC',
  },
  switchTrackEnabled: {
    backgroundColor: colors.blue,
  },
  expandableCard: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
    width: '100%',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandableTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  expandableChevron: {
    padding: 4,
  },
  chevronIcon: {
    transform: [{ rotate: '0deg' }],
  },
  chevronIconExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  expandableContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    color: colors.ink,
    fontSize: 14,
    marginTop: 12,
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: colors.ink,
    fontSize: 13,
    marginTop: 4,
    opacity: 0.6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  modalCloseButton: {
    padding: 2,
  },
  modalBody: {
    padding: 14,
  },
  formField: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.blue,
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '500',
  },
  volumeTriggerToggle: {
    alignSelf: 'flex-end',
  },

  // ===== Shared dialog overlay & card =====
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 10,
  },

  // ===== Code Word inline form =====
  codeWordWrapper: {
    position: 'relative',
    zIndex: 5,
  },
  codeWordInlineForm: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  codeWordFormLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 8,
  },
  codeWordFormInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 8,
  },
  codeWordFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  codeWordFormCancel: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  codeWordFormCancelText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink,
  },
  codeWordFormSave: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.blue,
  },
  codeWordFormSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  volumePickerCard: {
    height: 125,
    width: 180,
  },
  volumeOptionSelected: {
    color: colors.blue,
    fontWeight: '600',
  },
  volumePickerWrapper: {
    alignItems: 'flex-end',
    position: 'relative',
    zIndex: 10,
  },
  volumeInlineMenu: {
    position: 'absolute',
    top: '100%',
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  volumeInlineOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  volumeInlineOptionDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  volumeInlineOptionText: {
    fontSize: 14,
    color: colors.ink,
  },
  volumeDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  volumeDropdownValue: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: '400',
  },
  volumeDropdownMenu: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  volumeDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  volumeDropdownOptionDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  volumeDropdownOptionSelected: {
    backgroundColor: '#F0F4FF',
  },
  volumeDropdownOptionText: {
    fontSize: 14,
    color: colors.ink,
  },
  volumeDropdownOptionTextSelected: {
    color: colors.blue,
    fontWeight: '500',
  },
});