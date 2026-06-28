import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { RightArrowIcon } from '../../../assets/icons';
import { colors } from '../../../constants/colors';
import { styles as sharedStyles } from '../../../theme/styles';

const journeyImages = [
  require('../../../../assets/icons/journey_screen/Container.jpg'),
  require('../../../../assets/icons/journey_screen/Container1.jpg'),
  require('../../../../assets/icons/journey_screen/Container2.jpg'),
];

const pastTrips = [
  { from: 'Tokyo', to: 'Kyoto', date: 'Mar 8 - 15, 2026' },
  { from: 'Bali', to: 'Singapore', date: 'Jan 20 - 28, 2026' },
  { title: 'Iceland Adventure', date: 'Dec 5 - 12, 2025' },
];

type JourneysSectionProps = {
  style?: StyleProp<ViewStyle>;
};

export function JourneysSection({ style }: JourneysSectionProps) {
  return (
    <View style={[styles.panel, style]}>
      <Text style={styles.panelTitle}>Journeys</Text>
      <Text style={styles.panelSubtitle}>View all your past booked trips in one place</Text>
      <Text style={styles.pastTripsLabel}>Past Trips</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tripList}
        style={styles.tripViewport}
      >
        {pastTrips.map((trip, index) => (
          <Pressable
            accessibilityRole="button"
            key={trip.title ?? `${trip.from}-${trip.to}`}
            style={({ pressed }) => [styles.tripCard, pressed && sharedStyles.pressedFeedback]}
          >
            <ImageBackground
              imageStyle={styles.tripImage}
              resizeMode="cover"
              source={journeyImages[index]}
              style={styles.tripImageBackground}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.82)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
                locations={[0, 0.55, 1]}
                style={styles.tripScrim}
              >
                {'from' in trip ? (
                  <View style={styles.tripTitleRow}>
                    <Text style={styles.tripTitle}>{trip.from}</Text>
                    <RightArrowIcon color="#FFFFFF" height={8} style={styles.tripArrow} width={8} />
                    <Text style={styles.tripTitle}>{trip.to}</Text>
                  </View>
                ) : (
                  <Text style={styles.tripTitle}>{trip.title}</Text>
                )}
                <Text style={styles.tripDate}>{trip.date}</Text>
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'center',
    backgroundColor: colors.panel,
    borderRadius: 24,
    elevation: 3,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    width: '100%',
  },
  panelTitle: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 40,
  },
  panelSubtitle: {
    color: '#6A7282',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginTop: -2,
  },
  pastTripsLabel: {
    color: '#4D4D4D',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 20,
  },
  tripViewport: {
    marginTop: 12,
  },
  tripList: {
    gap: 12,
  },
  tripCard: {
    borderRadius: 14,
    height: 128,
    overflow: 'hidden',
    width: 160,
  },
  tripImageBackground: {
    height: 128,
    width: 160,
  },
  tripImage: {
    borderRadius: 14,
  },
  tripScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  tripTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  tripTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  tripArrow: {
    flexShrink: 0,
  },
  tripDate: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
