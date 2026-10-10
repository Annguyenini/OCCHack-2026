
from fastapi import HTTPException
from supabase import Client, create_client

from core.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY


class MarketService:
    def __init__(self) -> None:
        self.supabase: Client = create_client(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
        )

    def get_all_clothes(self,credential:str):

        try:
            supabase = self.supabase.postgrest.auth(credential)
            response = (
                supabase
                .table("clothes")
                .select(
                    "id, name, category, price, created_at"
                )
                .order("created_at", desc=True)
                .execute()
            )
            return response.data

        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve clothes from the market",
            ) from exc


    def buy_clothes(self, user, clothing_id: str,credential:str):
        if not user or not user.id:
            raise HTTPException(
                status_code=401,
                detail="Authentication required",
            )

        try:
            # 1. Get the clothing item and its price
            supabase: Client = create_client(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
            )
            supabase.postgrest.auth(credential)

            clothing_response = (
                supabase.table("clothes")
                .select("id, name, price")
                .eq("id", clothing_id)
                .maybe_single()
                .execute()
            )

            clothing = clothing_response.data if clothing_response else None

            if clothing is None:
                raise HTTPException(
                    status_code=404,
                    detail="Clothing not found",
                )

            price = clothing["price"]

            # 2. Get the user's coin balance
            profile_response = (
                supabase.table("profiles")
                .select("coins")
                .eq("id", str(user.id))
                .maybe_single()
                .execute()
            )

            profile = profile_response.data if profile_response else None

            if profile is None:
                raise HTTPException(
                    status_code=404,
                    detail="User profile not found",
                )

            coins = profile["coins"]

            # 3. Check whether the user can afford it
            if coins < price:
                raise HTTPException(
                    status_code=400,
                    detail="Not enough coins",
                )

            # 4. Check whether the user already owns it
            ownership_response = (
                supabase.table("user_clothes")
                .select("id")
                .eq("user_id", str(user.id))
                .eq("clothing_id", clothing_id)
                .maybe_single()
                .execute()
            )

            ownership = (
                ownership_response.data
                if ownership_response
                else None
            )

            if ownership is not None:
                raise HTTPException(
                    status_code=409,
                    detail="You already own this clothing",
                )

            # 5. Deduct coins
            new_coins = coins - price

            supabase.table("profiles").update(
                {"coins": new_coins}
            ).eq("id", str(user.id)).execute()

            # 6. Add the clothing to the user's inventory
            supabase.table("user_clothes").insert({
                "user_id": str(user.id),
                "clothing_id": clothing_id,
                "quantity": 1,
                "is_equipped": False,
            }).execute()

            return {
                "message": "Clothing purchased successfully",
                "clothing": clothing,
                "coins_remaining": new_coins,
            }

        except HTTPException:
            raise

        except Exception as exc:
            print(f"Failed to purchase clothing: {exc}")
            raise HTTPException(
                status_code=500,
                detail="Failed to purchase clothing",
            ) from exc

    def get_user_clothes(self, user, credential: str):
        if not user or not user.id:
            raise HTTPException(
                status_code=401,
                detail="Authentication required",
            )

        try:
            # Create a separate client for this user's request
            supabase: Client = create_client(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
            )
            supabase.postgrest.auth(credential)

            response = (
                supabase
                .table("user_clothes")
                .select(
                    """
                    id,
                    clothing_id,
                    quantity,
                    is_equipped,
                    acquired_at,
                    clothes (
                        id,
                        name,
                        category,
                        price,
                        created_at
                    )
                    """
                )
                .eq("user_id", str(user.id))
                .order("acquired_at", desc=True)
                .execute()
            )

            return response.data

        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve user clothing",
            ) from exc
