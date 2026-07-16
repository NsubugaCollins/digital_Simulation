package com.frexsos.backend.repository;

import com.frexsos.backend.model.OperationalPerformanceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OperationalPerformanceLogRepository extends JpaRepository<OperationalPerformanceLog, Long> {
    List<OperationalPerformanceLog> findByFactoryIdOrderByRunDateDesc(Long factoryId);
    List<OperationalPerformanceLog> findByProcessIdOrderByRunDateDesc(Long processId);
}
