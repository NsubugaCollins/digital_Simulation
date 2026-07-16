from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sim_engine import FactorySimulation
from optimizer import GeneticOptimizer
from contextlib import asynccontextmanager
import uvicorn
import logging
import os
import joblib

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("frex-sim-service")

# ---------------------------------------------------------------------------
# Predictive Maintenance Model Configuration
# ---------------------------------------------------------------------------
MODEL_PATH = "simulation/predictive_model.joblib"
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = "predictive_model.joblib"

model_package = None

def load_model():
    global model_package
    if os.path.exists(MODEL_PATH):
        try:
            model_package = joblib.load(MODEL_PATH)
            logger.info("Successfully loaded predictive maintenance model package.")
        except Exception as e:
            logger.error("Failed to load predictive maintenance model: %s", e)
            model_package = None
    else:
        logger.warning("Predictive maintenance model file not found at %s. Please run training first.", MODEL_PATH)
        model_package = None

CMAPSS_MODEL_PATH = "simulation/cmapss_models.joblib"
if not os.path.exists(CMAPSS_MODEL_PATH):
    CMAPSS_MODEL_PATH = "cmapss_models.joblib"

cmapss_model_package = None

def load_cmapss_model():
    global cmapss_model_package
    if os.path.exists(CMAPSS_MODEL_PATH):
        try:
            cmapss_model_package = joblib.load(CMAPSS_MODEL_PATH)
            logger.info("Successfully loaded C-MAPSS RUL model package.")
        except Exception as e:
            logger.error("Failed to load C-MAPSS RUL model: %s", e)
            cmapss_model_package = None
    else:
        logger.warning("C-MAPSS RUL model file not found at %s. Please run C-MAPSS training first.", CMAPSS_MODEL_PATH)
        cmapss_model_package = None

SECOM_MODEL_PATH = "simulation/secom_model.joblib"
if not os.path.exists(SECOM_MODEL_PATH):
    SECOM_MODEL_PATH = "secom_model.joblib"

secom_model_package = None

def load_secom_model():
    global secom_model_package
    if os.path.exists(SECOM_MODEL_PATH):
        try:
            secom_model_package = joblib.load(SECOM_MODEL_PATH)
            logger.info("Successfully loaded SECOM defect prediction model package.")
        except Exception as e:
            logger.error("Failed to load SECOM model: %s", e)
            secom_model_package = None
    else:
        logger.warning("SECOM model file not found at %s. Please run SECOM training first.", SECOM_MODEL_PATH)
        secom_model_package = None

# ---------------------------------------------------------------------------
# Lifespan and Security Config
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load ML models
    load_model()
    load_cmapss_model()
    load_secom_model()
    yield

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)
SIMULATION_API_KEY = os.environ.get("SIMULATION_API_KEY", "default-sim-api-key")

