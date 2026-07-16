package com.frexsos.backend.repository;

import com.frexsos.backend.model.Machine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MachineRepository extends JpaRepository<Machine, Long> {
    List<Machine> findByFactoryId(Long factoryId);
}
