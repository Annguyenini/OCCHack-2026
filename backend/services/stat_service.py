from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from controllers.auth_controller import AuthController
from core.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY

from supabase import Client, create_client

class UserStatService:
    def __init__(self) -> None:
        self.supabase: Client = create_client(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
        )

    def initialize_profile(self, user, name: str, gender: str,jwt:str):
        try:
            if not user or not user.id:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required",
                )

            # Check whether the profile already exists
            supabase = self.supabase.postgrest.auth(jwt)
            existing = (
                self.supabase
                .table("profiles")
                .select("id, name, gender")
                .eq("id", str(user.id))
                .maybe_single()
                .execute()
            )
            if existing and existing.data:
                return {
                    "message": "Profile already exists",
                    "created": False,
                    "profile": existing.data,
                }

            # Create the initial profile
            response = (
                self.supabase
                .table("profiles")
                .insert({
                    "id": str(user.id),
                    "name": name,
                    "gender": gender,
                    "coins": 0,
                    "exp": 0,
                    "muscularity_level": 1,
                })
                .execute()
            )

            if not response.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create user profile",
                )

            return {
                "message": "Profile created successfully",
                "created": True,
                "profile": response.data[0],
            }

        except HTTPException:
            raise
        except Exception as exc:
            print(f"Failed to initialize user profile: {exc}")
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize user profile",
            ) from exc



    def getUserStat(self,user,credentials:str):
        try:
            print(str(user.id))
            supabase = self.supabase.postgrest.auth(credentials)
            response = (
                self.supabase
                .table("profiles")
                .select(
                    "id, gender, muscularity_level, coins, exp, level"
                )
                .eq("id", str(user.id))
                .execute()
            )
            print(response)
            if not response.data:
                raise HTTPException(
                    status_code=404,
                    detail="User profile not found",
                )

            return response.data[0]

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve user stats",
            )
