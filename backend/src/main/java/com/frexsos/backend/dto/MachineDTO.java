package com.frexsos.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MachineDTO {
    private Long id;
    private Long factoryId;

    @NotBlank(message = "Machine name is required")
    private String name;

    @NotBlank(message = "Machine type is required")
    private String type;

    private String manufacturer;

    @NotNull(message = "Power consumption is required")
    @Positive(message = "Power consumption must be positive")
    private Double powerConsumption;

    @NotNull(message = "Operating speed is required")
    @Positive(message = "Operating speed must be positive")
    private Double operatingSpeed;

    @NotNull(message = "Maintenance interval is required")
    @Min(value = 1, message = "Maintenance interval must be at least 1")
    private Integer maintenanceInterval;

    private String status;
}
