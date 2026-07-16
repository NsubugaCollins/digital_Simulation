package com.frexsos.backend.controller;

import com.frexsos.backend.dto.FactoryDTO;
import com.frexsos.backend.service.FactoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/factories")
@RequiredArgsConstructor
public class FactoryController {

    private final FactoryService factoryService;

    @GetMapping
    public ResponseEntity<List<FactoryDTO>> getAllFactories() {
        return ResponseEntity.ok(factoryService.getAllFactories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FactoryDTO> getFactoryById(@PathVariable Long id) {
        return ResponseEntity.ok(factoryService.getFactoryById(id));
    }

    @PostMapping
    public ResponseEntity<FactoryDTO> createFactory(@RequestBody FactoryDTO dto) {
        return ResponseEntity.ok(factoryService.createFactory(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FactoryDTO> updateFactory(@PathVariable Long id, @RequestBody FactoryDTO dto) {
        return ResponseEntity.ok(factoryService.updateFactory(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFactory(@PathVariable Long id) {
        factoryService.deleteFactory(id);
        return ResponseEntity.noContent().build();
    }
}
