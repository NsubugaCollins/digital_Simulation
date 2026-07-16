package com.frexsos.backend.controller;

import com.frexsos.backend.dto.MachineDTO;
import com.frexsos.backend.service.MachineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MachineController {

    private final MachineService machineService;

    @GetMapping("/factories/{factoryId}/machines")
    public ResponseEntity<List<MachineDTO>> getMachinesByFactory(@PathVariable Long factoryId) {
        return ResponseEntity.ok(machineService.getMachinesByFactory(factoryId));
    }

    @PostMapping("/factories/{factoryId}/machines")
    public ResponseEntity<MachineDTO> createMachine(@PathVariable Long factoryId, @RequestBody MachineDTO dto) {
        return ResponseEntity.ok(machineService.createMachine(factoryId, dto));
    }

    @PutMapping("/machines/{id}")
    public ResponseEntity<MachineDTO> updateMachine(@PathVariable Long id, @RequestBody MachineDTO dto) {
        return ResponseEntity.ok(machineService.updateMachine(id, dto));
    }

    @DeleteMapping("/machines/{id}")
    public ResponseEntity<Void> deleteMachine(@PathVariable Long id) {
        machineService.deleteMachine(id);
        return ResponseEntity.noContent().build();
    }
}
