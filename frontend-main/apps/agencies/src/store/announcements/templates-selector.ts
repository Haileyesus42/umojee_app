import { createAppSelector } from '../../store';

export const templatesPageSelector = createAppSelector(
    [
        (state) => state.announcementTemplates.templatesList ?? [],
        (state) => state.announcementTemplates.isFetchingTemplates,
    ],
    (templatesList, isFetchingTemplates) => ({
        templatesList,
        isFetchingTemplates
    }),
);
