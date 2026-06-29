import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

const introVisual = require('../../../assets/gif/Umojee_Intro_Visual.mp4');

type WelcomeScreenProps = {
  canFinish: boolean;
  onFinish: () => void;
};

export function WelcomeScreen({ canFinish, onFinish }: WelcomeScreenProps) {
  const canFinishRef = useRef(canFinish);
  const onFinishRef = useRef(onFinish);
  canFinishRef.current = canFinish;
  onFinishRef.current = onFinish;

  const player = useVideoPlayer(introVisual, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (canFinishRef.current) {
        onFinishRef.current();
        return;
      }

      player.currentTime = 0;
      player.play();
    });

    return () => {
      subscription.remove();
      try { player.pause(); } catch { /* already released */ }
    };
  }, [player]);

  return (
    <View style={styles.screen}>
      <VideoView
        accessibilityLabel="Umojee intro video"
        contentFit="cover"
        nativeControls={false}
        player={player}
        style={styles.video}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    flex: 1,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});



