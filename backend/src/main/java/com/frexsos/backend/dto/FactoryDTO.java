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
public class FactoryDTO {
    private Long id;
    private String name;
    private String location;
    private LocalDateTime createdDate;
}
