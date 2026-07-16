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
 * Secure proxy controller that forwards predictive maintenance requests to
 * the Python simulation engine, injecting the internal API key so the
 * engine is never exposed directly to the browser.
 */
@RestController
@RequestMapping("/api/predictive")
@RequiredArgsConstructor
@Slf4j
public class PredictiveMaintenanceController {

    private final RestTemplate restTemplate;

    @Value("${simulation.service.url}")
    private String engineUrl;

    @Value("${simulation.api.key}")
    private String apiKey;

    // -----------------------------------------------------------------------
    // Training status
    // -----------------------------------------------------------------------

    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','MANAGER','TECHNICIAN')")
    public ResponseEntity<Object> getTrainingStatus() {
        return proxyGet("/train/status");
    }

    // -----------------------------------------------------------------------
    // AI4I 2020 — machine failure classification
    // -----------------------------------------------------------------------

    @PostMapping("/train/classification")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER')")
    public ResponseEntity<Object> trainClassification() {
        return proxyPost("/train", null);
    }

    @GetMapping("/metrics/classification")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','MANAGER')")
    public ResponseEntity<Object> getClassificationMetrics() {
        return proxyGet("/predictive-maintenance/metrics");
    }

    @PostMapping("/predict/failure")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','TECHNICIAN')")
    public ResponseEntity<Object> predictFailure(@RequestBody Map<String, Object> payload) {
        return proxyPost("/predict", payload);
    }

    // -----------------------------------------------------------------------
    // C-MAPSS — Remaining Useful Life (RUL)
    // -----------------------------------------------------------------------

    @PostMapping("/train/rul")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER')")
    public ResponseEntity<Object> trainRul() {
        return proxyPost("/train/rul", null);
    }

    @GetMapping("/metrics/rul")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','MANAGER')")
    public ResponseEntity<Object> getRulMetrics() {
        return proxyGet("/predictive-maintenance/rul/metrics");
    }

    @PostMapping("/predict/rul")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','TECHNICIAN')")
    public ResponseEntity<Object> predictRul(@RequestBody Map<String, Object> payload) {
        return proxyPost("/predict/rul", payload);
    }

    // -----------------------------------------------------------------------
    // SECOM — wafer defect detection
    // -----------------------------------------------------------------------

    @PostMapping("/train/secom")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER')")
    public ResponseEntity<Object> trainSecom() {
        return proxyPost("/train/secom", null);
    }

    @GetMapping("/metrics/secom")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','MANAGER')")
    public ResponseEntity<Object> getSecomMetrics() {
        return proxyGet("/predictive-maintenance/secom/metrics");
    }

    @PostMapping("/predict/secom")
    @PreAuthorize("hasAnyRole('ADMIN','ENGINEER','TECHNICIAN')")
    public ResponseEntity<Object> predictSecom(
            @RequestBody Map<String, Object> payload,
            @RequestParam(defaultValue = "balanced") String mode) {
        String url = engineUrl + "/predict/secom?mode=" + mode;
        return proxyPostUrl(url, payload);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-Key", apiKey);
        return headers;
    }

    private ResponseEntity<Object> proxyGet(String path) {
        try {
            String url = engineUrl + path;
            log.debug("Proxying GET {}", url);
            ResponseEntity<Object> resp = restTemplate.exchange(
                    url, HttpMethod.GET,
                    new HttpEntity<>(buildHeaders()),
                    Object.class);
            return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
        } catch (HttpClientErrorException ex) {
            log.warn("Engine returned {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Proxy GET failed for path {}: {}", path, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Engine unavailable: " + ex.getMessage()));
        }
    }

    private ResponseEntity<Object> proxyPost(String path, Object body) {
        return proxyPostUrl(engineUrl + path, body);
    }

    private ResponseEntity<Object> proxyPostUrl(String url, Object body) {
        try {
            log.debug("Proxying POST {}", url);
            HttpEntity<Object> entity = new HttpEntity<>(body, buildHeaders());
            ResponseEntity<Object> resp = restTemplate.exchange(
                    url, HttpMethod.POST, entity, Object.class);
            return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
        } catch (HttpClientErrorException ex) {
            log.warn("Engine returned {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Proxy POST failed for url {}: {}", url, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Engine unavailable: " + ex.getMessage()));
        }
    }
}
