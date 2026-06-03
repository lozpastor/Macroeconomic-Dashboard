from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.graphql import graphql_router
from app.api.routes import router

app = FastAPI(
    title="MacroScope Intelligence API",
    version="0.1.0",
    description="Global macroeconomic intelligence API with official data connectors, insights and forecasting.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
app.include_router(graphql_router, prefix="/graphql")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
