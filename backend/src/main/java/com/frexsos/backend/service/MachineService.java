package com.frexsos.backend.service;

import com.frexsos.backend.dto.MachineDTO;
import com.frexsos.backend.model.Factory;
import com.frexsos.backend.model.Machine;
import com.frexsos.backend.repository.FactoryRepository;
import com.frexsos.backend.repository.MachineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MachineService {

    private final MachineRepository machineRepository;
    private final FactoryRepository factoryRepository;

    @Transactional(readOnly = true)
    public List<MachineDTO> getMachinesByFactory(Long factoryId) {
        return machineRepository.findByFactoryId(factoryId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public MachineDTO createMachine(Long factoryId, MachineDTO dto) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new IllegalArgumentException("Factory not found with id: " + factoryId));
        
        Machine machine = Machine.builder()
                .factory(factory)
                .name(dto.getName())
                .type(dto.getType())
                .manufacturer(dto.getManufacturer())
                .powerConsumption(dto.getPowerConsumption())
                .operatingSpeed(dto.getOperatingSpeed())
                .maintenanceInterval(dto.getMaintenanceInterval())
                .status(dto.getStatus() != null ? dto.getStatus() : "IDLE")
                .build();
        
        return convertToDTO(machineRepository.save(machine));
    }

    @Transactional
    public MachineDTO updateMachine(Long id, MachineDTO dto) {
        Machine machine = machineRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Machine not found with id: " + id));
        
        machine.setName(dto.getName());
        machine.setType(dto.getType());
        machine.setManufacturer(dto.getManufacturer());
        machine.setPowerConsumption(dto.getPowerConsumption());
        machine.setOperatingSpeed(dto.getOperatingSpeed());
        machine.setMaintenanceInterval(dto.getMaintenanceInterval());
        if (dto.getStatus() != null) {
            machine.setStatus(dto.getStatus());
        }
        
        return convertToDTO(machineRepository.save(machine));
    }

    @Transactional
    public void deleteMachine(Long id) {
        if (!machineRepository.existsById(id)) {
            throw new IllegalArgumentException("Machine not found with id: " + id);
        }
        machineRepository.deleteById(id);
    }

    private MachineDTO convertToDTO(Machine machine) {
        return MachineDTO.builder()
                .id(machine.getId())
                .factoryId(machine.getFactory().getId())
                .name(machine.getName())
                .type(machine.getType())
                .manufacturer(machine.getManufacturer())
                .powerConsumption(machine.getPowerConsumption())
                .operatingSpeed(machine.getOperatingSpeed())
                .maintenanceInterval(machine.getMaintenanceInterval())
                .status(machine.getStatus())
                .build();
    }
}
