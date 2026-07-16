package com.frexsos.backend.service;

import com.frexsos.backend.dto.RobotDTO;
import com.frexsos.backend.model.Factory;
import com.frexsos.backend.model.Robot;
import com.frexsos.backend.repository.FactoryRepository;
import com.frexsos.backend.repository.RobotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RobotService {

    private final RobotRepository robotRepository;
    private final FactoryRepository factoryRepository;

    @Transactional(readOnly = true)
    public List<RobotDTO> getRobotsByFactory(Long factoryId) {
        return robotRepository.findByFactoryId(factoryId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public RobotDTO createRobot(Long factoryId, RobotDTO dto) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new IllegalArgumentException("Factory not found with id: " + factoryId));
        
        Robot robot = Robot.builder()
                .factory(factory)
                .name(dto.getName())
                .model(dto.getModel())
                .payload(dto.getPayload())
                .accuracy(dto.getAccuracy())
                .operatingSpeed(dto.getOperatingSpeed())
                .powerConsumption(dto.getPowerConsumption())
                .maintenanceInterval(dto.getMaintenanceInterval())
                .status(dto.getStatus() != null ? dto.getStatus() : "IDLE")
                .build();
        
        return convertToDTO(robotRepository.save(robot));
    }

    @Transactional
    public RobotDTO updateRobot(Long id, RobotDTO dto) {
        Robot robot = robotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Robot not found with id: " + id));
        
        robot.setName(dto.getName());
        robot.setModel(dto.getModel());
        robot.setPayload(dto.getPayload());
        robot.setAccuracy(dto.getAccuracy());
        robot.setOperatingSpeed(dto.getOperatingSpeed());
        robot.setPowerConsumption(dto.getPowerConsumption());
        robot.setMaintenanceInterval(dto.getMaintenanceInterval());
        if (dto.getStatus() != null) {
            robot.setStatus(dto.getStatus());
        }
        
        return convertToDTO(robotRepository.save(robot));
    }

    @Transactional
    public void deleteRobot(Long id) {
        if (!robotRepository.existsById(id)) {
            throw new IllegalArgumentException("Robot not found with id: " + id);
        }
        robotRepository.deleteById(id);
    }

    private RobotDTO convertToDTO(Robot robot) {
        return RobotDTO.builder()
                .id(robot.getId())
                .factoryId(robot.getFactory().getId())
                .name(robot.getName())
                .model(robot.getModel())
                .payload(robot.getPayload())
                .accuracy(robot.getAccuracy())
                .operatingSpeed(robot.getOperatingSpeed())
                .powerConsumption(robot.getPowerConsumption())
                .maintenanceInterval(robot.getMaintenanceInterval())
                .status(robot.getStatus())
                .build();
    }
}
