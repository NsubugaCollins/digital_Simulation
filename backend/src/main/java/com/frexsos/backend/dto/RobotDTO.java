package com.frexsos.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RobotDTO {
    private Long id;
    private Long factoryId;

    @NotBlank(message = "Robot name is required")
    private String name;

    @NotBlank(message = "Robot model is required")
    private String model;

    @Positive(message = "Payload must be positive")
    private Double payload;

    @Positive(message = "Accuracy must be positive")
    private Double accuracy;

    @Positive(message = "Operating speed must be positive")
    private Double operatingSpeed;

    @Positive(message = "Power consumption must be positive")
    private Double powerConsumption;

    private Integer maintenanceInterval;
    private String status;
}
