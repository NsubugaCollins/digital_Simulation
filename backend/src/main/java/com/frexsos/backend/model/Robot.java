package com.frexsos.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "robots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Robot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "factory_id", nullable = false)
    private Factory factory;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String model;

    private Double payload; // kg
 
    private Double accuracy; // mm
 
    private Double operatingSpeed;
 
    private Double powerConsumption;
 
    private Integer maintenanceInterval;
 
    @Column(nullable = false)
    private String status; // RUNNING, IDLE, DOWN
}
