package com.frexsos.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "operational_performance_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationalPerformanceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "factory_id", nullable = false)
    private Factory factory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "process_id", nullable = false)
    private ProductionProcess process;

    @Column(nullable = false)
    private String name;

    @Column(name = "run_date", nullable = false)
    private LocalDateTime runDate;

    @Column(name = "item_count", nullable = false)
    private Integer itemCount;

    @Column(name = "num_lines", nullable = false)
    private Integer numLines;

    @Column(name = "total_duration_minutes", nullable = false)
    private Double totalDurationMinutes;

    @Column(name = "total_energy_kwh", nullable = false)
    private Double totalEnergyKWh;

    @Column(name = "avg_cycle_time_minutes", nullable = false)
    private Double avgCycleTimeMinutes;

    private String bottleneck;

    @Column(name = "result_json", columnDefinition = "TEXT")
    private String resultJson;
}
