import { NativeModule, requireNativeModule } from 'expo';

declare class VolumeSOSServiceModule extends NativeModule {
  startService(): void;
  stopService(): void;
  registerSOSListener(): void;
  unregisterSOSListener(): void;
  addListener(eventName: 'onSOSTriggered', listener: (event: { triggered: boolean }) => void): void;
  removeAllListeners(eventName: string): void;
}

export default requireNativeModule<VolumeSOSServiceModule>('VolumeSOSService');
