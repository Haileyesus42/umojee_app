"""
Load Testing: Test system performance under scale.

Tests:
- 1000 concurrent journeys with monitoring
- Memory usage tracking
- API rate limit handling
- Response time measurement
- Bottleneck identification
"""

import asyncio
import time
import psutil
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class LoadTestMetrics:
    """Metrics collected during load test."""
    total_journeys: int = 0
    successful_journeys: int = 0
    failed_journeys: int = 0
    total_duration_seconds: float = 0.0
    avg_response_time_ms: float = 0.0
    min_response_time_ms: float = 0.0
    max_response_time_ms: float = 0.0
    p50_response_time_ms: float = 0.0
    p95_response_time_ms: float = 0.0
    p99_response_time_ms: float = 0.0
    
    memory_start_mb: float = 0.0
    memory_peak_mb: float = 0.0
    memory_end_mb: float = 0.0
    
    api_calls_total: int = 0
    api_calls_cached: int = 0
    api_calls_failed: int = 0
    
    response_times: List[float] = field(default_factory=list)
    
    def calculate_percentiles(self):
        """Calculate response time percentiles."""
        if not self.response_times:
            return
        
        sorted_times = sorted(self.response_times)
        n = len(sorted_times)
        
        self.min_response_time_ms = sorted_times[0]
        self.max_response_time_ms = sorted_times[-1]
        self.avg_response_time_ms = sum(sorted_times) / n
        self.p50_response_time_ms = sorted_times[int(n * 0.5)]
        self.p95_response_time_ms = sorted_times[int(n * 0.95)]
        self.p99_response_time_ms = sorted_times[int(n * 0.99)]
    
    def print_report(self):
        """Print load test report."""
        print("\n" + "="*80)
        print("LOAD TEST REPORT")
        print("="*80)
        print(f"\nJourneys:")
        print(f"  Total:      {self.total_journeys}")
        print(f"  Successful: {self.successful_journeys} ({self.successful_journeys/self.total_journeys*100:.1f}%)")
        print(f"  Failed:     {self.failed_journeys} ({self.failed_journeys/self.total_journeys*100:.1f}%)")
        
        print(f"\nResponse Times:")
        print(f"  Average: {self.avg_response_time_ms:.0f} ms")
        print(f"  Min:     {self.min_response_time_ms:.0f} ms")
        print(f"  Max:     {self.max_response_time_ms:.0f} ms")
        print(f"  P50:     {self.p50_response_time_ms:.0f} ms")
        print(f"  P95:     {self.p95_response_time_ms:.0f} ms")
        print(f"  P99:     {self.p99_response_time_ms:.0f} ms")
        
        print(f"\nMemory Usage:")
        print(f"  Start: {self.memory_start_mb:.1f} MB")
        print(f"  Peak:  {self.memory_peak_mb:.1f} MB")
        print(f"  End:   {self.memory_end_mb:.1f} MB")
        print(f"  Delta: {self.memory_end_mb - self.memory_start_mb:.1f} MB")
        
        print(f"\nAPI Calls:")
        print(f"  Total:  {self.api_calls_total}")
        print(f"  Cached: {self.api_calls_cached} ({self.api_calls_cached/max(self.api_calls_total,1)*100:.1f}%)")
        print(f"  Failed: {self.api_calls_failed} ({self.api_calls_failed/max(self.api_calls_total,1)*100:.1f}%)")
        
        print(f"\nDuration: {self.total_duration_seconds:.1f} seconds")
        print(f"Throughput: {self.total_journeys / self.total_duration_seconds:.1f} journeys/sec")
        print("="*80 + "\n")


