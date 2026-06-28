import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { Animated, PanResponder, Text, View } from 'react-native';

import { UnityIcon } from '../../../assets/icons';
import { colors } from '../../../constants/colors';
import { styles } from '../../../theme/styles';

const THUMB_SIZE = 64;
const TRACK_THUMB_OVERLAP = 8;

type UnityPlannerProps = {
  onOpenChat: () => void;
};

export function UnityPlanner({ onOpenChat }: UnityPlannerProps) {
  const maxSlide = useRef(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const dragActive = useRef(new Animated.Value(0)).current;
  const latestX = useRef(0);
  const visibleContentOffset = Animated.multiply(
    Animated.add(slideX, THUMB_SIZE - TRACK_THUMB_OVERLAP),
    dragActive,
  );
  const hiddenContentOffset = Animated.multiply(visibleContentOffset, -1);

  const settleSlider = (toValue: number, onDone?: () => void) => {
    Animated.spring(slideX, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start(() => {
      latestX.current = toValue;
      onDone?.();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const horizontalDistance = Math.abs(gestureState.dx);
        const verticalDistance = Math.abs(gestureState.dy);

        return horizontalDistance > 4 && horizontalDistance > verticalDistance;
      },
      onPanResponderGrant: () => {
        dragActive.setValue(1);
        slideX.stopAnimation((value) => {
          latestX.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const nextX = Math.min(Math.max(latestX.current + gestureState.dx, 0), maxSlide.current);
        slideX.setValue(nextX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const releasedX = Math.min(
          Math.max(latestX.current + gestureState.dx, 0),
          maxSlide.current,
        );

        if (releasedX >= maxSlide.current * 0.82) {
          settleSlider(maxSlide.current, onOpenChat);
          return;
        }

        settleSlider(0, () => {
          dragActive.setValue(0);
        });
      },
      onPanResponderTerminate: () => {
        settleSlider(0, () => {
          dragActive.setValue(0);
        });
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      accessible
      accessibilityLabel="Plan with UNITY"
      accessibilityRole="adjustable"
      onLayout={({ nativeEvent }) => {
        maxSlide.current = Math.max(nativeEvent.layout.width - THUMB_SIZE, 0);
      }}
      style={styles.planner}
    >
      <Animated.View
        style={[
          styles.plannerVisibleContent,
          { transform: [{ translateX: visibleContentOffset }] },
        ]}
      >
        <Animated.View
          style={[styles.plannerContentLayer, { transform: [{ translateX: hiddenContentOffset }] }]}
        >
          <LinearGradient
            colors={[colors.blue, colors.cyan]}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={styles.plannerTrackBorder}
          >
            <View style={styles.plannerTrack} />
          </LinearGradient>
          <Text style={styles.chevrons}>
            <Text style={styles.chevronLow}>{'>'}</Text>
            <Text style={styles.chevronMid}>{'>'}</Text>
            <Text style={styles.chevronHigh}>{'>'}</Text>
            <Text style={styles.chevronActive}>{'>'}</Text>
          </Text>
          <View style={styles.plannerCopy}>
            <Text style={styles.plannerText}>
              <Text style={styles.bold}>Plan with </Text>UNITY
            </Text>
            <LinearGradient
              colors={[colors.blue, colors.cyan]}
              end={{ x: 1, y: 0.5 }}
              locations={[0, 0.95]}
              start={{ x: 0, y: 0.5 }}
              style={styles.plannerLine}
            />
          </View>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.plannerThumb, { transform: [{ translateX: slideX }] }]}>
        <UnityIcon style={styles.plannerAvatar} />
      </Animated.View>
    </View>
  );
}
