# Render deployment

This project can be deployed on Render using the included render.yaml file.

## Services

- Backend: frex-backend
- Simulation: frex-simulation
- Frontend: frex-frontend
- Database: frex-postgres

## Notes

- The backend uses the Render-assigned PORT environment variable.
- The frontend expects the backend API URL via VITE_API_BASE_URL.
- The simulation service needs a SIMULATION_API_KEY and CORS origins.
- The backend uses the Render PostgreSQL connection string for Spring Boot.

## Deploy

1. Create a new Render account.
2. Connect this repository.
3. Render will detect render.yaml and create the services automatically.
4. Confirm the environment variables and public URLs after deployment.
