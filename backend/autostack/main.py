from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from autostack.api.router import router
from autostack.database import setup_database


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    setup_database()
    yield


API_V1_STR = "/api/v1"
app = FastAPI(
    title="autostack",
    lifespan=lifespan,
    openapi_url=f"/{API_V1_STR}/openapi.json",
    docs_url=f"/{API_V1_STR}/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router(), prefix=API_V1_STR)
