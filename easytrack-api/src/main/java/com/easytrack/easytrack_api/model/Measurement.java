
package com.easytrack.easytrack_api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "measurements")
public class Measurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String deviceId;
    private Integer heartRate;
    private Integer spo2;

    private LocalDateTime measuredAt;

    public Measurement() {
    }

    public Measurement(String deviceId, Integer heartRate, Integer spo2) {
        this.deviceId = deviceId;
        this.heartRate = heartRate;
        this.spo2 = spo2;
        this.measuredAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public Integer getHeartRate() {
        return heartRate;
    }

    public Integer getSpo2() {
        return spo2;
    }

    public LocalDateTime getMeasuredAt() {
        return measuredAt;
    }
}
