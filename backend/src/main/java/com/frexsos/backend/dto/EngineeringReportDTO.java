package com.frexsos.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EngineeringReportDTO {
    private Long simulationId;
    private Long factoryId;
    private String factoryName;
    private String factoryLocation;
    private Long processId;
    private String processName;
    private LocalDateTime generatedDate;
    private String generatedBy;

    // Simulation Metadata
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer itemCount;
    private Integer numLines;
    private Boolean shiftsEnabled;

    // Simulation Performance KPIs
    private Double totalDurationMinutes;
    private Double productionCapacityHourly;
    private Double totalEnergyKWh;
    private Double avgCycleTimeMinutes;
    private Double minCycleTimeMinutes;
    private Double maxCycleTimeMinutes;
    private String bottleneck;

    // Sustainability & Costing
    private Double utilityCostUSD;
    private Double carbonFootprintCO2Kg;

    // Process Steps
    private List<Map<String, Object>> steps;

    // Resource Metrics
    private List<Map<String, Object>> resourceMetrics;

    // Predictive Maintenance Risk Warnings
    private List<Map<String, Object>> maintenanceWarnings;

    // AI Optimization Savings (if optimization was run/available)
    private Double optimizedCostSavingsPercent;
    private Double optimizedCostUSD;
    private List<Map<String, Object>> optimizationRecommendations;
}
