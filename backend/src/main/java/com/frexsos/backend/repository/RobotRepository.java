package com.frexsos.backend.repository;

import com.frexsos.backend.model.Robot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RobotRepository extends JpaRepository<Robot, Long> {
    List<Robot> findByFactoryId(Long factoryId);
}
