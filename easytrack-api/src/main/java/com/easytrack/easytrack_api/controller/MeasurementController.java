
package com.easytrack.easytrack_api.controller;

import com.easytrack.easytrack_api.model.Measurement;
import com.easytrack.easytrack_api.repository.MeasurementRepository;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.List;

@CrossOrigin(origins = {
        "http://127.0.0.1:5500",
        "http://localhost:5500"
})
@RestController
@RequestMapping("/api/measurements")
public class MeasurementController {

    private final MeasurementRepository repository;

    public MeasurementController(MeasurementRepository repository) {
        this.repository = repository;
    }

    public record MeasurementRequest(
            String deviceId,
            Integer heartRate,
            Integer spo2
    ) {}

    @PostMapping
    public Measurement save(@RequestBody MeasurementRequest request) {

        if (request.deviceId() == null ||
                request.deviceId().isBlank() ||
                request.heartRate() == null ||
                request.heartRate() <= 0 ||
                request.heartRate() > 220 ||
                request.spo2() == null ||
                request.spo2() < 70 ||
                request.spo2() > 100) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Medicao invalida"
            );
        }

        Measurement measurement = new Measurement(
                request.deviceId(),
                request.heartRate(),
                request.spo2()
        );

        return repository.save(measurement);
    }

    @GetMapping
    public List<Measurement> getAll() {
        return repository.findAll();
    }
}
