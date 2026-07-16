package com.frexsos.backend.controller;

import com.frexsos.backend.dto.RobotDTO;
import com.frexsos.backend.service.RobotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RobotController {

    private final RobotService robotService;

    @GetMapping("/factories/{factoryId}/robots")
    public ResponseEntity<List<RobotDTO>> getRobotsByFactory(@PathVariable Long factoryId) {
        return ResponseEntity.ok(robotService.getRobotsByFactory(factoryId));
    }

    @PostMapping("/factories/{factoryId}/robots")
    public ResponseEntity<RobotDTO> createRobot(@PathVariable Long factoryId, @RequestBody RobotDTO dto) {
        return ResponseEntity.ok(robotService.createRobot(factoryId, dto));
    }

    @PutMapping("/robots/{id}")
    public ResponseEntity<RobotDTO> updateRobot(@PathVariable Long id, @RequestBody RobotDTO dto) {
        return ResponseEntity.ok(robotService.updateRobot(id, dto));
    }

    @DeleteMapping("/robots/{id}")
    public ResponseEntity<Void> deleteRobot(@PathVariable Long id) {
        robotService.deleteRobot(id);
        return ResponseEntity.noContent().build();
    }
}
