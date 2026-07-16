package com.frexsos.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frexsos.backend.dto.OperationalPerformanceLogCreateRequest;
import com.frexsos.backend.dto.OperationalPerformanceLogDTO;
import com.frexsos.backend.model.Factory;
import com.frexsos.backend.model.OperationalPerformanceLog;
import com.frexsos.backend.model.ProductionProcess;
import com.frexsos.backend.model.Simulation;
import com.frexsos.backend.repository.FactoryRepository;
import com.frexsos.backend.repository.OperationalPerformanceLogRepository;
import com.frexsos.backend.repository.ProductionProcessRepository;
import com.frexsos.backend.repository.SimulationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OperationalPerformanceLogService {

    private final OperationalPerformanceLogRepository logRepository;
    private final FactoryRepository factoryRepository;
    private final ProductionProcessRepository processRepository;
    private final SimulationRepository simulationRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<OperationalPerformanceLogDTO> getLogsByFactory(Long factoryId) {
        return logRepository.findByFactoryIdOrderByRunDateDesc(factoryId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OperationalPerformanceLogDTO> getLogsByProcess(Long processId) {
        return logRepository.findByProcessIdOrderByRunDateDesc(processId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public OperationalPerformanceLogDTO createLog(Long factoryId, OperationalPerformanceLogCreateRequest request) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new IllegalArgumentException("Factory not found with id: " + factoryId));
        ProductionProcess process = processRepository.findById(request.getProcessId())
                .orElseThrow(() -> new IllegalArgumentException("Process not found with id: " + request.getProcessId()));

        OperationalPerformanceLog logEntry = OperationalPerformanceLog.builder()
                .factory(factory)
                .process(process)
                .name(request.getName())
                .runDate(LocalDateTime.now())
                .itemCount(request.getItemCount())
                .numLines(request.getNumLines())
                .totalDurationMinutes(request.getTotalDurationMinutes())
                .totalEnergyKWh(request.getTotalEnergyKWh())
                .avgCycleTimeMinutes(request.getAvgCycleTimeMinutes())
                .bottleneck(request.getBottleneck())
                .resultJson(request.getResultJson())
                .build();

        return convertToDTO(logRepository.save(logEntry));
    }

    @Transactional
    public void deleteLog(Long id) {
        if (!logRepository.existsById(id)) {
            throw new IllegalArgumentException("Log not found with id: " + id);
        }
        logRepository.deleteById(id);
    }

    @Transactional
    public OperationalPerformanceLogDTO generateMockActualLog(Long factoryId, Long simulationId) {
        Simulation sim = simulationRepository.findById(simulationId)
                .orElseThrow(() -> new IllegalArgumentException("Simulation not found with id: " + simulationId));

        if (!sim.getStatus().equals("COMPLETED")) {
            throw new IllegalStateException("Cannot generate real-world comparison data from an uncompleted simulation run");
        }

        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new IllegalArgumentException("Factory not found with id: " + factoryId));

        try {
            Map<String, Object> simResult = objectMapper.readValue(sim.getResultJson(), Map.class);
            Random rand = new Random(simulationId); // Seed with simulation ID for consistent results per run

            // Extract baseline values
            double simDuration = ((Number) simResult.get("totalSimulationTimeMinutes")).doubleValue();
            double simEnergy = ((Number) simResult.get("totalEnergyKWh")).doubleValue();
            double simAvgCycleTime = ((Number) simResult.get("avgCycleTimeMinutes")).doubleValue();
            int itemCount = sim.getResultJson().contains("itemCount") ? ((Number) simResult.get("itemCount")).intValue() : 100;
            // Parse itemCount from SimResult if not present
            if (simResult.containsKey("events")) {
                List<Map> events = (List<Map>) simResult.get("events");
                // Fallback estimate
            }
            
            // Perturbations for realistic "real-world" noise
            // Typically, real factories run slower and consume slightly more energy due to logistics, ambient temperatures, and human factor
            double actualDuration = simDuration * (1.05 + rand.nextDouble() * 0.15); // 5% to 20% longer
            double actualEnergy = simEnergy * (1.08 + rand.nextDouble() * 0.12); // 8% to 20% higher
            double actualAvgCycleTime = simAvgCycleTime * (1.04 + rand.nextDouble() * 0.12); // 4% to 16% higher

            // Perturb individual machine/robot stats
            List<Map<String, Object>> simMachines = (List<Map<String, Object>>) simResult.get("machineMetrics");
            List<Map<String, Object>> actualMachines = new ArrayList<>();
            String actualBottleneck = sim.getResultJson().contains("bottleneck") ? (String) simResult.get("bottleneck") : "None";
            double maxAvgWait = -1.0;

            if (simMachines != null) {
                for (Map<String, Object> simM : simMachines) {
                    Map<String, Object> actM = new LinkedHashMap<>(simM);
                    
                    double simUtil = ((Number) simM.get("utilization")).doubleValue();
                    double simPower = ((Number) simM.get("totalEnergyKWh")).doubleValue();
                    double simDowntime = ((Number) simM.get("downtimeMinutes")).doubleValue();
                    int simBreakdowns = ((Number) simM.get("breakdownsCount")).intValue();
                    double simWait = ((Number) simM.get("avgQueueTimeMinutes")).doubleValue();

                    // Real-world machines have lower utilization due to load lags
                    double actUtil = simUtil * (0.90 + rand.nextDouble() * 0.08);
                    double actPower = simPower * (1.05 + rand.nextDouble() * 0.10);
                    // Real-world downtime is higher due to operator reaction delay
                    double actDowntime = simDowntime + (rand.nextInt(12) + 6);
                    int actBreakdowns = simBreakdowns + rand.nextInt(2) + 1; // At least 1-3 additional mini-stoppages
                    double actWait = simWait * (1.10 + rand.nextDouble() * 0.20); // 10% to 30% longer queue waits

                    actM.put("utilization", Math.round(Math.min(100.0, actUtil) * 10.0) / 10.0);
                    actM.put("totalEnergyKWh", Math.round(actPower * 100.0) / 100.0);
                    actM.put("downtimeMinutes", Math.round(actDowntime * 10.0) / 10.0);
                    actM.put("breakdownsCount", actBreakdowns);
                    actM.put("avgQueueTimeMinutes", Math.round(actWait * 100.0) / 100.0);
                    
                    if (actWait > maxAvgWait) {
                        maxAvgWait = actWait;
                        actualBottleneck = (String) simM.get("name");
                    }
                    
                    actualMachines.add(actM);
                }
            }

            // Create perturbed result json
            Map<String, Object> actResult = new LinkedHashMap<>();
            actResult.put("totalSimulationTimeMinutes", Math.round(actualDuration * 100.0) / 100.0);
            actResult.put("productionCapacityHourly", Math.round((simResult.containsKey("productionCapacityHourly") ? ((Number) simResult.get("productionCapacityHourly")).doubleValue() : 50.0) * (simDuration / actualDuration) * 100.0) / 100.0);
            actResult.put("totalEnergyKWh", Math.round(actualEnergy * 100.0) / 100.0);
            actResult.put("bottleneck", actualBottleneck);
            actResult.put("avgCycleTimeMinutes", Math.round(actualAvgCycleTime * 100.0) / 100.0);
            actResult.put("machineMetrics", actualMachines);

            // Estimate process config
            ProductionProcess process = sim.getFactory().getId().equals(factoryId) ? 
                    processRepository.findByFactoryId(factoryId).stream()
                            .filter(p -> sim.getResultJson().contains(p.getName()))
                            .findFirst().orElse(null) : null;
            
            if (process == null) {
                // Fallback to first process
                List<ProductionProcess> processes = processRepository.findByFactoryId(factoryId);
                process = processes.isEmpty() ? null : processes.get(0);
            }

            if (process == null) {
                throw new IllegalStateException("No active process found to link the actual operational log");
            }

            String processName = process.getName();
            String logName = String.format("Actual Run — %s (Batch #%d)", processName, sim.getId());

            OperationalPerformanceLog logEntry = OperationalPerformanceLog.builder()
                    .factory(factory)
                    .process(process)
                    .name(logName)
                    .runDate(LocalDateTime.now().minusDays(rand.nextInt(7) + 1)) // Random date in past week
                    .itemCount(simResult.containsKey("itemCount") ? ((Number) simResult.get("itemCount")).intValue() : 100)
                    .numLines(simResult.containsKey("numLines") ? ((Number) simResult.get("numLines")).intValue() : 1)
                    .totalDurationMinutes(Math.round(actualDuration * 10.0) / 10.0)
                    .totalEnergyKWh(Math.round(actualEnergy * 10.0) / 10.0)
                    .avgCycleTimeMinutes(Math.round(actualAvgCycleTime * 10.0) / 10.0)
                    .bottleneck(actualBottleneck)
                    .resultJson(objectMapper.writeValueAsString(actResult))
                    .build();

            return convertToDTO(logRepository.save(logEntry));

        } catch (Exception e) {
            log.error("Failed to generate mock actual performance log: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate mock actual operational log: " + e.getMessage());
        }
    }

    private OperationalPerformanceLogDTO convertToDTO(OperationalPerformanceLog logEntry) {
        return OperationalPerformanceLogDTO.builder()
                .id(logEntry.getId())
                .factoryId(logEntry.getFactory().getId())
                .processId(logEntry.getProcess().getId())
                .processName(logEntry.getProcess().getName())
                .name(logEntry.getName())
                .runDate(logEntry.getRunDate())
                .itemCount(logEntry.getItemCount())
                .numLines(logEntry.getNumLines())
                .totalDurationMinutes(logEntry.getTotalDurationMinutes())
                .totalEnergyKWh(logEntry.getTotalEnergyKWh())
                .avgCycleTimeMinutes(logEntry.getAvgCycleTimeMinutes())
                .bottleneck(logEntry.getBottleneck())
                .resultJson(logEntry.getResultJson())
                .build();
    }
}
