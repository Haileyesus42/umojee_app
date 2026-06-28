import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import VolumeSOSServiceModule from '../modules/VolumeSOSService/VolumeSOSServiceModule';

export function useVolumeSOSTrigger(onSOSTriggered: () => void) {
  const isListening = useRef(false);
  const eventSubRef = useRef<any>(null);
  const onSOSTriggeredRef = useRef(onSOSTriggered);

  // Keep callback ref current without re-running effects
  useEffect(() => {
    onSOSTriggeredRef.current = onSOSTriggered;
  }, [onSOSTriggered]);

  const stopListening = useCallback(() => {
    try {
      eventSubRef.current?.remove();
      eventSubRef.current = null;
      VolumeSOSServiceModule.unregisterSOSListener();
      VolumeSOSServiceModule.stopService();
    } catch (e) {}
    isListening.current = false;
  }, []);

  const startListening = useCallback(() => {
    if (isListening.current) return;
    try {
      VolumeSOSServiceModule.startService();
      VolumeSOSServiceModule.registerSOSListener();
      eventSubRef.current = VolumeSOSServiceModule.addListener(
        'onSOSTriggered',
        () => { onSOSTriggeredRef.current(); }
      );
      isListening.current = true;
      console.log('[VolumeSOSTrigger] ✅ Listening for volume presses');
    } catch (e) {
      console.warn('[VolumeSOSTrigger] Native module not available:', e);
    }
  }, []);

  useEffect(() => {
    startListening();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        startListening();
      }
    });

    return () => {
      subscription.remove();
      stopListening();
    };
  }, [startListening, stopListening]);
}
