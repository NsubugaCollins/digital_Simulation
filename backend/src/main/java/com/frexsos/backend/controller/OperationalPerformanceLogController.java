package com.frexsos.backend.controller;

import com.frexsos.backend.dto.OperationalPerformanceLogCreateRequest;
import com.frexsos.backend.dto.OperationalPerformanceLogDTO;
import com.frexsos.backend.service.OperationalPerformanceLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OperationalPerformanceLogController {

    private final OperationalPerformanceLogService logService;

    @GetMapping("/factories/{factoryId}/operational-logs")
    public ResponseEntity<List<OperationalPerformanceLogDTO>> getLogsByFactory(@PathVariable Long factoryId) {
        return ResponseEntity.ok(logService.getLogsByFactory(factoryId));
    }

    @GetMapping("/processes/{processId}/operational-logs")
    public ResponseEntity<List<OperationalPerformanceLogDTO>> getLogsByProcess(@PathVariable Long processId) {
        return ResponseEntity.ok(logService.getLogsByProcess(processId));
    }

    @PostMapping("/factories/{factoryId}/operational-logs")
    public ResponseEntity<OperationalPerformanceLogDTO> createLog(
            @PathVariable Long factoryId,
            @Valid @RequestBody OperationalPerformanceLogCreateRequest request) {
        return ResponseEntity.ok(logService.createLog(factoryId, request));
    }

    @PostMapping("/factories/{factoryId}/operational-logs/generate")
    public ResponseEntity<OperationalPerformanceLogDTO> generateMockActualLog(
            @PathVariable Long factoryId,
            @RequestParam Long simulationId) {
        return ResponseEntity.ok(logService.generateMockActualLog(factoryId, simulationId));
    }

    @DeleteMapping("/operational-logs/{id}")
    public ResponseEntity<Void> deleteLog(@PathVariable Long id) {
        logService.deleteLog(id);
        return ResponseEntity.noContent().build();
    }
}
