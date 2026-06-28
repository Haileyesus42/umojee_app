import { createAppSelector } from '../../store';

export const agentsPageSelector = createAppSelector(
  [
    (state) => state.agents.agentsList ?? [],
    (state) => state.agents.isFetchingAgents,
    (state) => state.setting.user,
    (state) => state.agents.showAddAgentModal,
  ],
  (agentsList, isFetchingAgents, user, showAddAgentModal) => ({
    agentsList,
    isFetchingAgents,
    user,
    showAddAgentModal,
  }),
);
