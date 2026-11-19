# NEXORA Analytics Service (optional)
#
# FastAPI + Google OR-Tools service that solves the same budget-allocation
# problem as the TypeScript engine in lib/optimizer.ts.
#
# OPTIONAL: the Next.js app works fully without this service — the TS
# simplex engine is the default. Run this only if you want OR-Tools
# (SCIP/CBC) solving instead of, or alongside, the built-in engine.
#
# Run:
#   cd analytics
#   python -m venv .venv && source .venv/bin/activate
#   pip install -r requirements.txt
#   uvicorn main:app --host 0.0.0.0 --port 8000
#
# Then set ANALYTICS_SERVICE_URL=http://localhost:8000 in the app .env.

from fastapi import FastAPI
from pydantic import BaseModel, Field
from ortools.linear_solver import pywraplp

app = FastAPI(title="NEXORA Analytics Service", version="0.1.0")


class Channel(BaseModel):
    name: str
    roi: float = Field(ge=0, le=100)
    min: float = Field(ge=0)
    max: float = Field(ge=0)


class OptimizeRequest(BaseModel):
    total_budget: float = Field(gt=0)
    channels: list[Channel] = Field(min_length=1, max_length=12)


class OptimizeResponse(BaseModel):
    status: str  # OPTIMAL | FEASIBLE | INFEASIBLE | NOT_SOLVED
    allocation: list[float]
    objective_value: float
    baseline_value: float
    improvement: float
    total_budget: float
    total_allocated: float
    solver: str


@app.get("/health")
def health():
    return {"ok": True, "solver": "OR-Tools SCIP"}


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest):
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if solver is None:
        return OptimizeResponse(
            status="NOT_SOLVED",
            allocation=[c.min for c in req.channels],
            objective_value=0.0,
            baseline_value=0.0,
            improvement=0.0,
            total_budget=req.total_budget,
            total_allocated=sum(c.min for c in req.channels),
            solver="OR-Tools SCIP (unavailable)",
        )

    xs = []
    for c in req.channels:
        x = solver.NumVar(c.min, c.max, f"x_{c.name}")
        xs.append(x)
    solver.Add(sum(xs) <= req.total_budget)
    solver.Maximize(sum(c.roi * x for c, x in zip(req.channels, xs)))

    status = solver.Solve()
    status_map = {
        pywraplp.Solver.OPTIMAL: "OPTIMAL",
        pywraplp.Solver.FEASIBLE: "FEASIBLE",
        pywraplp.Solver.INFEASIBLE: "INFEASIBLE",
        pywraplp.Solver.NOT_SOLVED: "NOT_SOLVED",
    }
    allocation = [x.solution_value() for x in xs]
    objective = sum(c.roi * v for c, v in zip(req.channels, allocation))
    baseline = sum(c.roi * c.min for c in req.channels)
    return OptimizeResponse(
        status=status_map.get(status, "NOT_SOLVED"),
        allocation=allocation,
        objective_value=objective,
        baseline_value=baseline,
        improvement=objective - baseline,
        total_budget=req.total_budget,
        total_allocated=sum(allocation),
        solver="Google OR-Tools SCIP",
    )
