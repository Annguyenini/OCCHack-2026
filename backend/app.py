from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from controllers.market_controller import MarketController
from controllers.task_controller import UserTaskController
from controllers.stat_controller import UserStatController
from services.stat_service import UserStatService
from controllers.auth_controller import AuthController
class AppService:
    def __init__(self) -> None:
        self.app = FastAPI()
        self._registorRoutes()
    def _registorRoutes(self):
        auth = AuthController()
        stat =UserStatController()
        task = UserTaskController()
        market =MarketController()
        self.app.include_router(auth.router)
        self.app.include_router(stat.router)
        self.app.include_router(task.router)
        self.app.include_router(market.router)

service = AppService()
app = service.app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,
    allow_methods=["*"],   # Allow all HTTP methods
    allow_headers=["*"],   # Allow all headers
)
