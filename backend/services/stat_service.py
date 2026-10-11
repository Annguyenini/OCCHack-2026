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

    def has_enough_coins(self, user, amount: int, jwt: str) -> bool:
        """Check whether the user has enough coins to spend."""
        try:
            if not user or not user.id:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required",
                )

            if amount <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Amount must be greater than zero",
                )

            self.supabase.postgrest.auth(jwt)

            response = (
                self.supabase
                .table("profiles")
                .select("coins")
                .eq("id", str(user.id))
                .maybe_single()
                .execute()
            )

            if not response or not response.data:
                raise HTTPException(
                    status_code=404,
                    detail="User profile not found",
                )

            return response.data["coins"] >= amount

        except HTTPException:
            raise
        except Exception as exc:
            print(f"Failed to check user coins: {exc}")
            raise HTTPException(
                status_code=500,
                detail="Failed to check user coins",
            ) from exc


    def update_coins(self, user, amount: int, jwt: str) -> dict:
        """Add or subtract coins. Positive = add, negative = spend."""
        try:
            if not user or not user.id:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required",
                )

            if amount == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Amount cannot be zero",
                )

            self.supabase.postgrest.auth(jwt)

            # Get the current balance
            response = (
                self.supabase
                .table("profiles")
                .select("coins")
                .eq("id", str(user.id))
                .maybe_single()
                .execute()
            )

            if not response or not response.data:
                raise HTTPException(
                    status_code=404,
                    detail="User profile not found",
                )

            current_coins = response.data["coins"]
            new_coins = current_coins + amount

            if new_coins < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Not enough coins",
                )

            # Update the balance
            updated = (
                self.supabase
                .table("profiles")
                .update({"coins": new_coins})
                .eq("id", str(user.id))
                .execute()
            )

            if not updated.data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to update coins",
                )

            return {
                "message": "Coins updated successfully",
                "previous_coins": current_coins,
                "change": amount,
                "coins": new_coins,
            }

        except HTTPException:
            raise
        except Exception as exc:
            print(f"Failed to update user coins: {exc}")
            raise HTTPException(
                status_code=500,
                detail="Failed to update user coins",
            ) from exc
