import asyncio
import logging
import os
from typing import Dict, Optional
import server.mongo_repo as mongo_repo

logger = logging.getLogger("server.main")

class LoopController:
    """
    Manages the lifecycle of background monitoring loops.
    Allows starting and stopping loops dynamically in response to preference changes.
    """
    def __init__(self, state_manager, ws_manager, context_monitor, task_manager):
        self.state_manager = state_manager
        self.ws_manager = ws_manager
        self.context_monitor = context_monitor
        self.task_manager = task_manager
        
        self.tasks: Dict[str, Optional[asyncio.Task]] = {
            "time_trigger": None,
            "preload": None,
            "proactive": None,
            "background_task_manager": None
        }
        self.lock = asyncio.Lock()

    async def sync(self):
        """
        Synchronize loop state with current monitoring preferences.
        Starts loops if any user has monitoring enabled, stops if all are off.
        """
        async with self.lock:
            settings = mongo_repo.get_monitoring_settings()
            any_enabled = any(v != 'off' for v in settings.values())
            
            if any_enabled:
                await self._start_if_not_running()
            else:
                await self._stop_if_running()

    async def _start_if_not_running(self):
        # We use time_trigger as the sentinel for "loops are running"
        if self.tasks["time_trigger"] is not None and not self.tasks["time_trigger"].done():
            return

        logger.info("Starting background monitoring loops (multi-user mode)...")
        
        # Start background task manager
        if self.tasks["background_task_manager"] is None or self.tasks["background_task_manager"].done():
            self.tasks["background_task_manager"] = asyncio.create_task(self.task_manager.start())
        
        from agent.journey.time_triggers import time_trigger_loop
        self.tasks["time_trigger"] = asyncio.create_task(
            time_trigger_loop(self.state_manager, self.ws_manager, interval_seconds=60)
        )
        
        from agent.predictive_transitions import predictive_preload_loop
        self.tasks["preload"] = asyncio.create_task(
            predictive_preload_loop(self.state_manager, self.context_monitor, interval_seconds=120)
        )
        
        from agent.proactive_intelligence import proactive_intelligence_loop
        self.tasks["proactive"] = asyncio.create_task(
            proactive_intelligence_loop(self.state_manager, self.ws_manager, interval_seconds=180)
        )

    async def _stop_if_running(self):
        # If time_trigger is None, we assume loops are already stopped
        if self.tasks["time_trigger"] is None and self.tasks["background_task_manager"] is None:
            return

        logger.info("Shutting down background loops...")
        
        # Cancel loop tasks
        for name in ["time_trigger", "preload", "proactive"]:
            task = self.tasks.get(name)
            if task:
                task.cancel()

        # Wait for cancellation
        for name in ["time_trigger", "preload", "proactive"]:
            task = self.tasks.get(name)
            if task:
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                self.tasks[name] = None

        await self.context_monitor.stop_all()
        
        # Stop background task manager
        if self.tasks["background_task_manager"]:
            await self.task_manager.stop()
            self.tasks["background_task_manager"] = None

    async def stop(self):
        """Final shutdown of all background activities."""
        async with self.lock:
            await self._stop_if_running()
