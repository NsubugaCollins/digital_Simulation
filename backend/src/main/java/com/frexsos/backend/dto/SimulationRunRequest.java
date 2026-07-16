package com.frexsos.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SimulationRunRequest {

    @NotNull(message = "Process ID is required")
    private Long processId;

    @NotNull(message = "Item count is required")
    @Min(value = 1, message = "Item count must be at least 1")
    @Max(value = 2000, message = "Item count cannot exceed 2000")
    private Integer itemCount;

    @Min(value = 1, message = "numLines must be at least 1")
    @Max(value = 8, message = "numLines cannot exceed 8")
    private int numLines = 1;

    private boolean shiftsEnabled = false;
}
