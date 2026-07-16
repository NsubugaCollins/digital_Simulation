package com.frexsos.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationalPerformanceLogDTO {
    private Long id;
    private Long factoryId;
    private Long processId;
    private String processName;
    private String name;
    private LocalDateTime runDate;
    private Integer itemCount;
    private Integer numLines;
    private Double totalDurationMinutes;
    private Double totalEnergyKWh;
    private Double avgCycleTimeMinutes;
    private String bottleneck;
    private String resultJson;
}
