import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAgents } from './agents-extra';
import { agentsInitialState } from '../initialStates';

const agentsSlice = createSlice({
  name: 'agents',
  initialState: agentsInitialState,
  reducers: {
    updateIsFetchingAgents: (state, { payload }: PayloadAction<boolean>) => {
      state.isFetchingAgents = payload;
    },
    removeFromAgents(state, action) {
      const index = state.agentsList.findIndex(
        (agents) => agents.id === action.payload,
      );

      state.agentsList.splice(index, 1);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(getAgents.fulfilled, (state, { payload }) => {
        state.agentsList = payload;
        state.isFetchingAgents = false;
      })
      .addCase(getAgents.rejected, (state) => {
        state.isFetchingAgents = false;
      });
  },
});

export const { removeFromAgents, updateIsFetchingAgents } = agentsSlice.actions;
export default agentsSlice.reducer;
