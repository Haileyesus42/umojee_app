import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { RadientCircleIcon } from '../../../assets/icons';
import { categoryFilters } from '../../../data/homeData';
import { styles } from '../../../theme/styles';
import type { MobileJourneyFilter, MobileJourneyFilterKey } from '../../../api/notifications';

type CategoryScrollerProps = {
  enabledFilterKeys?: MobileJourneyFilterKey[];
  filters?: MobileJourneyFilter[];
  onFilterPress?: (filterKey: MobileJourneyFilterKey) => void;
  selectedFilterKey?: MobileJourneyFilterKey;
  viewportStyle?: StyleProp<ViewStyle>;
};

const labelToFilterKey: Record<string, MobileJourneyFilterKey> = {
  'Air\nTaxi': 'air_taxi',
  All: 'all',
  'Car\nRental': 'car_rental',
  Flights: 'flights',
  Metro: 'metro',
  'Private\nTransport': 'private_transport',
  'Public\nTransport': 'public_transport',
  'Ride\nShare': 'ride_share',
  Stays: 'stays',
  'Urban\nTransport': 'urban_transport',
  'Water\nTransport': 'water_transport',
};

export function CategoryScroller({
  enabledFilterKeys,
  onFilterPress,
  selectedFilterKey = 'all',
  viewportStyle,
}: CategoryScrollerProps) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.categoryList}
      showsHorizontalScrollIndicator={false}
      style={[styles.categoryViewport, viewportStyle]}
    >
      {categoryFilters.map((filter) => {
        const Icon = filter.icon;
        const ExtraIcon = filter.extraIcon;
        const filterKey = labelToFilterKey[filter.label] || 'all';
        const isDisabled = enabledFilterKeys ? !enabledFilterKeys.includes(filterKey) : false;
        const isSelected = filterKey === selectedFilterKey;
        const iconColor = isDisabled ? '#9CA3AF' : isSelected ? '#FFFFFF' : '#002AFF';

        return !Icon ? (
          <Pressable
            accessibilityRole="button"
            disabled={isDisabled}
            key={filter.label}
            onPress={() => onFilterPress?.(filterKey)}
            style={({ pressed }) => [
              styles.categoryActive,
              isDisabled && styles.categoryFilterDisabled,
              pressed && styles.pressedFeedback,
            ]}
          >
            <Text style={styles.categoryTextActive}>{filter.label}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={isDisabled}
            key={filter.label}
            onPress={() => onFilterPress?.(filterKey)}
            style={({ pressed }) => [
              styles.categoryIconFilter,
              { width: filter.width },
              isDisabled && styles.categoryFilterDisabled,
              pressed && styles.pressedFeedback,
            ]}
          >
            <View
              style={[
                styles.categoryIconCircle,
                isSelected && styles.categoryIconCircleSelected,
                { left: filter.circleLeft ?? 0 },
              ]}
            >
              {!isSelected ? <RadientCircleIcon style={styles.categoryCircleImage} /> : null}
            </View>
            <Icon color={iconColor} style={[styles.categoryFilterIcon, filter.iconStyle]} />
            {ExtraIcon && (
              <ExtraIcon
                color={iconColor}
                style={[styles.categoryFilterIcon, filter.extraIconStyle]}
              />
            )}
            <Text
              style={[
                styles.categoryText,
                { left: filter.labelLeft ?? 0, width: filter.labelWidth },
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
