# Factory Simulation

Factory Simulation is a full-stack manufacturing simulation platform with:

- a React + TypeScript frontend
- a Spring Boot backend
- a Python/FastAPI simulation service
- PostgreSQL for persistent data

## Features

- factory design and process modeling
- simulation execution and comparison
- predictive maintenance workflows
- authentication and protected API access

## Prerequisites

- Docker
- Docker Compose
- Git

## Environment setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set secure values for:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `SIMULATION_API_KEY`

## Run the project

From the project root:

```bash
sudo docker-compose up -d --build
```

Then open the app in your browser:

- Frontend: http://localhost/
- Backend health check: http://localhost:8081/actuator/health

## Stop the project

```bash
sudo docker-compose down
```

## Project structure

- `frontend/` — React/Vite application
- `backend/` — Spring Boot REST API
- `simulation/` — Python simulation service
- `data/` — datasets used by the simulation workflow
- `docker-compose.yml` — container orchestration

## Notes

Large machine-learning model files and datasets are intentionally excluded from this repository to keep the project lightweight. If you need the full simulation functionality, add the required model artifacts and datasets locally before running the simulation services.
