package com.frexsos.backend.repository;

import com.frexsos.backend.model.ProcessStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProcessStepRepository extends JpaRepository<ProcessStep, Long> {
    List<ProcessStep> findByProcessIdOrderByStepOrderAsc(Long processId);
}
