package com.frexsos.backend.controller;

import com.frexsos.backend.dto.SimulationCompareRequest;
import com.frexsos.backend.dto.SimulationDTO;
import com.frexsos.backend.dto.SimulationRunRequest;
import com.frexsos.backend.service.SimulationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SimulationController {

    private final SimulationService simulationService;

    // ------------------------------------------------------------------
    // Read
    // ------------------------------------------------------------------

    @GetMapping("/factories/{factoryId}/simulations")
    public ResponseEntity<List<SimulationDTO>> getSimulationsByFactory(
            @PathVariable Long factoryId) {
        return ResponseEntity.ok(simulationService.getSimulationsByFactory(factoryId));
    }

    @GetMapping("/simulations/{id}")
    public ResponseEntity<SimulationDTO> getSimulationById(@PathVariable Long id) {
        return ResponseEntity.ok(simulationService.getSimulationById(id));
    }

    // ------------------------------------------------------------------
    // Run a single simulation
    // ------------------------------------------------------------------

    @PostMapping("/factories/{factoryId}/simulations")
    public ResponseEntity<SimulationDTO> runSimulation(
            @PathVariable Long factoryId,
            @Valid @RequestBody SimulationRunRequest request) {
        return ResponseEntity.ok(simulationService.runSimulation(factoryId, request));
    }

    // ------------------------------------------------------------------
    // Scenario comparison (two configurations side-by-side)
    // ------------------------------------------------------------------

    @PostMapping("/factories/{factoryId}/simulations/compare")
    public ResponseEntity<Map<String, Object>> compareScenarios(
            @PathVariable Long factoryId,
            @Valid @RequestBody SimulationCompareRequest request) {
        return ResponseEntity.ok(simulationService.compareScenarios(factoryId, request));
    }

    // ------------------------------------------------------------------
    // Optimisation
    // ------------------------------------------------------------------

    @PostMapping("/processes/{processId}/optimize")
    public ResponseEntity<Map<String, Object>> optimizeProcess(@PathVariable Long processId) {
        return ResponseEntity.ok(simulationService.optimizeProcess(processId));
    }

    // ------------------------------------------------------------------
    // Engineering Report
    // ------------------------------------------------------------------

    @GetMapping("/simulations/{id}/report")
    public ResponseEntity<com.frexsos.backend.dto.EngineeringReportDTO> generateEngineeringReport(
            @PathVariable Long id,
            java.security.Principal principal) {
        String username = principal != null ? principal.getName() : "System Engineer";
        return ResponseEntity.ok(simulationService.generateEngineeringReport(id, username));
    }
}
