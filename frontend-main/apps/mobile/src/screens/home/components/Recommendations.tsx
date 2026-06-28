import { Image, Text, View } from 'react-native';

import { Panel } from '../../../components/ui/Panel';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { recommendations } from '../../../data/homeData';
import { styles } from '../../../theme/styles';
import { SeeAll } from './SeeAll';

export function Recommendations() {
  return (
    <Panel>
      <View style={styles.sectionTopRow}>
        <Text style={styles.panelTitle}>Recommendations</Text>
        <SeeAll />
      </View>
      <Text style={styles.panelSubtitle}>Explore ideas and destinations for your next trip</Text>
      <View style={styles.recommendationList}>
        {recommendations.map((item) => (
          <View key={item.title} style={styles.recommendationItem}>
            <Image source={{ uri: item.image }} style={styles.recommendationImage} />
            <View style={styles.recommendationCopy}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
              <Text style={styles.recommendationTitle}>{item.title}</Text>
              <Text style={styles.caption}>{item.meta}</Text>
              <View style={styles.recommendationBottom}>
                <Text style={styles.rating}>★ {item.rating}</Text>
                <Text style={styles.price}>{item.price}</Text>
                <PrimaryButton label="Book" small />
              </View>
            </View>
          </View>
        ))}
      </View>
    </Panel>
  );
}
