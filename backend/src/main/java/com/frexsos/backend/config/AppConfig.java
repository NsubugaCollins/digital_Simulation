package com.frexsos.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    /**
     * Shared RestTemplate bean used by SimulationService and
     * PredictiveMaintenanceController to call the Python engine.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
