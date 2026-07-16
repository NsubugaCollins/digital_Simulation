package com.frexsos.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SimulationCompareRequest {

    @NotNull(message = "processId is required")
    private Long processId;

    @Min(value = 1, message = "baselineItems must be at least 1")
    @Max(value = 2000, message = "baselineItems cannot exceed 2000")
    private int baselineItems = 50;

    @Min(value = 1, message = "scenarioItems must be at least 1")
    @Max(value = 2000, message = "scenarioItems cannot exceed 2000")
    private int scenarioItems = 50;

    @Min(value = 1, message = "baselineLines must be at least 1")
    @Max(value = 8, message = "baselineLines cannot exceed 8")
    private int baselineLines = 1;

    @Min(value = 1, message = "scenarioLines must be at least 1")
    @Max(value = 8, message = "scenarioLines cannot exceed 8")
    private int scenarioLines = 1;

    private boolean shiftsEnabled = false;
}
