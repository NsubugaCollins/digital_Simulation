package com.frexsos.backend.repository;

import com.frexsos.backend.model.Simulation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SimulationRepository extends JpaRepository<Simulation, Long> {
    List<Simulation> findByFactoryIdOrderByStartTimeDesc(Long factoryId);
}
