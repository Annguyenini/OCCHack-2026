
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from controllers.auth_controller import AuthController
from services.market_service import MarketService


class MarketController:
    def __init__(self):
        self.router = APIRouter(
            prefix="/market",
            tags=["Market"],
        )
        self.auth = AuthController()
        self.market_service = MarketService()
        self.register_routes()

    def register_routes(self):
        @self.router.get("/clothes")
        def get_all_clothes(
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),

        ):
            return self.market_service.get_all_clothes(credential=  credentials.credentials)

        @self.router.post("/clothes/{clothing_id}/buy")
        def buy_clothes(
            clothing_id: UUID,
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
            user=Depends(self.auth.get_current_user),
        ):
            return self.market_service.buy_clothes(
                user=user,
                clothing_id=str(clothing_id),
                credential=credentials.credentials
            )

        @self.router.get("/my-clothes")
        def get_my_clothes(
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
            user=Depends(self.auth.get_current_user),
        ):
            return self.market_service.get_user_clothes(
                user=user,
                credential=credentials.credentials,
            )
