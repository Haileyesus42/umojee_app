import { Fragment, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import ChatSmileIcon from '../../../../assets/icons/chat-smile-2-line.svg';
import ChevronDownIcon from '../../../../assets/icons/chevron-down.svg';
import { Panel } from '../../../components/ui/Panel';
import { colors } from '../../../constants/colors';
import { aspirationCards, inspirationCards } from '../../../data/homeData';
import { styles } from '../../../theme/styles';
import { ImageCard } from './ImageCard';

type InspirationTab = 'inspirations' | 'aspirations';

const tabs: { label: string; value: InspirationTab }[] = [
  { label: 'Inspirations', value: 'inspirations' },
  { label: 'Aspirations', value: 'aspirations' },
];

const subtitles: Record<InspirationTab, string> = {
  inspirations: 'Discover attractions, dining, and experiences around you',
  aspirations: 'Save dream destinations and experiences for future journeys',
};

type InspirationsProps = {
  onAskUnity?: () => void;
  onSeeAll?: () => void;
};

export function Inspirations({ onAskUnity, onSeeAll }: InspirationsProps) {
  const [activeTab, setActiveTab] = useState<InspirationTab>('inspirations');
  const cards = activeTab === 'inspirations' ? inspirationCards : aspirationCards;

  return (
    <Panel style={styles.inspirationPanel}>
      <View style={styles.inspirationHeading}>
        <View style={styles.tabs}>
          {tabs.map((tab, index) => (
            <Fragment key={tab.value}>
              <TabHeading
                active={activeTab === tab.value}
                label={tab.label}
                onPress={() => setActiveTab(tab.value)}
              />
              {index < tabs.length - 1 ? <View style={styles.tabDivider} /> : null}
            </Fragment>
          ))}
        </View>
      </View>
      <Text style={[styles.panelSubtitle, styles.inspirationSubtitle]}>{subtitles[activeTab]}</Text>
      <View style={styles.inspirationActions}>
        <Pressable
          accessibilityLabel="Ask Unity"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAskUnity}
          style={({ pressed }) => [
            styles.inspirationActionButton,
            pressed && styles.pressedFeedback,
          ]}
        >
          <Text style={styles.inspirationActionText}>Ask Unity</Text>
          <ChatSmileIcon color={colors.blue} height={12} width={12} />
        </Pressable>
        <View style={styles.inspirationActionDivider} />
        <Pressable
          accessibilityLabel="Discover more inspirations"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSeeAll}
          style={({ pressed }) => [
            styles.inspirationActionButton,
            pressed && styles.pressedFeedback,
          ]}
        >
          <Text style={styles.inspirationActionText}>Discover More</Text>
          <ChevronDownIcon
            color={colors.blue}
            height={12}
            style={styles.inspirationChevronIcon}
            width={12}
          />
        </Pressable>
      </View>
      <View style={styles.inspirationViewport}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.inspirationList}
          showsHorizontalScrollIndicator={false}
          style={styles.inspirationScroll}
        >
          {cards.map((card) => (
            <ImageCard key={card.city} {...card} />
          ))}
        </ScrollView>
      </View>
    </Panel>
  );
}

function TabHeading({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const text = <Text style={[styles.tabText, active && styles.activeTab]}>{label}</Text>;

  if (active) {
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
        onPress={onPress}
        style={({ pressed }) => [styles.tabButton, pressed && styles.pressedFeedback]}
      >
        <LinearGradient
          colors={['#002AFF', '#77F2F6']}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={styles.activeTabBorder}
        >
          {text}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: false }}
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressedFeedback]}
    >
      {text}
    </Pressable>
  );
}
