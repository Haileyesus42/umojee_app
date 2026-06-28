import { ScrollView, Text, View } from 'react-native';

import { Panel } from '../../../components/ui/Panel';
import { nearbyPlaces } from '../../../data/homeData';
import { styles } from '../../../theme/styles';

export function PlacesNearby() {
  return (
    <Panel>
      <Text style={styles.panelTitle}>Places Nearby</Text>
      <Text style={styles.panelSubtitle}>
        Discover attractions, dining, and experiences around you
      </Text>
      <ScrollView
        horizontal
        contentContainerStyle={styles.nearbyList}
        showsHorizontalScrollIndicator={false}
      >
        {nearbyPlaces.map((place) => (
          <View key={place.name} style={styles.nearbyCard}>
            <Text style={styles.nearbyName}>{place.name}</Text>
            <Text style={styles.rating}>★ {place.rating}</Text>
            <View
              style={[
                styles.typePill,
                { borderColor: `${place.color}40`, backgroundColor: `${place.color}14` },
              ]}
            >
              <Text style={[styles.typeText, { color: place.color }]}>{place.type}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </Panel>
  );
}
