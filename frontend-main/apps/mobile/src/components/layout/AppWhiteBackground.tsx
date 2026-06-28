import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type AppWhiteBackgroundProps = {
  children: ReactNode;
};

export function AppWhiteBackground({ children }: AppWhiteBackgroundProps) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
