package com.frexsos.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "machines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Machine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "factory_id", nullable = false)
    private Factory factory;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // e.g. CNC, Drill, Packager

    private String manufacturer;

    @Column(name = "power_consumption")
    private Double powerConsumption; // in kW

    @Column(name = "operating_speed")
    private Double operatingSpeed; // operations per min

    @Column(name = "maintenance_interval")
    private Integer maintenanceInterval; // hours

    @Column(nullable = false)
    private String status; // RUNNING, IDLE, DOWN
}
