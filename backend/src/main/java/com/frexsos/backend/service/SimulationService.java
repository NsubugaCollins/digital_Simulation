package com.frexsos.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frexsos.backend.dto.EngineeringReportDTO;
import com.frexsos.backend.dto.SimulationCompareRequest;
import com.frexsos.backend.dto.SimulationDTO;
import com.frexsos.backend.dto.SimulationRunRequest;
import com.frexsos.backend.model.*;
import com.frexsos.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SimulationService {

    private final SimulationRepository simulationRepository;
    private final ProductionProcessRepository processRepository;
    private final ProcessStepRepository stepRepository;
    private final MachineRepository machineRepository;
    private final RobotRepository robotRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${simulation.service.url}")
    private String simulationServiceUrl;

    @Value("${simulation.api.key}")
    private String simulationApiKey;

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<SimulationDTO> getSimulationsByFactory(Long factoryId) {
        return simulationRepository.findByFactoryIdOrderByStartTimeDesc(factoryId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SimulationDTO getSimulationById(Long id) {
        Simulation sim = simulationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Simulation not found with id: " + id));
        return convertToDTO(sim);
    }

    // -----------------------------------------------------------------------
    // Run a single simulation
    // -----------------------------------------------------------------------

    @Transactional
    public SimulationDTO runSimulation(Long factoryId, SimulationRunRequest request) {
        ProductionProcess process = processRepository.findById(request.getProcessId())
                .orElseThrow(() -> new IllegalArgumentException("Process not found: " + request.getProcessId()));

        if (!process.getFactory().getId().equals(factoryId)) {
            throw new IllegalArgumentException("Process does not belong to this factory");
        }

        List<ProcessStep> steps = stepRepository.findByProcessIdOrderByStepOrderAsc(process.getId());
        if (steps.isEmpty()) {
            throw new IllegalArgumentException("Process must have at least one step to run a simulation");
        }

        // Persist a PENDING record immediately so the ID is available for the payload
        Simulation simulation = Simulation.builder()
                .factory(process.getFactory())
                .startTime(LocalDateTime.now())
                .status("PENDING")
                .build();
        simulation = simulationRepository.save(simulation);

        try {
            Map<String, Object> payload = buildSimulationPayload(
                    simulation.getId(),
                    request.getItemCount(),
                    process.getName(),
                    steps,
                    request.getNumLines(),
                    request.isShiftsEnabled()
            );

            String url = simulationServiceUrl + "/simulate";
            log.info("Sending simulation #{} to Python engine — items: {}, lines: {}",
                    simulation.getId(), request.getItemCount(), request.getNumLines());

            String response = postJson(url, payload);
            log.info("Simulation #{} completed successfully.", simulation.getId());

            simulation.setStatus("COMPLETED");
            simulation.setEndTime(LocalDateTime.now());
            simulation.setResultJson(response);
            simulation = simulationRepository.save(simulation);

            return convertToDTO(simulation);

        } catch (Exception e) {
            log.error("Simulation #{} failed: {}", simulation.getId(), e.getMessage(), e);
            simulation.setStatus("FAILED");
            simulation.setEndTime(LocalDateTime.now());
            simulation.setResultJson("{\"error\": \"" + escapeJson(e.getMessage()) + "\"}");
            simulation = simulationRepository.save(simulation);
            return convertToDTO(simulation);
        }
    }

    // -----------------------------------------------------------------------
    // Scenario comparison (two simulations run concurrently)
    // -----------------------------------------------------------------------

    @Transactional
    public Map<String, Object> compareScenarios(Long factoryId, SimulationCompareRequest request) {
        ProductionProcess process = processRepository.findById(request.getProcessId())
                .orElseThrow(() -> new IllegalArgumentException("Process not found: " + request.getProcessId()));

        if (!process.getFactory().getId().equals(factoryId)) {
            throw new IllegalArgumentException("Process does not belong to this factory");
        }

        List<ProcessStep> steps = stepRepository.findByProcessIdOrderByStepOrderAsc(process.getId());
        if (steps.isEmpty()) {
            throw new IllegalArgumentException("Process must have at least one step to compare");
        }

        try {
            // Build both payloads
            List<Map<String, Object>> compiledSteps = buildStepList(steps);

            Map<String, Object> comparePayload = new LinkedHashMap<>();
            comparePayload.put("processName", process.getName());
            comparePayload.put("steps", compiledSteps);
            comparePayload.put("baselineItems", request.getBaselineItems());
            comparePayload.put("baselineLines", request.getBaselineLines());
            comparePayload.put("scenarioItems", request.getScenarioItems());
            comparePayload.put("scenarioLines", request.getScenarioLines());
            comparePayload.put("shiftsEnabled", request.isShiftsEnabled());

            String url = simulationServiceUrl + "/simulate/scenario";
            log.info("Sending scenario comparison to Python engine — process: '{}'", process.getName());

            String response = postJson(url, comparePayload);
            log.info("Scenario comparison completed for process '{}'.", process.getName());
            return objectMapper.readValue(response, Map.class);

        } catch (Exception e) {
            log.error("Scenario comparison failed: {}", e.getMessage(), e);
            Map<String, Object> errMap = new LinkedHashMap<>();
            errMap.put("error", e.getMessage());
            return errMap;
        }
    }

    // -----------------------------------------------------------------------
    // Optimisation
    // -----------------------------------------------------------------------

    @Transactional
    public Map<String, Object> optimizeProcess(Long processId) {
        ProductionProcess process = processRepository.findById(processId)
                .orElseThrow(() -> new IllegalArgumentException("Process not found: " + processId));

        List<ProcessStep> steps = stepRepository.findByProcessIdOrderByStepOrderAsc(process.getId());
        if (steps.isEmpty()) {
            throw new IllegalArgumentException("Process must have at least one step to optimize");
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("processId", process.getId());
            payload.put("processName", process.getName());
            payload.put("steps", buildStepList(steps));

            String url = simulationServiceUrl + "/optimize";
            log.info("Sending optimisation request for process '{}'.", process.getName());

            String response = postJson(url, payload);
            log.info("Optimisation completed for process '{}'.", process.getName());
            return objectMapper.readValue(response, Map.class);

        } catch (Exception e) {
            log.error("Optimisation failed: {}", e.getMessage(), e);
            Map<String, Object> errMap = new LinkedHashMap<>();
            errMap.put("error", e.getMessage());
            return errMap;
        }
    }

    // -----------------------------------------------------------------------
    // Report Compilation
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public EngineeringReportDTO generateEngineeringReport(Long simulationId, String username) {
        Simulation sim = simulationRepository.findById(simulationId)
                .orElseThrow(() -> new IllegalArgumentException("Simulation not found with id: " + simulationId));

        if (!"COMPLETED".equals(sim.getStatus())) {
            throw new IllegalStateException("Engineering report can only be generated for completed simulations.");
        }

        try {
            Map<String, Object> results = objectMapper.readValue(sim.getResultJson(), Map.class);

            // Find the process associated with this simulation
            ProductionProcess process = null;
            List<ProductionProcess> processes = processRepository.findByFactoryId(sim.getFactory().getId());
            for (ProductionProcess p : processes) {
                if (sim.getResultJson().contains(p.getName())) {
                    process = p;
                    break;
                }
            }
            if (process == null && !processes.isEmpty()) {
                process = processes.get(0);
            }

            List<Map<String, Object>> stepsList = new ArrayList<>();
            if (process != null) {
                List<ProcessStep> steps = stepRepository.findByProcessIdOrderByStepOrderAsc(process.getId());
                stepsList = buildStepList(steps);
            }

            // Extract main KPIs
            Double duration = ((Number) results.get("totalSimulationTimeMinutes")).doubleValue();
            Double throughput = ((Number) results.get("productionCapacityHourly")).doubleValue();
            Double energy = ((Number) results.get("totalEnergyKWh")).doubleValue();
            Double avgCycle = ((Number) results.get("avgCycleTimeMinutes")).doubleValue();
            Double minCycle = results.containsKey("minCycleTimeMinutes") ? ((Number) results.get("minCycleTimeMinutes")).doubleValue() : 0.0;
            Double maxCycle = results.containsKey("maxCycleTimeMinutes") ? ((Number) results.get("maxCycleTimeMinutes")).doubleValue() : 0.0;
            String bottleneck = (String) results.get("bottleneck");
            Integer numLines = results.containsKey("numLines") ? ((Number) results.get("numLines")).intValue() : 1;
            Boolean shiftsEnabled = results.containsKey("shiftsEnabled") ? (Boolean) results.get("shiftsEnabled") : false;

            // Environmental footprint estimates:
            // Average grid carbon intensity of 0.45 kg CO2 per kWh
            double carbonFootprint = energy * 0.45;
            // Energy utility cost of $0.15 per kWh
            double utilityCost = energy * 0.15;

            // Health check and warnings from simulation run
            List<Map<String, Object>> resourceMetrics = (List<Map<String, Object>>) results.get("machineMetrics");
            List<Map<String, Object>> maintenanceWarnings = new ArrayList<>();

            if (resourceMetrics != null) {
                for (Map<String, Object> m : resourceMetrics) {
                    int breakdowns = ((Number) m.get("breakdownsCount")).intValue();
                    double utilization = ((Number) m.get("utilization")).doubleValue();
                    double downtime = ((Number) m.get("downtimeMinutes")).doubleValue();
                    String name = (String) m.get("name");
                    String type = (String) m.get("resourceType");

                    if (breakdowns > 1 || utilization > 80.0 || downtime > 20.0) {
                        Map<String, Object> warning = new LinkedHashMap<>();
                        warning.put("resourceName", name);
                        warning.put("resourceType", type);
                        
                        String riskLevel;
                        String message;
                        if (breakdowns > 2 || utilization > 90.0) {
                            riskLevel = "CRITICAL";
                            message = breakdowns > 2 
                                ? "Extreme breakdown frequency detected during run. Immediate wear inspection recommended."
                                : "Resource utilization is exceeding maximum sustainable capacity (>90%). Severe bottleneck risk.";
                        } else {
                            riskLevel = "WARNING";
                            message = utilization > 80.0
                                ? "High utilization (>80%) may accelerate tool wear and machine fatigue."
                                : "Elevated downtime experienced due to micro-stoppages. Calibration audit recommended.";
                        }
                        
                        warning.put("riskLevel", riskLevel);
                        warning.put("message", message);
                        warning.put("breakdowns", breakdowns);
                        warning.put("utilization", utilization);
                        maintenanceWarnings.add(warning);
                    }
                }
            }

            // Build Report DTO
            return EngineeringReportDTO.builder()
                    .simulationId(sim.getId())
                    .factoryId(sim.getFactory().getId())
                    .factoryName(sim.getFactory().getName())
                    .factoryLocation(sim.getFactory().getLocation())
                    .processId(process != null ? process.getId() : -1L)
                    .processName(process != null ? process.getName() : "Unknown Process")
                    .generatedDate(LocalDateTime.now())
                    .generatedBy(username != null ? username : "System Engineer")
                    .startTime(sim.getStartTime())
                    .endTime(sim.getEndTime())
                    .itemCount(results.containsKey("itemCount") ? ((Number) results.get("itemCount")).intValue() : 100)
                    .numLines(numLines)
                    .shiftsEnabled(shiftsEnabled)
                    .totalDurationMinutes(Math.round(duration * 100.0) / 100.0)
                    .productionCapacityHourly(Math.round(throughput * 100.0) / 100.0)
                    .totalEnergyKWh(Math.round(energy * 100.0) / 100.0)
                    .avgCycleTimeMinutes(Math.round(avgCycle * 100.0) / 100.0)
                    .minCycleTimeMinutes(Math.round(minCycle * 100.0) / 100.0)
                    .maxCycleTimeMinutes(Math.round(maxCycle * 100.0) / 100.0)
                    .bottleneck(bottleneck)
                    .utilityCostUSD(Math.round(utilityCost * 100.0) / 100.0)
                    .carbonFootprintCO2Kg(Math.round(carbonFootprint * 100.0) / 100.0)
                    .steps(stepsList)
                    .resourceMetrics(resourceMetrics)
                    .maintenanceWarnings(maintenanceWarnings)
                    .build();

        } catch (Exception e) {
            log.error("Failed to compile engineering report for simulation #{}: {}", simulationId, e.getMessage(), e);
            throw new RuntimeException("Failed to generate engineering report: " + e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Builds the full JSON payload map for a /simulate call.
     */
    private Map<String, Object> buildSimulationPayload(
            Long simId, int itemCount, String processName,
            List<ProcessStep> steps, int numLines, boolean shiftsEnabled) {

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("simulationId", simId);
        payload.put("itemCount", itemCount);
        payload.put("processName", processName);
        payload.put("numLines", numLines);
        payload.put("shiftsEnabled", shiftsEnabled);
        payload.put("steps", buildStepList(steps));
        return payload;
    }

    /**
     * Resolves each ProcessStep to its machine/robot properties and builds
     * a list of step maps ready for the Python engine.
     */
    private List<Map<String, Object>> buildStepList(List<ProcessStep> steps) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (ProcessStep step : steps) {
            Map<String, Object> stepMap = new LinkedHashMap<>();
            stepMap.put("stepOrder", step.getStepOrder());
            stepMap.put("name", step.getName());
            stepMap.put("duration", step.getDuration());
            stepMap.put("resourceType", step.getResourceType());
            stepMap.put("resourceId", step.getResourceId());

            if ("MACHINE".equalsIgnoreCase(step.getResourceType())) {
                Machine machine = machineRepository.findById(step.getResourceId())
                        .orElseThrow(() -> new IllegalArgumentException("Machine not found: " + step.getResourceId()));
                stepMap.put("resourceName", machine.getName());
                stepMap.put("operatingSpeed", machine.getOperatingSpeed() != null ? machine.getOperatingSpeed() : 1.0);
                stepMap.put("powerConsumption", machine.getPowerConsumption() != null ? machine.getPowerConsumption() : 5.0);
                stepMap.put("maintenanceInterval", machine.getMaintenanceInterval() != null ? machine.getMaintenanceInterval() : 100);
            } else {
                Robot robot = robotRepository.findById(step.getResourceId())
                        .orElseThrow(() -> new IllegalArgumentException("Robot not found: " + step.getResourceId()));
                stepMap.put("resourceName", robot.getName());
                stepMap.put("operatingSpeed", robot.getOperatingSpeed() != null ? robot.getOperatingSpeed() : 1.0);
                stepMap.put("powerConsumption", robot.getPowerConsumption() != null ? robot.getPowerConsumption() : 5.0);
                stepMap.put("maintenanceInterval", robot.getMaintenanceInterval() != null ? robot.getMaintenanceInterval() : 150);
            }
            result.add(stepMap);
        }
        return result;
    }

    /**
     * POST a JSON payload and return the raw response string.
     */
    private String postJson(String url, Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-Key", simulationApiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        return restTemplate.postForObject(url, entity, String.class);
    }

    private String escapeJson(String msg) {
        if (msg == null) return "Unknown error";
        return msg.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private SimulationDTO convertToDTO(Simulation sim) {
        return SimulationDTO.builder()
                .id(sim.getId())
                .factoryId(sim.getFactory().getId())
                .startTime(sim.getStartTime())
                .endTime(sim.getEndTime())
                .status(sim.getStatus())
                .resultJson(sim.getResultJson())
                .build();
    }
}
