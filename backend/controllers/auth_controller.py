
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
)
from supabase import create_client, Client

from core.config import (
    SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_URL,
)


class AuthController:
    def __init__(self):
        self.router = APIRouter(
            prefix="/auth",
            tags=["Auth"],
        )

        self.security = HTTPBearer(auto_error=False)

        self.supabase: Client = create_client(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
        )

        self.register_routes()

    def register_routes(self):
        self.router.add_api_route(
            "/me",
            self.get_me,
            methods=["GET"],
        )
        self.router.add_api_route(
            "/anonymus",
            self.anonymous_sign_in,
            methods=["POST"],
        )

    def anonymous_sign_in(self):
        try:
            response = self.supabase.auth.sign_in_anonymously()

            if not response.session:
                raise HTTPException(
                    status_code=401,
                    detail="Failed to create anonymous session",
                )

            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "user_id": response.user.id,
                "is_anonymous": response.user.is_anonymous,
                "token_type": "bearer",
            }

        except HTTPException:
            raise
        except Exception as exc:
            print(f"Anonymous sign-in error: {exc}")
            raise HTTPException(
                status_code=500,
                detail="Anonymous sign-in failed",
            ) from exc

    def get_current_user(
        self,
        credentials: HTTPAuthorizationCredentials | None = Depends(
            HTTPBearer(auto_error=False)
        ),
    ):
        print(credentials)
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            response = self.supabase.auth.get_user(
                credentials.credentials
            )
            user = response.user
            print(user is None)
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token",
                )

            return user

        except HTTPException:
            raise

        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def get_me(
        self,
        user=Depends(get_current_user),
    ):
        return {
            "id": str(user.id),
            "is_anonymous": getattr(
                user, "is_anonymous", False
            ),
        }
