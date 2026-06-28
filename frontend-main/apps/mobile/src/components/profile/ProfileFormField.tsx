import { ScrollView, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';

import { styles } from '../../theme/styles';
import type { CountryOption } from '../../utils/countries';
import type { ProfileSelectOption } from '../../utils/profileForm';

export type ProfileFormFieldConfig = {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
  calendar?: boolean;
  countryDropdown?: boolean;
  dropdown?: boolean;
  dropdownOptions?: ProfileSelectOption[];
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numbers-and-punctuation';
  multiline?: boolean;
  placeholder?: string;
};

type ProfileFormFieldProps = {
  countryOptions?: CountryOption[];
  dropdownActive?: boolean;
  dropdownSearchQuery?: string;
  field: ProfileFormFieldConfig;
  inputStyle?: StyleProp<ViewStyle>;   // ← NEW: allow overriding input container style
  onSearchCountries?: (value: string) => void;
  onSelectCountry?: (country: CountryOption) => void;
  onSelectOption?: (value: string) => void;
  onToggleDropdown?: () => void;
  trailing?: React.ReactNode;
};

export function ProfileFormField({
  countryOptions,
  dropdownActive = false,
  dropdownSearchQuery = '',
  field,
  inputStyle,                         // ← NEW: receive prop
  onSearchCountries,
  onSelectCountry,
  onSelectOption,
  onToggleDropdown,
  trailing,
}: ProfileFormFieldProps) {
  const selectedOption = field.dropdownOptions?.find((option) => option.value === field.value);
  const displayValue = selectedOption?.label || field.value || field.placeholder;
  const isEditable = field.editable !== false;

  return (
    <View
      style={[
        styles.profileField,
        field.multiline && styles.profileTextAreaField,
        dropdownActive && { zIndex: 40 },
      ]}
    >
      <Text style={styles.profileFieldLabel}>{field.label}</Text>
      {field.dropdown ? (
        <Pressable
          accessibilityRole="button"
          onPress={onToggleDropdown}
          style={[
            styles.profileInput,
            field.multiline && styles.profileTextArea,
            inputStyle,                 // ← APPLY custom style
          ]}
        >
          <Text
            style={[
              styles.profileInputText,
              !field.value && styles.profilePlaceholderText,
              field.multiline && styles.profileTextAreaText,
            ]}
          >
            {displayValue}
          </Text>
          <ChevronDownIcon size={24} />
        </Pressable>
      ) : (
        <View
          style={[
            styles.profileInput,
            field.multiline && styles.profileTextArea,
            inputStyle,                 // ← APPLY custom style
          ]}
        >
          <TextInput
            editable={isEditable}
            keyboardType={field.keyboardType || 'default'}
            multiline={field.multiline}
            onChangeText={field.onChangeText}
            placeholder={field.placeholder}
            placeholderTextColor="rgba(0, 0, 0, 0.35)"
            style={[styles.profileInputText, field.multiline && styles.profileTextAreaText]}
            value={field.value}
          />
          {trailing || (field.calendar ? <CalendarDateIcon /> : null)}
        </View>
      )}

      {dropdownActive && field.countryDropdown && countryOptions ? (
        <CountryDropdown
          countryOptions={countryOptions}
          dropdownSearchQuery={dropdownSearchQuery}
          onSearchCountries={onSearchCountries}
          onSelectCountry={onSelectCountry}
        />
      ) : null}

      {dropdownActive && field.dropdownOptions ? (
        <View style={styles.profileSelectDropdownCard}>
          {field.dropdownOptions.map((option, index) => (
            <Pressable
              accessibilityRole="button"
              key={option.value}
              onPress={() => onSelectOption?.(option.value)}
              style={({ pressed }) => [
                styles.profileCountryDropdownItem,
                index > 0 && styles.profileCountryDropdownItemDivider,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text numberOfLines={1} style={styles.profileCountryDropdownText}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function CountryDropdown({
  countryOptions,
  dropdownSearchQuery,
  onSearchCountries,
  onSelectCountry,
}: {
  countryOptions: CountryOption[];
  dropdownSearchQuery: string;
  onSearchCountries?: (value: string) => void;
  onSelectCountry?: (country: CountryOption) => void;
}) {
  return (
    <View style={styles.profileCountryDropdownCard}>
      <View style={styles.profileCountrySearchShell}>
        <TextInput
          autoCapitalize="words"
          onChangeText={onSearchCountries}
          placeholder="Search countries"
          placeholderTextColor="#6A7282"
          style={styles.profileCountrySearchInput}
          value={dropdownSearchQuery}
        />
      </View>
      {countryOptions.length > 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {countryOptions.map((countryOption, index) => (
            <Pressable
              accessibilityRole="button"
              key={countryOption.code}
              onPress={() => onSelectCountry?.(countryOption)}
              style={({ pressed }) => [
                styles.profileCountryDropdownItem,
                index > 0 && styles.profileCountryDropdownItemDivider,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text numberOfLines={1} style={styles.profileCountryDropdownText}>
                {countryOption.name}
              </Text>
              <Text style={styles.profileCountryDropdownCode}>{countryOption.code}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.profileCountryDropdownItem}>
          <Text style={styles.profileCountryDropdownText}>No countries found</Text>
        </View>
      )}
    </View>
  );
}

function ChevronDownIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m7 10 5 5 5-5" stroke="#0A0A0A" strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function CalendarDateIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 1V3H15V1H17V3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9ZM20 11H4V19H20V11ZM8 13V15H6V13H8ZM13 13V15H11V13H13ZM18 13V15H16V13H18ZM7 5H4V9H20V5H17V7H15V5H9V7H7V5Z"
        fill="#0A0A0A"
      />
    </Svg>
  );
}