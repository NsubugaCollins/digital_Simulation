import simpy
import random
import numpy as np
from typing import List, Dict, Any, Optional

# ---------------------------------------------------------------------------
# Shift Configuration
# Each shift is defined as (start_minute_of_day, end_minute_of_day, name)
# Time 0 in the simulation = start of the first shift window (e.g. 06:00)
# ---------------------------------------------------------------------------
DEFAULT_SHIFTS = [
    {"name": "Morning",  "start": 0,    "end": 480},   # 0–480 min  (8 hrs)
    {"name": "Evening",  "start": 480,  "end": 960},   # 480–960 min (8 hrs)
    {"name": "Night",    "start": 960,  "end": 1440},  # 960–1440 min (8 hrs)
]


class FactorySimulation:
    """
    Discrete-Event Simulation of a factory production floor using SimPy.

    Features
    --------
    * Sequential process steps — each item visits steps in order
    * Resource contention — only one job per resource at a time (capacity=1 per line)
    * Multiple production lines — numLines replicates the resource set N times,
      items are distributed round-robin across lines
    * Machine breakdowns — probabilistic failures with repair downtime
    * Shift-aware reporting — metrics are tagged per shift window
    * Richer metrics — avg cycle time, max queue depth, throughput per shift
    """

    def __init__(
        self,
        item_count: int,
        steps: List[Dict[str, Any]],
        num_lines: int = 1,
        shifts_enabled: bool = False,
        shift_config: Optional[List[Dict]] = None,
    ):
        self.item_count = item_count
        self.steps = steps
        self.num_lines = max(1, num_lines)
        self.shifts_enabled = shifts_enabled
        self.shifts = shift_config if shift_config else DEFAULT_SHIFTS

        self.env = simpy.Environment()

        # Build resource pools — one set per production line
        # Key pattern: "<resourceType>_<resourceId>_line<L>"
        self.resources: Dict[str, simpy.Resource] = {}
        self.resource_details: Dict[str, Dict] = {}

        for line in range(self.num_lines):
            for step in steps:
                key = f"{step['resourceType']}_{step['resourceId']}_line{line}"
                if key not in self.resources:
                    self.resources[key] = simpy.Resource(self.env, capacity=1)
                    self.resource_details[key] = {
                        "id": step["resourceId"],
                        "type": step["resourceType"],
                        "name": step.get("resourceName", "Unknown"),
                        "line": line,
                        "power": step.get("powerConsumption", 5.0),     # kW
                        "speed": step.get("operatingSpeed", 1.0),
                        "maintenance_interval": step.get("maintenanceInterval", 100),  # hours
                        # Metrics
                        "active_time": 0.0,
                        "total_energy": 0.0,
                        "downtime": 0.0,
                        "wait_times": [],
                        "queue_snapshots": [],   # (time, queue_length) pairs
                        "breakdowns_count": 0,
                    }

        # Job-level tracking
        self.job_completions: List[float] = []       # cycle times per item
        self.job_entry_times: Dict[int, float] = {}  # item_id -> env time at entry
        self.event_log: List[Dict] = []

        # Shift utilisation tracking
        self.shift_completions: Dict[str, int] = {s["name"]: 0 for s in self.shifts}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def log_event(self, time: float, item_id: int, step_name: str, event_type: str, details: str = ""):
        self.event_log.append({
            "time": round(time, 2),
            "itemId": item_id,
            "step": step_name,
            "event": event_type,
            "details": details,
            "shift": self._shift_at(time),
        })

    def _shift_at(self, time_minutes: float) -> str:
        """Return the name of the shift active at simulation time `time_minutes`."""
        # Wrap around one full day (1440 min)
        t = time_minutes % 1440
        for s in self.shifts:
            if s["start"] <= t < s["end"]:
                return s["name"]
        return "Off-shift"

    def _snapshot_queue(self, key: str):
        """Record current queue depth for a resource."""
        res = self.resources[key]
        queue_len = len(res.queue)
        self.resource_details[key]["queue_snapshots"].append(queue_len)

    # ------------------------------------------------------------------
    # Core job process
    # ------------------------------------------------------------------

    def job_process(self, item_id: int, line: int):
        entry_time = self.env.now
        self.job_entry_times[item_id] = entry_time
        self.log_event(entry_time, item_id, "System", "ENTER",
                       f"Item entered production line {line}")

        for step in self.steps:
            step_name = step["name"]
            res_key = f"{step['resourceType']}_{step['resourceId']}_line{line}"
            resource = self.resources[res_key]
            details = self.resource_details[res_key]

            # Snapshot queue before requesting
            self._snapshot_queue(res_key)

            request_time = self.env.now
            self.log_event(request_time, item_id, step_name, "QUEUE",
                           f"Waiting for {details['name']} on line {line}")

            req = resource.request()
            yield req

            # Snapshot again after acquiring (queue should have dropped by 1)
            self._snapshot_queue(res_key)

            acquire_time = self.env.now
            wait_time = acquire_time - request_time
            details["wait_times"].append(wait_time)
            self.log_event(acquire_time, item_id, step_name, "START",
                           f"Processing on {details['name']} (waited {round(wait_time, 2)} min)")

            # Processing duration — adjusted for machine speed, with ±5% variance
            speed_factor = max(details["speed"], 0.1)
            base_duration = step["duration"] / speed_factor
            actual_duration = max(0.1, random.normalvariate(base_duration, base_duration * 0.05))

            # Probabilistic breakdown
            failure_rate = 1.0 / (details["maintenance_interval"] * 60.0)
            breakdown_prob = 1.0 - np.exp(-failure_rate * actual_duration)

            if random.random() < breakdown_prob:
                repair_time = max(1.0, random.normalvariate(12.0, 3.0))
                details["downtime"] += repair_time
                details["breakdowns_count"] += 1
                self.log_event(self.env.now, item_id, step_name, "BREAKDOWN",
                               f"{details['name']} failed! Repairing for {round(repair_time, 1)} min")
                yield self.env.timeout(repair_time)

            # Do the actual work
            yield self.env.timeout(actual_duration)

            resource.release(req)
            end_time = self.env.now
            self.log_event(end_time, item_id, step_name, "COMPLETE",
                           f"Finished on {details['name']}")

            # Accumulate metrics
            details["active_time"] += actual_duration
            details["total_energy"] += details["power"] * (actual_duration / 60.0)

        # Item is done
        cycle_time = self.env.now - entry_time
        self.job_completions.append(cycle_time)
        shift_name = self._shift_at(self.env.now)
        self.shift_completions[shift_name] = self.shift_completions.get(shift_name, 0) + 1
        self.log_event(self.env.now, item_id, "System", "EXIT",
                       f"Completed all steps — cycle time: {round(cycle_time, 2)} min")

    # ------------------------------------------------------------------
    # Arrival helpers
    # ------------------------------------------------------------------

    def arrival_trigger(self, delay: float):
        yield self.env.timeout(delay)

    # ------------------------------------------------------------------
    # Run
    # ------------------------------------------------------------------

    def run(self) -> Dict[str, Any]:
        # Distribute items across lines round-robin and stagger arrivals
        for i in range(1, self.item_count + 1):
            line = (i - 1) % self.num_lines
            self.env.process(self.job_process(i, line))
            if i < self.item_count:
                # Stagger arrivals: 1–3 min between jobs, scaled by number of lines
                gap = random.uniform(0.5, 2.0) / self.num_lines
                self.env.process(self.arrival_trigger(gap))

        self.env.run()

        # ----------------------------------------------------------------
        # Aggregate metrics
        # ----------------------------------------------------------------
        total_sim_time = max(self.env.now, 0.001)

        # Merge resource details across lines (aggregate by resource name + type)
        aggregated: Dict[str, Dict] = {}
        for key, det in self.resource_details.items():
            agg_key = f"{det['type']}_{det['id']}"
            if agg_key not in aggregated:
                aggregated[agg_key] = {
                    "resourceId": det["id"],
                    "resourceType": det["type"],
                    "name": det["name"],
                    "active_time": 0.0,
                    "total_energy": 0.0,
                    "downtime": 0.0,
                    "wait_times": [],
                    "queue_snapshots": [],
                    "breakdowns_count": 0,
                }
            a = aggregated[agg_key]
            a["active_time"] += det["active_time"]
            a["total_energy"] += det["total_energy"]
            a["downtime"] += det["downtime"]
            a["wait_times"].extend(det["wait_times"])
            a["queue_snapshots"].extend(det["queue_snapshots"])
            a["breakdowns_count"] += det["breakdowns_count"]

        machine_summary = []
        bottleneck_resource = None
        max_avg_wait = -1.0

        for agg_key, a in aggregated.items():
            avg_wait = float(np.mean(a["wait_times"])) if a["wait_times"] else 0.0
            # Utilisation: active processing time vs. available simulation time (across all lines)
            available_time = total_sim_time * self.num_lines
            utilization = (a["active_time"] / available_time * 100.0) if available_time > 0 else 0.0
            max_queue = int(max(a["queue_snapshots"])) if a["queue_snapshots"] else 0

            if avg_wait > max_avg_wait:
                max_avg_wait = avg_wait
                bottleneck_resource = a["name"]

            machine_summary.append({
                "resourceId": a["resourceId"],
                "resourceType": a["resourceType"],
                "name": a["name"],
                "utilization": round(min(100.0, utilization), 1),
                "totalEnergyKWh": round(a["total_energy"], 2),
                "downtimeMinutes": round(a["downtime"], 1),
                "breakdownsCount": a["breakdowns_count"],
                "avgQueueTimeMinutes": round(avg_wait, 2),
                "maxQueueLength": max_queue,
            })

        total_energy = sum(m["totalEnergyKWh"] for m in machine_summary)
        throughput_hourly = (self.item_count / (total_sim_time / 60.0)) if total_sim_time > 0 else 0.0

        avg_cycle_time = float(np.mean(self.job_completions)) if self.job_completions else 0.0
        min_cycle_time = float(np.min(self.job_completions)) if self.job_completions else 0.0
        max_cycle_time = float(np.max(self.job_completions)) if self.job_completions else 0.0

        return {
            "totalSimulationTimeMinutes": round(total_sim_time, 2),
            "productionCapacityHourly": round(throughput_hourly, 2),
            "totalEnergyKWh": round(total_energy, 2),
            "bottleneck": bottleneck_resource or "None",
            "numLines": self.num_lines,
            "shiftsEnabled": self.shifts_enabled,
            "avgCycleTimeMinutes": round(avg_cycle_time, 2),
            "minCycleTimeMinutes": round(min_cycle_time, 2),
            "maxCycleTimeMinutes": round(max_cycle_time, 2),
            "shiftCompletions": self.shift_completions,
            "machineMetrics": machine_summary,
            # Cap event log to first 500 events for readability
            "events": self.event_log[:500],
        }
