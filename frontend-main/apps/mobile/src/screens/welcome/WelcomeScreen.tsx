import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

const introVisual = require('../../../assets/gif/Umojee_Intro_Visual.mp4');

type WelcomeScreenProps = {
  canFinish: boolean;
  onFinish: () => void;
};

export function WelcomeScreen({ canFinish, onFinish }: WelcomeScreenProps) {
  const player = useVideoPlayer(introVisual, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (canFinish) {
        onFinish();
        return;
      }

      player.currentTime = 0;
      player.play();
    });

    return () => {
      subscription.remove();
    };
  }, [canFinish, onFinish, player]);

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



