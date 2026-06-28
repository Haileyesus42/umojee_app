import { NativeModule, requireNativeModule } from 'expo';

declare class VolumeSOSServiceModule extends NativeModule {
  startService(): void;
  stopService(): void;
  resetCooldown(): void;
  registerSOSListener(): void;
  unregisterSOSListener(): void;
  addListener(eventName: 'onSOSTriggered', listener: (event: { triggered: boolean }) => void): any;
  removeAllListeners(eventName: string): void;
}

export default requireNativeModule<VolumeSOSServiceModule>('VolumeSOSService');