async def verify_api_key(api_key: Optional[str] = Depends(api_key_header)):
    if not api_key:
        logger.warning("Request missing X-API-Key header.")
        raise HTTPException(status_code=401, detail="X-API-Key header is missing")
    if api_key != SIMULATION_API_KEY:
        logger.warning("Unauthorized request with invalid X-API-Key.")
        raise HTTPException(status_code=403, detail="Invalid X-API-Key")
    return api_key

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="FREX-SOS Simulation & Optimization Engine",
    description=(
        "Python-based SimPy Discrete-Event Simulation and Genetic Algorithm "
        "Optimization Service for the FREX-SOS Digital Twin Platform."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# Allow the Spring Boot backend (and local dev React) to call this service
allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = [orig.strip() for orig in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    type: str = Field(..., description="Product type (L, M, H)")
    airTemperature: float = Field(..., description="Air temperature in Kelvin")
    processTemperature: float = Field(..., description="Process temperature in Kelvin")
    rotationalSpeed: float = Field(..., description="Rotational speed in rpm")
    torque: float = Field(..., description="Torque in Nm")
    toolWear: float = Field(..., description="Tool wear in minutes")


class PredictResponse(BaseModel):
    machineFailurePredicted: bool
    machineFailureProbability: float
    failureModesPredicted: Dict[str, bool]
    failureModesProbability: Dict[str, float]


class RulPredictRequest(BaseModel):
    subset: str = Field(..., description="C-MAPSS subset (FD001, FD002, FD003, FD004)")
    setting1: float
    setting2: float
    setting3: float
    sensor1: float
    sensor2: float
    sensor3: float
    sensor4: float
    sensor5: float
    sensor6: float
    sensor7: float
    sensor8: float
    sensor9: float
    sensor10: float
    sensor11: float
    sensor12: float
    sensor13: float
    sensor14: float
    sensor15: float
    sensor16: float
    sensor17: float
    sensor18: float
    sensor19: float
    sensor20: float
    sensor21: float


class RulPredictResponse(BaseModel):
    subset: str
    predictedRUL: float


class SecomPredictRequest(BaseModel):
    sensors: List[Optional[float]] = Field(
        ...,
        description="Array of exactly 590 sensor readings. Pass null for missing sensors.",
        min_length=590,
        max_length=590,
    )


class SecomPredictResponse(BaseModel):
    defectPredicted: bool
    defectProbability: float
    nFeaturesUsed: int
    mode: str
    thresholdUsed: float


class StepInput(BaseModel):
    stepOrder: int
    name: str
    duration: float = Field(..., description="Duration in minutes at rated speed")
    resourceType: str = Field(..., description="MACHINE or ROBOT")
    resourceId: int
    resourceName: Optional[str] = "Unknown"
    operatingSpeed: Optional[float] = 1.0
    powerConsumption: Optional[float] = 5.0   # kW
    maintenanceInterval: Optional[int] = 100  # hours


class ShiftConfig(BaseModel):
    name: str
    start: int = Field(..., description="Start time in minutes from day start (0 = midnight)")
    end: int   = Field(..., description="End time in minutes from day start")


class SimulateRequest(BaseModel):
    simulationId: int
    itemCount: int = Field(..., ge=1, le=2000, description="Number of items to produce")
    processName: str
    steps: List[StepInput]
    numLines: Optional[int] = Field(default=1, ge=1, le=8, description="Number of parallel production lines")
    shiftsEnabled: Optional[bool] = False
    shiftConfig: Optional[List[ShiftConfig]] = None


class ScenarioSimulateRequest(BaseModel):
    """Two configurations compared side-by-side."""
    processName: str
    steps: List[StepInput]
    # Baseline
    baselineItems: int = Field(..., ge=1, le=2000)
    baselineLines: Optional[int] = Field(default=1, ge=1, le=8)
    # Scenario
    scenarioItems: int = Field(..., ge=1, le=2000)
    scenarioLines: Optional[int] = Field(default=1, ge=1, le=8)
    shiftsEnabled: Optional[bool] = False


class OptimizeRequest(BaseModel):
    processId: int
    processName: str
    steps: List[StepInput]


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _run_sim(item_count: int, steps: list, num_lines: int,
             shifts_enabled: bool, shift_config) -> dict:
    """Helper to create and run a FactorySimulation, returning its results."""
    shift_list = [s.model_dump() for s in shift_config] if shift_config else None
    sim = FactorySimulation(
        item_count=item_count,
        steps=steps,
        num_lines=num_lines,
        shifts_enabled=shifts_enabled,
        shift_config=shift_list,
    )
    return sim.run()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def read_root():
    return {
        "status": "ONLINE",
        "service": "FREX-SOS Python Engine",
        "version": "2.0.0",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Spring Boot can poll this to verify the Python service is up."""
    return {"status": "UP", "service": "frex-sim-engine"}


@app.post("/simulate", tags=["Simulation"], dependencies=[Depends(verify_api_key)])
def run_simulation(request: SimulateRequest):
    logger.info(
        "Simulation #%d — items: %d, lines: %d, steps: %d",
        request.simulationId, request.itemCount, request.numLines or 1, len(request.steps),
    )
    try:
        steps_dict = [step.model_dump() for step in request.steps]
        results = _run_sim(
            item_count=request.itemCount,
            steps=steps_dict,
            num_lines=request.numLines or 1,
            shifts_enabled=request.shiftsEnabled or False,
            shift_config=request.shiftConfig,
        )
        logger.info(
            "Simulation #%d complete — %.1f min, %.2f items/hr, bottleneck: %s",
            request.simulationId,
            results["totalSimulationTimeMinutes"],
            results["productionCapacityHourly"],
            results["bottleneck"],
        )
        return results
    except Exception as exc:
        logger.error("Simulation #%d failed: %s", request.simulationId, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation failed: {exc}")


@app.post("/simulate/scenario", tags=["Simulation"], dependencies=[Depends(verify_api_key)])
def run_scenario_comparison(request: ScenarioSimulateRequest):
    """
    Run two simulation configurations and return a side-by-side comparison.
    """
    logger.info(
        "Scenario comparison — baseline: %d items × %d lines | scenario: %d items × %d lines",
        request.baselineItems, request.baselineLines or 1,
        request.scenarioItems, request.scenarioLines or 1,
    )
    try:
        steps_dict = [step.model_dump() for step in request.steps]

        baseline = _run_sim(
            item_count=request.baselineItems,
            steps=steps_dict,
            num_lines=request.baselineLines or 1,
            shifts_enabled=request.shiftsEnabled or False,
            shift_config=None,
        )
        scenario = _run_sim(
            item_count=request.scenarioItems,
            steps=steps_dict,
            num_lines=request.scenarioLines or 1,
            shifts_enabled=request.shiftsEnabled or False,
            shift_config=None,
        )

        # Compute deltas (positive = scenario is better where "lower is better")
        def pct_delta(base_val, scen_val, lower_is_better=True):
            if base_val == 0:
                return 0.0
            delta = (scen_val - base_val) / base_val * 100.0
            return round(-delta if lower_is_better else delta, 2)

        comparison = {
            "baseline": baseline,
            "scenario": scenario,
            "deltas": {
                "totalSimulationTimeDeltaPct": pct_delta(
                    baseline["totalSimulationTimeMinutes"],
                    scenario["totalSimulationTimeMinutes"],
                    lower_is_better=True,
                ),
                "throughputDeltaPct": pct_delta(
                    baseline["productionCapacityHourly"],
                    scenario["productionCapacityHourly"],
                    lower_is_better=False,
                ),
                "energyDeltaPct": pct_delta(
                    baseline["totalEnergyKWh"],
                    scenario["totalEnergyKWh"],
                    lower_is_better=True,
                ),
                "avgCycleTimeDeltaPct": pct_delta(
                    baseline["avgCycleTimeMinutes"],
                    scenario["avgCycleTimeMinutes"],
                    lower_is_better=True,
                ),
            },
        }

        logger.info("Scenario comparison complete.")
        return comparison

    except Exception as exc:
        logger.error("Scenario comparison failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scenario comparison failed: {exc}")


@app.post("/optimize", tags=["Optimization"], dependencies=[Depends(verify_api_key)])
def run_optimization(request: OptimizeRequest):
    logger.info("Optimization request — process #%d (%s)", request.processId, request.processName)
    try:
        steps_dict = [step.model_dump() for step in request.steps]
        optimizer = GeneticOptimizer(steps=steps_dict)
        results = optimizer.optimize()
        logger.info(
            "Optimization complete — cost saving: %.1f%%",
            results.get("costSavingPercent", 0),
        )
        return results
    except Exception as exc:
        logger.error("Optimization failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Optimization failed: {exc}")


# ---------------------------------------------------------------------------
# Predictive Maintenance Endpoints & Events
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Background Training Tasks & Status
# ---------------------------------------------------------------------------
training_status = {
    "classification": {"status": "IDLE", "metrics": None, "error": None},
    "rul": {"status": "IDLE", "metrics": None, "error": None},
    "secom": {"status": "IDLE", "metrics": None, "error": None}
}

def run_training_classification():
    global model_package
    try:
        from train_model import train_predictive_maintenance_model
        metrics = train_predictive_maintenance_model()
        load_model()
        training_status["classification"]["status"] = "SUCCESS"
        training_status["classification"]["metrics"] = metrics
    except Exception as e:
        logger.error("Failed to train classification model: %s", e, exc_info=True)
        training_status["classification"]["status"] = "FAILED"
        training_status["classification"]["error"] = str(e)

def run_training_rul():
    global cmapss_model_package
    try:
        from train_cmapss import train_cmapss_models
        metrics = train_cmapss_models()
        load_cmapss_model()
        training_status["rul"]["status"] = "SUCCESS"
        training_status["rul"]["metrics"] = metrics
    except Exception as e:
        logger.error("Failed to train RUL models: %s", e, exc_info=True)
        training_status["rul"]["status"] = "FAILED"
        training_status["rul"]["error"] = str(e)

def run_training_secom():
    global secom_model_package
    try:
        from train_secom import train_secom_model
        metrics = train_secom_model()
        load_secom_model()
        training_status["secom"]["status"] = "SUCCESS"
        training_status["secom"]["metrics"] = metrics
    except Exception as e:
        logger.error("Failed to train SECOM model: %s", e, exc_info=True)
        training_status["secom"]["status"] = "FAILED"
        training_status["secom"]["error"] = str(e)


# ---------------------------------------------------------------------------
# Predictive Maintenance Endpoints & Events
# ---------------------------------------------------------------------------

@app.post("/predict", response_model=PredictResponse, tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def predict_failure(request: PredictRequest):
    global model_package
    if model_package is None:
        raise HTTPException(
            status_code=503,
            detail="Predictive model is not loaded. Please train the model first by POSTing to /train."
        )
    
    prod_type = request.type.upper()
    type_map = model_package.get("type_mapping", {"L": 0, "M": 1, "H": 2})
    if prod_type not in type_map:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid product type: {request.type}. Must be one of L, M, H."
        )
        
    type_val = type_map[prod_type]
    
    import pandas as pd
    features = pd.DataFrame([{
        "Type": type_val,
        "Air temperature [K]": request.airTemperature,
        "Process temperature [K]": request.processTemperature,
        "Rotational speed [rpm]": request.rotationalSpeed,
        "Torque [Nm]": request.torque,
        "Tool wear [min]": request.toolWear
    }])
    
    models = model_package["models"]
    
    # Predict general failure
    failure_model = models["Machine failure"]
    failure_pred = bool(failure_model.predict(features)[0])
    failure_prob = float(failure_model.predict_proba(features)[0][1])
    
    # Predict individual failure modes
    failure_modes_pred = {}
    failure_modes_prob = {}
    
    for col in ["TWF", "HDF", "PWF", "OSF", "RNF"]:
        clf = models[col]
        pred = bool(clf.predict(features)[0])
        prob = float(clf.predict_proba(features)[0][1])
        failure_modes_pred[col] = pred
        failure_modes_prob[col] = prob
        
    return PredictResponse(
        machineFailurePredicted=failure_pred,
        machineFailureProbability=round(failure_prob, 4),
        failureModesPredicted=failure_modes_pred,
        failureModesProbability={k: round(v, 4) for k, v in failure_modes_prob.items()}
    )


@app.post("/train", tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def train_model(background_tasks: BackgroundTasks):
    logger.info("Triggering background model training for AI4I 2020 Predictive Maintenance dataset...")
    if training_status["classification"]["status"] == "RUNNING":
        return {"status": "RUNNING", "message": "Training already in progress."}
    training_status["classification"]["status"] = "RUNNING"
    training_status["classification"]["error"] = None
    background_tasks.add_task(run_training_classification)
    return {"status": "TRAINING_STARTED", "message": "Model training triggered in background."}


@app.get("/predictive-maintenance/metrics", tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def get_model_metrics():
    global model_package
    if model_package is None:
        return {
            "status": "NOT_LOADED",
            "message": "No model is currently loaded. Please train the model by POSTing to /train."
        }
    return {
        "status": "LOADED",
        "features": model_package.get("features", []),
        "metrics": model_package.get("metrics", {})
    }


@app.post("/predict/rul", response_model=RulPredictResponse, tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def predict_rul(request: RulPredictRequest):
    global cmapss_model_package
    if cmapss_model_package is None:
        raise HTTPException(
            status_code=503,
            detail="C-MAPSS RUL model package is not loaded. Please train the model first by POSTing to /train/rul."
        )
    
    sub = request.subset.upper()
    models = cmapss_model_package.get("models", {})
    if sub not in models:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid subset '{request.subset}'. Available models are: {list(models.keys())}"
        )
        
    model = models[sub]
    
    import pandas as pd
    features = pd.DataFrame([{
        "setting1": request.setting1,
        "setting2": request.setting2,
        "setting3": request.setting3,
        "sensor1": request.sensor1,
        "sensor2": request.sensor2,
        "sensor3": request.sensor3,
        "sensor4": request.sensor4,
        "sensor5": request.sensor5,
        "sensor6": request.sensor6,
        "sensor7": request.sensor7,
        "sensor8": request.sensor8,
        "sensor9": request.sensor9,
        "sensor10": request.sensor10,
        "sensor11": request.sensor11,
        "sensor12": request.sensor12,
        "sensor13": request.sensor13,
        "sensor14": request.sensor14,
        "sensor15": request.sensor15,
        "sensor16": request.sensor16,
        "sensor17": request.sensor17,
        "sensor18": request.sensor18,
        "sensor19": request.sensor19,
        "sensor20": request.sensor20,
        "sensor21": request.sensor21,
    }])
    
    # Predict RUL
    predicted_rul = float(model.predict(features)[0])
    
    return RulPredictResponse(
        subset=sub,
        predictedRUL=round(predicted_rul, 2)
    )


@app.post("/train/rul", tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def train_rul(background_tasks: BackgroundTasks):
    logger.info("Triggering background model training for C-MAPSS dataset...")
    if training_status["rul"]["status"] == "RUNNING":
        return {"status": "RUNNING", "message": "Training already in progress."}
    training_status["rul"]["status"] = "RUNNING"
    training_status["rul"]["error"] = None
    background_tasks.add_task(run_training_rul)
    return {"status": "TRAINING_STARTED", "message": "C-MAPSS model training triggered in background."}


@app.get("/predictive-maintenance/rul/metrics", tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def get_rul_model_metrics():
    global cmapss_model_package
    if cmapss_model_package is None:
        return {
            "status": "NOT_LOADED",
            "message": "No C-MAPSS model package is currently loaded. Please train the model by POSTing to /train/rul."
        }
    return {
        "status": "LOADED",
        "features": cmapss_model_package.get("features", []),
        "metrics": cmapss_model_package.get("metrics", {})
    }


# ---------------------------------------------------------------------------
# SECOM Defect Prediction Endpoints
# ---------------------------------------------------------------------------

@app.post("/predict/secom", response_model=SecomPredictResponse, tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def predict_secom(
    request: SecomPredictRequest,
    mode: str = Query(
        default="balanced",
        description=(
            "Decision mode: "
            "'balanced' uses the F1-maximising threshold (best overall recall+precision); "
            "'precision' uses the \u226550% precision threshold (primary/autonomous rejection)."
        ),
    ),
):
    """Predict wafer defect probability from 590 SECOM sensor readings.

    Use **mode=balanced** (default) for the highest F1 operating point.
    Use **mode=precision** for autonomous primary rejection — every alarm
    flagged at this level has ≥50% probability of being a true defect.
    """
    global secom_model_package
    if secom_model_package is None:
        raise HTTPException(
            status_code=503,
            detail="SECOM model is not loaded. Please train it first by POSTing to /train/secom.",
        )
    if mode not in ("balanced", "precision"):
        raise HTTPException(
            status_code=422,
            detail="mode must be 'balanced' or 'precision'.",
        )

    import pandas as pd
    import numpy as np

    feature_cols = secom_model_package["feature_cols"]
    imputer      = secom_model_package["imputer"]
    scaler       = secom_model_package["scaler"]
    clf          = secom_model_package["model"]

    if mode == "precision":
        threshold = secom_model_package.get("threshold_precision",
                     secom_model_package.get("threshold", 0.5))
    else:  # balanced
        threshold = secom_model_package.get("threshold", 0.5)

    # Build a full 590-column row, then select surviving feature columns
    full_row = np.array(
        [v if v is not None else np.nan for v in request.sensors],
        dtype=float,
    ).reshape(1, -1)

    # Select only the columns that survived the >50% NaN filter during training
    X_selected = full_row[:, feature_cols]

    # Apply the fitted imputer and scaler
    X_imputed = imputer.transform(X_selected)
    X_scaled  = scaler.transform(X_imputed)

    defect_prob = float(clf.predict_proba(X_scaled)[0][1])
    defect_pred = defect_prob >= threshold

    return SecomPredictResponse(
        defectPredicted=defect_pred,
        defectProbability=round(defect_prob, 4),
        nFeaturesUsed=len(feature_cols),
        mode=mode,
        thresholdUsed=round(threshold, 4),
    )


@app.post("/train/secom", tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def train_secom(background_tasks: BackgroundTasks):
    """Re-train the SECOM defect prediction model from raw dataset files."""
    logger.info("Triggering background SECOM model training...")
    if training_status["secom"]["status"] == "RUNNING":
        return {"status": "RUNNING", "message": "Training already in progress."}
    training_status["secom"]["status"] = "RUNNING"
    training_status["secom"]["error"] = None
    background_tasks.add_task(run_training_secom)
    return {"status": "TRAINING_STARTED", "message": "SECOM model training triggered in background."}


@app.get("/predictive-maintenance/secom/metrics", tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def get_secom_metrics():
    """Return metrics and metadata for the currently loaded SECOM defect model."""
    global secom_model_package
    if secom_model_package is None:
        return {
            "status": "NOT_LOADED",
            "message": "No SECOM model is currently loaded. Please train it by POSTing to /train/secom.",
        }
    m = secom_model_package.get("metrics", {})
    return {
        "status": "LOADED",
        "nFeaturesUsed": len(secom_model_package.get("feature_cols", [])),
        "metrics": m,
    }


@app.get("/train/status", tags=["Predictive Maintenance"], dependencies=[Depends(verify_api_key)])
def get_training_status():
    """Return status of background model training tasks."""
    return training_status


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000)

