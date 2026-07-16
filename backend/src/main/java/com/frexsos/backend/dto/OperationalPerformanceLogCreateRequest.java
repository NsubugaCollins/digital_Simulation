package com.frexsos.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OperationalPerformanceLogCreateRequest {

    @NotNull(message = "Process ID is required")
    private Long processId;

    @NotNull(message = "Log name is required")
    private String name;

    @NotNull(message = "Item count is required")
    private Integer itemCount;

    @NotNull(message = "Number of lines is required")
    private Integer numLines;

    @NotNull(message = "Total duration in minutes is required")
    private Double totalDurationMinutes;

    @NotNull(message = "Total energy in kWh is required")
    private Double totalEnergyKWh;

    @NotNull(message = "Average cycle time in minutes is required")
    private Double avgCycleTimeMinutes;

    private String bottleneck;

    private String resultJson;
}
