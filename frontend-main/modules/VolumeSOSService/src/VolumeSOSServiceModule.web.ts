import { registerWebModule, NativeModule } from 'expo';

import { VolumeSOSServiceModuleEvents } from './VolumeSOSService.types';

class VolumeSOSServiceModule extends NativeModule<VolumeSOSServiceModuleEvents> {
  hello() {
    return 'Hello world! 👋';
  }

  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
}

export default registerWebModule(VolumeSOSServiceModule, 'VolumeSOSServiceModule');
