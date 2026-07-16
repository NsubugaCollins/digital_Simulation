package com.frexsos.backend.service;

import com.frexsos.backend.dto.ProcessStepDTO;
import com.frexsos.backend.dto.ProductionProcessDTO;
import com.frexsos.backend.model.Factory;
import com.frexsos.backend.model.ProcessStep;
import com.frexsos.backend.model.ProductionProcess;
import com.frexsos.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProcessService {

    private final ProductionProcessRepository processRepository;
    private final ProcessStepRepository stepRepository;
    private final FactoryRepository factoryRepository;
    private final MachineRepository machineRepository;
    private final RobotRepository robotRepository;

    @Transactional(readOnly = true)
    public List<ProductionProcessDTO> getProcessesByFactory(Long factoryId) {
        return processRepository.findByFactoryId(factoryId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductionProcessDTO getProcessById(Long id) {
        ProductionProcess process = processRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Process not found with id: " + id));
        return convertToDTO(process);
    }

    @Transactional
    public ProductionProcessDTO createProcess(Long factoryId, ProductionProcessDTO dto) {
        Factory factory = factoryRepository.findById(factoryId)
                .orElseThrow(() -> new IllegalArgumentException("Factory not found with id: " + factoryId));
        
        ProductionProcess process = ProductionProcess.builder()
                .factory(factory)
                .name(dto.getName())
                .build();
        
        ProductionProcess saved = processRepository.save(process);
        return convertToDTO(saved);
    }

    @Transactional
    public void deleteProcess(Long id) {
        if (!processRepository.existsById(id)) {
            throw new IllegalArgumentException("Process not found with id: " + id);
        }
        processRepository.deleteById(id);
    }

    @Transactional
    public ProductionProcessDTO updateProcess(Long id, ProductionProcessDTO dto) {
        ProductionProcess process = processRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Process not found with id: " + id));
        process.setName(dto.getName());
        return convertToDTO(processRepository.save(process));
    }

    @Transactional
    public ProcessStepDTO addStepToProcess(Long processId, ProcessStepDTO dto) {
        ProductionProcess process = processRepository.findById(processId)
                .orElseThrow(() -> new IllegalArgumentException("Process not found with id: " + processId));

        // Validate resource exists
        validateResource(dto.getResourceType(), dto.getResourceId());

        ProcessStep step = ProcessStep.builder()
                .process(process)
                .stepOrder(dto.getStepOrder())
                .name(dto.getName())
                .duration(dto.getDuration())
                .resourceType(dto.getResourceType())
                .resourceId(dto.getResourceId())
                .build();

        return convertStepToDTO(stepRepository.save(step));
    }

    @Transactional
    public ProcessStepDTO updateStep(Long stepId, ProcessStepDTO dto) {
        ProcessStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new IllegalArgumentException("Process step not found with id: " + stepId));

        validateResource(dto.getResourceType(), dto.getResourceId());

        step.setName(dto.getName());
        step.setStepOrder(dto.getStepOrder());
        step.setDuration(dto.getDuration());
        step.setResourceType(dto.getResourceType());
        step.setResourceId(dto.getResourceId());

        return convertStepToDTO(stepRepository.save(step));
    }

    @Transactional
    public void deleteStep(Long stepId) {
        if (!stepRepository.existsById(stepId)) {
            throw new IllegalArgumentException("Process step not found with id: " + stepId);
        }
        stepRepository.deleteById(stepId);
    }

    private void validateResource(String resourceType, Long resourceId) {
        if ("MACHINE".equalsIgnoreCase(resourceType)) {
            if (!machineRepository.existsById(resourceId)) {
                throw new IllegalArgumentException("Machine not found with id: " + resourceId);
            }
        } else if ("ROBOT".equalsIgnoreCase(resourceType)) {
            if (!robotRepository.existsById(resourceId)) {
                throw new IllegalArgumentException("Robot not found with id: " + resourceId);
            }
        } else {
            throw new IllegalArgumentException("Invalid resource type. Must be MACHINE or ROBOT");
        }
    }

    private ProductionProcessDTO convertToDTO(ProductionProcess process) {
        List<ProcessStepDTO> stepDTOs = stepRepository.findByProcessIdOrderByStepOrderAsc(process.getId()).stream()
                .map(this::convertStepToDTO)
                .collect(Collectors.toList());

        return ProductionProcessDTO.builder()
                .id(process.getId())
                .factoryId(process.getFactory().getId())
                .name(process.getName())
                .steps(stepDTOs)
                .build();
    }

    private ProcessStepDTO convertStepToDTO(ProcessStep step) {
        String resourceName = "Unknown Resource";
        if ("MACHINE".equalsIgnoreCase(step.getResourceType())) {
            resourceName = machineRepository.findById(step.getResourceId())
                    .map(m -> m.getName() + " (" + m.getType() + ")")
                    .orElse("Unknown Machine");
        } else if ("ROBOT".equalsIgnoreCase(step.getResourceType())) {
            resourceName = robotRepository.findById(step.getResourceId())
                    .map(r -> r.getName() + " (" + r.getModel() + ")")
                    .orElse("Unknown Robot");
        }

        return ProcessStepDTO.builder()
                .id(step.getId())
                .processId(step.getProcess().getId())
                .stepOrder(step.getStepOrder())
                .name(step.getName())
                .duration(step.getDuration())
                .resourceType(step.getResourceType())
                .resourceId(step.getResourceId())
                .resourceName(resourceName)
                .build();
    }
}
