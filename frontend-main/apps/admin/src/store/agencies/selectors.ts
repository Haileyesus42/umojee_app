import { createAppSelector } from '../../store';

export const agenciesPageSelector = createAppSelector(
    [
        (state) => state.agencies.agenciesList.slice(),
        (state) => state.agencies.isFetchingAgencies,
        (state) => state.setting.user,
    ],
    (agenciesList, isFetchingAgencies, user) => ({
        agenciesList,
        isFetchingAgencies,
        user
    }),
);
