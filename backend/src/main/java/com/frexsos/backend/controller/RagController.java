package com.frexsos.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Secure proxy controller for RAG (Retrieval-Augmented Generation) AI Copilot services.
 */
@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
@Slf4j
public class RagController {

    private final RestTemplate restTemplate;

    @Value("${simulation.service.url}")
    private String engineUrl;

    @Value("${simulation.api.key}")
    private String apiKey;

    @PostMapping("/query")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','MANAGER','TECHNICIAN')")
    public ResponseEntity<Object> queryRag(@RequestBody Map<String, Object> payload) {
        return proxyPost("/rag/query", payload);
    }

    @PostMapping("/diagnose")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','MANAGER','TECHNICIAN')")
    public ResponseEntity<Object> diagnoseRag(@RequestBody Map<String, Object> payload) {
        return proxyPost("/rag/diagnose", payload);
    }

    @PostMapping("/ingest")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER')")
    public ResponseEntity<Object> ingestKnowledge() {
        return proxyPost("/rag/ingest", null);
    }

    // Helper proxy methods matching PredictiveMaintenanceController
    private ResponseEntity<Object> proxyPost(String path, Object body) {
        HttpHeaders headers = createAuthHeaders();
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);
        try {
            return restTemplate.exchange(engineUrl + path, HttpMethod.POST, entity, Object.class);
        } catch (HttpClientErrorException e) {
            log.error("Simulation engine HTTP error [POST {}]: {} - {}", path, e.getStatusCode(), e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Failed to connect to simulation engine [POST {}]: {}", path, e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Simulation engine unavailable", "details", e.getMessage()));
        }
    }

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-KEY", apiKey);
        return headers;
    }
}
