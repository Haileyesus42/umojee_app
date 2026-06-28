import { View as mockVideoView } from 'react-native';

const mockVideoListeners = new Map<string, () => void>();

(
  globalThis as unknown as {
    __expoVideoListeners: Map<string, () => void>;
  }
).__expoVideoListeners = mockVideoListeners;

jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({
    addListener: jest.fn((eventName: string, listener: () => void) => {
      mockVideoListeners.set(eventName, listener);

      return {
        remove: jest.fn(() => mockVideoListeners.delete(eventName)),
      };
    }),
    loop: true,
    muted: true,
    play: jest.fn(),
  })),
  VideoView: mockVideoView,
}));
