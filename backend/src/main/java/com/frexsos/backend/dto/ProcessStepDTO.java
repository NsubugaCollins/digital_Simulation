package com.frexsos.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessStepDTO {
    private Long id;
    private Long processId;
    private Integer stepOrder;
    private String name;
    private Double duration;
    private String resourceType; // MACHINE or ROBOT
    private Long resourceId;
    private String resourceName; // Looked up at serialization
}
