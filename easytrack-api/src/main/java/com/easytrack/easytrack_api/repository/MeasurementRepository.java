
package com.easytrack.easytrack_api.repository;

import com.easytrack.easytrack_api.model.Measurement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeasurementRepository
        extends JpaRepository<Measurement, Long> {
}
