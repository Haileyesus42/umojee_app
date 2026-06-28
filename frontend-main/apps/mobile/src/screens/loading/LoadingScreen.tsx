import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import LoaderIcon from '../../../assets/icons/loader.svg';

const hummingbirdImage = require('../../../assets/images/loading-page-hummingbird-favicon.png');

const BIRD_HEIGHT = 111;
const BIRD_WIDTH = 74;
const LOADER_SIZE = 32;
const EDGE_PAUSE_DURATION_MS = 650;
const CENTER_LOADING_DURATION_MS = 5000;
const ENTER_DURATION_MS = 1700;
const EXIT_DURATION_MS = 1500;

type LoadingScreenProps = {
  onFinish: () => void;
};

export function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const { width } = useWindowDimensions();
  const birdX = useRef(new Animated.Value(-120)).current;
  const birdOpacity = useRef(new Animated.Value(1)).current;
  const birdScale = useRef(new Animated.Value(0.92)).current;
  const loaderScale = useRef(new Animated.Value(0.86)).current;
  const loaderOpacity = useRef(new Animated.Value(0.4)).current;
  const loaderSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const leftPeekX = -BIRD_WIDTH / 2;
    const loaderCenterX = width / 2;
    const centerX = loaderCenterX - BIRD_WIDTH / 2;
    const rightPeekX = width - BIRD_WIDTH / 2;
    const exitX = width + 80;

    const spinner = Animated.loop(
      Animated.timing(loaderSpin, {
        duration: 900,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    spinner.start();

    Animated.sequence([
      Animated.timing(birdX, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: leftPeekX,
        useNativeDriver: true,
      }),
      Animated.delay(EDGE_PAUSE_DURATION_MS),
      Animated.parallel([
        Animated.timing(birdX, {
          duration: ENTER_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          toValue: centerX,
          useNativeDriver: true,
        }),
        Animated.spring(birdScale, {
          friction: 7,
          tension: 80,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(loaderOpacity, {
          duration: 450,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(loaderScale, {
          friction: 7,
          tension: 90,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(CENTER_LOADING_DURATION_MS),
      Animated.timing(birdX, {
        duration: EXIT_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
        toValue: rightPeekX,
        useNativeDriver: true,
      }),
      Animated.delay(EDGE_PAUSE_DURATION_MS),
      Animated.parallel([
        Animated.timing(birdX, {
          duration: 620,
          easing: Easing.in(Easing.cubic),
          toValue: exitX,
          useNativeDriver: true,
        }),
        Animated.timing(birdOpacity, {
          duration: 520,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(loaderOpacity, {
          duration: 360,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(loaderScale, {
          duration: 360,
          toValue: 0.72,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      spinner.stop();

      if (finished) {
        onFinish();
      }
    });

    return () => {
      spinner.stop();
      birdX.stopAnimation();
      birdOpacity.stopAnimation();
      birdScale.stopAnimation();
      loaderScale.stopAnimation();
      loaderOpacity.stopAnimation();
      loaderSpin.stopAnimation();
    };
  }, [birdOpacity, birdScale, birdX, loaderOpacity, loaderScale, loaderSpin, onFinish, width]);

  const loaderRotation = loaderSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.screen}>
      <Animated.View
        accessibilityLabel="Loading in progress"
        style={[
          styles.loader,
          {
            opacity: loaderOpacity,
            transform: [{ scale: loaderScale }, { rotate: loaderRotation }],
          },
        ]}
      >
        <LoaderIcon height={LOADER_SIZE} width={LOADER_SIZE} />
      </Animated.View>
      <Animated.Image
        accessibilityLabel="Loading hummingbird"
        resizeMode="contain"
        source={hummingbirdImage}
        style={[
          styles.hummingbird,
          {
            opacity: birdOpacity,
            transform: [{ translateX: birdX }, { scale: birdScale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loader: {
    height: LOADER_SIZE,
    left: '50%',
    marginLeft: -LOADER_SIZE / 2,
    marginTop: -LOADER_SIZE / 2,
    position: 'absolute',
    top: '50%',
    width: LOADER_SIZE,
  },
  hummingbird: {
    height: BIRD_HEIGHT,
    left: 0,
    marginTop: -BIRD_HEIGHT / 2,
    position: 'absolute',
    top: '50%',
    width: BIRD_WIDTH,
  },
});