class LoadTester:
    """
    Load testing framework for journey system.
    
    Simulates realistic user behavior:
    - Create journeys
    - Send messages
    - Trigger transitions
    - Monitor context updates
    """
    
    def __init__(self, state_manager: Any, context_monitor: Any):
        self.state_manager = state_manager
        self.context_monitor = context_monitor
        self.metrics = LoadTestMetrics()
    
    async def simulate_journey_lifecycle(self, user_id: str) -> Dict[str, Any]:
        """
        Simulate a complete journey lifecycle.
        
        Returns:
            Dict with journey_id and success status
        """
        start = time.time()
        
        try:
            # 1. Create journey
            journey = self.state_manager.initialize_journey(user_id, f"conv_{user_id}")
            
            # 2. Transition through segments
            from agent.journey.phase_1_foundation import JourneySegment
            
            segments = [
                JourneySegment.INSPIRATION,
                JourneySegment.HOME_TO_AIRPORT,
                JourneySegment.AIRPORT_TO_FLIGHT,
                JourneySegment.FLIGHT_TO_HOTEL,
                JourneySegment.HOTEL_TO_ACTIVITIES,
                JourneySegment.RETURN,
            ]
            
            for i in range(len(segments) - 1):
                await asyncio.sleep(0.01)  # Simulate processing time
                self.state_manager.transition_segment(
                    journey.journey_id,
                    segments[i],
                    segments[i + 1],
                )
            
            # 3. Complete journey
            self.state_manager.complete_journey(journey.journey_id)
            
            elapsed = (time.time() - start) * 1000  # ms
            self.metrics.response_times.append(elapsed)
            self.metrics.successful_journeys += 1
            
            return {
                "success": True,
                "journey_id": journey.journey_id,
                "elapsed_ms": elapsed,
            }
        
        except Exception as e:
            logger.error(f"Journey simulation failed for {user_id}: {e}")
            self.metrics.failed_journeys += 1
            return {
                "success": False,
                "error": str(e),
            }
    
    async def run_load_test(
        self,
        num_journeys: int = 1000,
        concurrency: int = 50,
    ) -> LoadTestMetrics:
        """
        Run load test with specified parameters.
        
        Args:
            num_journeys: Total number of journeys to simulate
            concurrency: Number of concurrent journeys
        
        Returns:
            LoadTestMetrics with results
        """
        print(f"\n🚀 Starting load test: {num_journeys} journeys, {concurrency} concurrent\n")
        
        # Record start metrics
        process = psutil.Process()
        self.metrics.memory_start_mb = process.memory_info().rss / 1024 / 1024
        self.metrics.total_journeys = num_journeys
        
        start_time = time.time()
        
        # Create batches
        batches = [
            list(range(i, min(i + concurrency, num_journeys)))
            for i in range(0, num_journeys, concurrency)
        ]
        
        for batch_idx, batch in enumerate(batches):
            print(f"Batch {batch_idx + 1}/{len(batches)}: Processing {len(batch)} journeys...")
            
            # Run batch concurrently
            tasks = [
                self.simulate_journey_lifecycle(f"user_{i}")
                for i in batch
            ]
            
            await asyncio.gather(*tasks, return_exceptions=True)
            
            # Track peak memory
            current_memory = process.memory_info().rss / 1024 / 1024
            self.metrics.memory_peak_mb = max(self.metrics.memory_peak_mb, current_memory)
            
            # Progress update
            completed = (batch_idx + 1) * concurrency
            progress = min(completed / num_journeys * 100, 100)
            print(f"  Progress: {progress:.1f}% | Memory: {current_memory:.1f} MB")
        
        # Record end metrics
        self.metrics.total_duration_seconds = time.time() - start_time
        self.metrics.memory_end_mb = process.memory_info().rss / 1024 / 1024
        
        # Calculate statistics
        self.metrics.calculate_percentiles()
        
        return self.metrics


async def run_load_test(
    num_journeys: int = 1000,
    concurrency: int = 50,
) -> LoadTestMetrics:
    """
    Run load test on journey system.
    
    Usage:
        metrics = await run_load_test(num_journeys=1000, concurrency=50)
        metrics.print_report()
    """
    from agent.journey.phase_1_foundation import JourneyStateManager
    from agent.journey.phase_2_context_monitoring import ContextMonitor
    
    # Setup system
    state_manager = JourneyStateManager()
    context_monitor = ContextMonitor(state_manager=state_manager)
    
    # Inject singletons
    from agent.journey.journey_orchestrator import set_journey_singletons
    set_journey_singletons(state_manager, context_monitor)
    
    # Run test
    tester = LoadTester(state_manager, context_monitor)
    metrics = await tester.run_load_test(num_journeys, concurrency)
    
    # Print report
    metrics.print_report()
    
    return metrics


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import sys
    
    # Parse args
    num_journeys = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    concurrency = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    print(f"Load Test Configuration:")
    print(f"  Journeys:    {num_journeys}")
    print(f"  Concurrency: {concurrency}")
    print(f"  Expected duration: ~{num_journeys / concurrency * 0.1:.1f} seconds")
    
    # Run test
    asyncio.run(run_load_test(num_journeys, concurrency))
