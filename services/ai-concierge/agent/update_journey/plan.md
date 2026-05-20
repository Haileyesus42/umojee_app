Plan: Update Journey Agent
Context
The orchestrator (router.py) currently routes journey-related intents to Journey_Workflow (trip planning/inspiration). But there is no dedicated agent for managing an existing journey — updating preferences, lifecycle transitions, viewing journey details, managing saved flights, etc. This plan creates Update_Journey_Workflow to handle those CRUD-style operations, routed from the orchestrator when the user wants to modify or inspect their journey data.

Files to Create
ai/agent/update_journey/__init__.py
Empty init file.

ai/agent/update_journey/update_journey_tools.py
CRUD tools wrapping JourneyStateManager (_state_manager_ref) and mongo_repo. Each tool is a @tool-decorated function following the same pattern as amadeus_save_flights_to_journey.

Tools:

Tool	Operation	Backend
get_journey_details(journey_id)	READ: full journey doc	_state_manager_ref.get_journey()
list_user_journeys(user_id, limit?)	READ: all user journeys	mongo_repo.list_journeys_for_user()
update_journey_preferences(journey_id, **fields)	UPDATE: destination, dates, budget, travelers	_state_manager_ref.update_context()
update_journey_status(journey_id, status)	UPDATE: planning/in_progress/completed/cancelled	_state_manager_ref.update_journey()
transition_journey_segment(journey_id, from_segment, to_segment)	UPDATE: advance journey phase	_state_manager_ref.transition_segment()
manage_saved_flights(journey_id, action, flights?)	UPDATE/DELETE: clear or replace saved flights	_state_manager_ref.update_journey()
set_active_journey(journey_id, user_id)	UPDATE: mark as active	mongo_repo.set_active_journey()
archive_journey(journey_id)	SOFT DELETE	mongo_repo.archive_journey()
cancel_journey(journey_id)	CANCEL	mongo_repo.cancel_journey()
All tools import _state_manager_ref from agent.journey.journey_orchestrator (same pattern as amadeus_save_flights_to_journey).

ai/agent/update_journey/update_journey_node.py
Worker agent using create_agent() from agent.utils.agent_compat. Pattern mirrors conversation_node.py.

update_journey_agent = create_agent(
    model=llm,
    tools=[get_journey_details, list_user_journeys, update_journey_preferences,
           update_journey_status, transition_journey_segment,
           manage_saved_flights, set_active_journey, archive_journey, cancel_journey],
    system_prompt="""You are the Umoja Journey Manager...
    - Always extract journey_id from the conversation context or ask for it if missing
    - Use tools to fulfill CRUD requests precisely; confirm changes back to the user
    - Never fabricate journey data; use get_journey_details to verify current state before updating
    - Return structured JSON responses with status and updated fields
    """
)
update_journey_agent.name = "update_journey_agent"
ai/agent/update_journey/update_journey_workflow.py
Supervisor workflow. Follows conversation_workflow.py exactly (single-worker pattern):

State: UpdateJourneyState with messages, route, forward_from_agent
Supervisor node: update_journey_supervisor_node — LLM decides Update_Journey_Agent or direct
Return node: update_journey_return — forwards or wraps up
Graph: supervisor → (conditional) → Update_Journey_Agent → return → END
Compiled as: graph with name="Update_Journey_Workflow"
Supervisor prompt describes the agent as handling: view journey, update travel dates/destination/budget/travelers, change journey status, manage saved flights, archive/cancel journeys.

File to Modify
ai/agent/router.py
Import the new graph:

from agent.update_journey.update_journey_workflow import graph as update_journey_graph
Extend OrchestratorState type literals:

route: add "Update_Journey_Workflow"
forward_from_agent: add "Update_Journey_Workflow"
Update ORCH_INSTRUCTIONS — add to {members} and add description:

Update_Journey_Workflow: Managing an existing journey (view details, update destination/dates/budget/travelers, transition segments, manage saved flights, archive/cancel). Use when user wants to VIEW or MODIFY their current journey data rather than plan a new trip.

Update SCHEMA_HINT_BASE — add "Update_Journey_Workflow" to the target union type.

Add graph node:

graph_builder.add_node("Update_Journey_Workflow", update_journey_graph)
Add conditional edge mapping:

"Update_Journey_Workflow": "Update_Journey_Workflow",
Add edge to synthesizer:

for worker in ("Umoja_Workflow", ..., "Update_Journey_Workflow"):
    graph_builder.add_edge(worker, "synthesizer")
Critical Reuse
agent.utils.agent_compat.create_agent — for building the worker agent node
agent.journey.journey_orchestrator._state_manager_ref — for state-managed DB ops (same pattern as amadeus_save_flights_to_journey)
server.mongo_repo — for ops not in state manager (list, archive, cancel, set_active)
langchain_core.tools.tool decorator — for all tool definitions
agent.journey.phase_1_foundation.journey_models.JourneySegment — for segment enum validation in transition_journey_segment
Verification
Start the AI server and send a message like: "What's the status of my journey?" — should route to Update_Journey_Workflow
Send: "Update my journey destination to Mombasa" — agent should call update_journey_preferences and confirm
Send: "Archive my journey" — agent should call archive_journey
Check that Journey_Workflow is NOT triggered for these intents (orchestrator routing test)
Confirm state manager cache is updated by calling get_journey_details after an update