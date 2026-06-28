import type { RootState } from '..';

export const userSelector = (state: RootState) => state.setting.user;
