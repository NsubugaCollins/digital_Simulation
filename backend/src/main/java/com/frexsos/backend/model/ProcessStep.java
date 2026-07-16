package com.frexsos.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "process_steps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "process_id", nullable = false)
    private ProductionProcess process;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double duration; // minutes

    @Column(name = "resource_type", nullable = false)
    private String resourceType; // "MACHINE" or "ROBOT"

    @Column(name = "resource_id", nullable = false)
    private Long resourceId; // References Machine ID or Robot ID
}
