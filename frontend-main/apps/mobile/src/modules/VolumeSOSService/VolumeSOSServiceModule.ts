import { NativeModule, requireNativeModule } from 'expo';

declare class VolumeSOSServiceModule extends NativeModule {
  startService(): void;
  stopService(): void;
  resetCooldown(): void;
  registerSOSListener(): void;
  unregisterSOSListener(): void;
  saveToken(token: string): void;
  setVolumeTriggerButton(button: 'up' | 'down' | 'both'): void;
  addListener(eventName: 'onSOSTriggered', listener: (event: { triggered: boolean }) => void): any;
  removeAllListeners(eventName: string): void;
}

const noop = () => {};
const stub: VolumeSOSServiceModule = {
  startService: noop,
  stopService: noop,
  resetCooldown: noop,
  registerSOSListener: noop,
  unregisterSOSListener: noop,
  saveToken: noop,
  setVolumeTriggerButton: noop,
  addListener: () => ({ remove: noop }),
  removeAllListeners: noop,
} as unknown as VolumeSOSServiceModule;

let module: VolumeSOSServiceModule;
try {
  module = requireNativeModule<VolumeSOSServiceModule>('VolumeSOSService');
  if (typeof module.setVolumeTriggerButton !== 'function') {
    module.setVolumeTriggerButton = noop;
  }
} catch {
  console.warn('[VolumeSOSService] Native module not available — running in stub mode');
  module = stub;
}

export default module;
