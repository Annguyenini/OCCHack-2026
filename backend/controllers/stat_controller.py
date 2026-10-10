from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client, create_client

from controllers.auth_controller import AuthController
from services.stat_service import UserStatService
from core.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY

from pydantic import BaseModel


class InitializeProfileRequest(BaseModel):
    name: str
    gender: str
class UserStatController:
    def __init__(self):
        self.router = APIRouter(
            prefix="/user-stat",
            tags=["User Stats"],
        )

        self.supabase: Client = create_client(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
        )
        self.auth = AuthController()
        self.security = HTTPBearer(auto_error=False)
        self.user_stat_service = UserStatService()
        self.register_routes()



    def get_user_stat(self, user,credentials:str):
        try:
            return self.user_stat_service.getUserStat(user,credentials)
        except:
            raise

    def register_routes(self):
        @self.router.get("/")
        def get_my_stats(
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
            user=Depends(self.auth.get_current_user),
        ):
            return self.get_user_stat(user,credentials.credentials)

        @self.router.post("/initialize")
        def initialize_profile(
            request: InitializeProfileRequest,
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
            user=Depends(self.auth.get_current_user),
        ):
            return self.user_stat_service.initialize_profile(
                user=user,
                name=request.name,
                gender=request.gender,
                jwt=credentials.credentials
            )



user_stat_controller = UserStatController()
router = user_stat_controller.router
