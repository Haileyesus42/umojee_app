import { createAppSelector } from '..';

export const userSelector = createAppSelector(
  [(state) => state.setting.user],
  (user) => user,
);
