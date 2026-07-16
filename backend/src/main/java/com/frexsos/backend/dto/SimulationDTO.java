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
public class SimulationDTO {
    private Long id;
    private Long factoryId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private String resultJson;
}
