import random
import numpy as np
from typing import List, Dict, Any

class GeneticOptimizer:
    def __init__(self, steps: List[Dict[str, Any]]):
        self.steps = steps
        # Define constants for cost functions
        self.energy_cost_rate = 0.15      # $ per kWh
        self.downtime_cost_rate = 150.0   # $ per hour of repair downtime
        self.delay_penalty_rate = 50.0    # $ per hour of production time (makespan)
        self.target_item_count = 100

    def evaluate_chromosome(self, speeds: List[float]) -> float:
        """
        Evaluate a chromosome (list of speed multipliers, e.g. [1.2, 0.8, 1.5]).
        Returns total cost (fitness - to be minimized).
        """
        makespan_minutes = 0.0
        total_energy_kwh = 0.0
        total_downtime_minutes = 0.0

        # Simple queuing queue factor: if a step is slower than the previous one, it creates a queue
        prev_throughput = 9999.0

        for idx, step in enumerate(self.steps):
            speed_mult = speeds[idx]
            
            # Base machine properties
            base_duration = step.get("duration", 5.0)
            power = step.get("powerConsumption", 5.0)
            maint_interval = step.get("maintenanceInterval", 100.0)

            # Active processing time for this step
            step_duration = base_duration / speed_mult
            
            # Calculate resource throughput capacity
            step_throughput = speed_mult / base_duration

            # Estimated queuing delay: if throughput is lower than arrival or previous stage
            queue_delay = 0.0
            if step_throughput < prev_throughput:
                queue_delay = (1.0 / step_throughput - 1.0 / prev_throughput) * self.target_item_count * 0.4
                queue_delay = max(0.0, queue_delay)
            
            prev_throughput = step_throughput

            # Total processing + waiting time for all items
            step_total_time = (step_duration * self.target_item_count) + queue_delay
            makespan_minutes += step_total_time

            # Energy: active power scales non-linearly with speed (speed^1.5)
            adjusted_power = power * (speed_mult ** 1.5)
            step_energy = adjusted_power * (step_duration * self.target_item_count / 60.0)
            total_energy_kwh += step_energy

            # Breakdowns: failure probability scales quadratically with speed (speed^2)
            # Failure rate per hour
            failure_rate = (speed_mult ** 2.0) / maint_interval
            step_operating_hours = (step_duration * self.target_item_count) / 60.0
            expected_failures = failure_rate * step_operating_hours
            expected_repair_time_mins = expected_failures * 15.0 # 15 mins average repair
            total_downtime_minutes += expected_repair_time_mins

        makespan_hours = makespan_minutes / 60.0
        downtime_hours = total_downtime_minutes / 60.0

        # Calculate costs
        energy_cost = total_energy_kwh * self.energy_cost_rate
        downtime_cost = downtime_hours * self.downtime_cost_rate
        delay_cost = makespan_hours * self.delay_penalty_rate

        return energy_cost + downtime_cost + delay_cost

    def optimize(self, generations: int = 40, pop_size: int = 30) -> Dict[str, Any]:
        num_genes = len(self.steps)
        if num_genes == 0:
            return {}

        # Population: list of random speed multipliers between 0.6x and 1.8x
        population = [
            [random.uniform(0.6, 1.8) for _ in range(num_genes)]
            for _ in range(pop_size)
        ]

        # Keep track of baseline (1.0 speed multiplier for all genes)
        baseline_speeds = [1.0] * num_genes
        baseline_cost = self.evaluate_chromosome(baseline_speeds)

        best_chromosome = None
        best_cost = float('inf')

        # Genetic Algorithm loop
        for _ in range(generations):
            # Evaluate fitness
            scored_pop = [(self.evaluate_chromosome(ind), ind) for ind in population]
            scored_pop.sort(key=lambda x: x[0])

            # Track global best
            if scored_pop[0][0] < best_cost:
                best_cost = scored_pop[0][0]
                best_chromosome = scored_pop[0][1]

            # Selection (Elitism + tournament)
            new_pop = [scored_pop[0][1], scored_pop[1][1]] # Elitism: keep best 2

            while len(new_pop) < pop_size:
                # Tournament selection
                parent1 = self.tournament(scored_pop)
                parent2 = self.tournament(scored_pop)

                # Crossover (single-point)
                if random.random() < 0.8 and num_genes > 1:
                    cross_point = random.randint(1, num_genes - 1)
                    child1 = parent1[:cross_point] + parent2[cross_point:]
                    child2 = parent2[:cross_point] + parent1[cross_point:]
                else:
                    child1, child2 = parent1.copy(), parent2.copy()

                # Mutation
                self.mutate(child1)
                self.mutate(child2)

                new_pop.extend([child1, child2])

            population = new_pop[:pop_size]

        # Calculate final metrics for the best configuration
        opt_speeds = best_chromosome
        
        # Format results
        recommendations = []
        for idx, step in enumerate(self.steps):
            rec_speed = round(opt_speeds[idx] * 100.0, 0)
            recommendations.append({
                "stepOrder": step.get("stepOrder"),
                "name": step.get("name"),
                "resourceName": step.get("resourceName", "Resource"),
                "resourceType": step.get("resourceType"),
                "resourceId": step.get("resourceId"),
                "recommendedSpeedPercent": rec_speed,
                "action": "Increase speed" if rec_speed > 105 else ("Decrease speed (save energy/wear)" if rec_speed < 95 else "Maintain current speed")
            })

        cost_saving_pct = round(((baseline_cost - best_cost) / baseline_cost * 100.0), 1) if baseline_cost > 0 else 0.0

        return {
            "baselineCostUSD": round(baseline_cost, 2),
            "optimizedCostUSD": round(best_cost, 2),
            "costSavingPercent": max(0.0, cost_saving_pct),
            "recommendations": recommendations
        }

    def tournament(self, scored_pop: List[Any], k: int = 3) -> List[float]:
        candidates = random.sample(scored_pop, k)
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]

    def mutate(self, chromosome: List[float]):
        for i in range(len(chromosome)):
            if random.random() < 0.15: # 15% mutation rate
                # Mutate by adding small random value, keep within bounds
                chromosome[i] = max(0.5, min(2.0, chromosome[i] + random.normalvariate(0.0, 0.2)))
