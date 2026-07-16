package com.frexsos.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionProcessDTO {
    private Long id;
    private Long factoryId;
    private String name;
    private List<ProcessStepDTO> steps;
}
