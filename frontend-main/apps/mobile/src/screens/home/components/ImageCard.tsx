import { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { styles } from '../../../theme/styles';

type ImageCardProps = {
  city: string;
  country: string;
  theme: string;
  image: string;
};

export function ImageCard({ city, country, theme, image }: ImageCardProps) {
  return (
    <ImageBackgroundLike image={image}>
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0)']}
        locations={[0, 0.5, 1]}
        style={styles.imageScrim}
      >
        <View style={styles.imageCountryRow}>
          <LocationPinIcon />
          <Text style={styles.imageCountry}>{country}</Text>
        </View>
        <Text style={styles.imageCity}>{city}</Text>
        <Text style={styles.imageTheme}>{theme}</Text>
      </LinearGradient>
    </ImageBackgroundLike>
  );
}

function ImageBackgroundLike({ image, children }: { image: string; children: ReactNode }) {
  return (
    <View style={styles.imageCard}>
      <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} />
      {children}
    </View>
  );
}

function LocationPinIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M13.3334 6.66683C13.3334 9.9955 9.64069 13.4622 8.40069 14.5328C8.28517 14.6197 8.14455 14.6667 8.00002 14.6667C7.85549 14.6667 7.71487 14.6197 7.59935 14.5328C6.35935 13.4622 2.66669 9.9955 2.66669 6.66683C2.66669 5.25234 3.22859 3.89579 4.22878 2.89559C5.22898 1.8954 6.58553 1.3335 8.00002 1.3335C9.41451 1.3335 10.7711 1.8954 11.7713 2.89559C12.7715 3.89579 13.3334 5.25234 13.3334 6.66683Z"
        stroke="#77F2F6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.33333}
      />
      <Path
        d="M8 8.6665C9.10457 8.6665 10 7.77107 10 6.6665C10 5.56193 9.10457 4.6665 8 4.6665C6.89543 4.6665 6 5.56193 6 6.6665C6 7.77107 6.89543 8.6665 8 8.6665Z"
        stroke="#77F2F6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.33333}
      />
    </Svg>
  );
}
