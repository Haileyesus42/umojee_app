import { createAppSelector } from '../../store';

export const announcementsPageSelector = createAppSelector(
    [
        (state) => state.announcements.announcementsList ?? [],
        (state) => state.announcements.isFetchingAnnouncements,
    ],
    (announcementsList, isFetchingAnnouncements) => ({
        announcementsList,
        isFetchingAnnouncements
    }),
);
