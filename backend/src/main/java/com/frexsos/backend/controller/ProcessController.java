package com.frexsos.backend.controller;

import com.frexsos.backend.dto.ProcessStepDTO;
import com.frexsos.backend.dto.ProductionProcessDTO;
import com.frexsos.backend.service.ProcessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProcessController {

    private final ProcessService processService;

    @GetMapping("/factories/{factoryId}/processes")
    public ResponseEntity<List<ProductionProcessDTO>> getProcessesByFactory(@PathVariable Long factoryId) {
        return ResponseEntity.ok(processService.getProcessesByFactory(factoryId));
    }

    @GetMapping("/processes/{id}")
    public ResponseEntity<ProductionProcessDTO> getProcessById(@PathVariable Long id) {
        return ResponseEntity.ok(processService.getProcessById(id));
    }

    @PutMapping("/processes/{id}")
    public ResponseEntity<ProductionProcessDTO> updateProcess(@PathVariable Long id, @RequestBody ProductionProcessDTO dto) {
        return ResponseEntity.ok(processService.updateProcess(id, dto));
    }

    @PostMapping("/factories/{factoryId}/processes")
    public ResponseEntity<ProductionProcessDTO> createProcess(@PathVariable Long factoryId, @RequestBody ProductionProcessDTO dto) {
        return ResponseEntity.ok(processService.createProcess(factoryId, dto));
    }

    @DeleteMapping("/processes/{id}")
    public ResponseEntity<Void> deleteProcess(@PathVariable Long id) {
        processService.deleteProcess(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/processes/{processId}/steps")
    public ResponseEntity<ProcessStepDTO> addStepToProcess(@PathVariable Long processId, @RequestBody ProcessStepDTO dto) {
        return ResponseEntity.ok(processService.addStepToProcess(processId, dto));
    }

    @PutMapping("/processes/steps/{stepId}")
    public ResponseEntity<ProcessStepDTO> updateStep(@PathVariable Long stepId, @RequestBody ProcessStepDTO dto) {
        return ResponseEntity.ok(processService.updateStep(stepId, dto));
    }

    @DeleteMapping("/processes/steps/{stepId}")
    public ResponseEntity<Void> deleteStep(@PathVariable Long stepId) {
        processService.deleteStep(stepId);
        return ResponseEntity.noContent().build();
    }
}
