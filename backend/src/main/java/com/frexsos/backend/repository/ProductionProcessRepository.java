package com.frexsos.backend.repository;

import com.frexsos.backend.model.ProductionProcess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductionProcessRepository extends JpaRepository<ProductionProcess, Long> {
    List<ProductionProcess> findByFactoryId(Long factoryId);
}
