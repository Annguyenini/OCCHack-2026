
from datetime import datetime, timezone

from fastapi import HTTPException
from supabase import Client, create_client

from core.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY


class UserTaskService:
    def __init__(self) -> None:
        self.supabase: Client = create_client(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
        )

    def get_user_tasks(self, user):
        try:
            response = (
                self.supabase
                .table("user_tasks")
                .select(
                    "id, user_id, title, description, "
                    "exp_reward, coin_reward, status, progress, "
                    "is_active, assigned_at, completed_at"
                )
                .eq("user_id", str(user.id))
                # .eq("is_active", True)
                .order("assigned_at", desc=True)
                .execute()
            )

            return response.data

        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve user tasks",
            )





    def update_task_status(self, user, task_id: str, status: str):
        try:
            completed_at = (
                datetime.now(timezone.utc).isoformat()
                if status == "completed"
                else None
            )

            # 1. Get the task and its rewards
            task_response = (
                self.supabase
                .table("user_tasks")
                .select("id, coin_reward, exp_reward, status")
                .eq("id", task_id)
                .eq("user_id", str(user.id))
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )

            task = task_response.data

            if not task:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )

            # 2. Prevent claiming rewards more than once
            if task["status"] == "completed" and status == "completed":
                raise HTTPException(
                    status_code=400,
                    detail="Task is already completed",
                )

            # 3. Update task status
            response = (
                self.supabase
                .table("user_tasks")
                .update({
                    "status": status,
                    "completed_at": completed_at,
                })
                .eq("id", task_id)
                .eq("user_id", str(user.id))
                .eq("is_active", True)
                .execute()
            )

            if not response.data:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )

            # 4. Give rewards only when completing the task
            if status == "completed":
                coin_reward = task.get("coin_reward") or 0
                exp_reward = task.get("exp_reward") or 0

                profile_response = (
                    self.supabase
                    .table("profiles")
                    .select("coins, exp")
                    .eq("id", str(user.id))
                    .maybe_single()
                    .execute()
                )

                profile = profile_response.data

                if not profile:
                    raise HTTPException(
                        status_code=404,
                        detail="User profile not found",
                    )

                # 5. Add coins and EXP to the user's stats
                self.supabase.table("profiles").update({
                    "coins": profile["coins"] + coin_reward,
                    "exp": profile["exp"] + exp_reward,
                }).eq("id", str(user.id)).execute()

                return {
                    **response.data[0],
                    "rewards": {
                        "coins_earned": coin_reward,
                        "exp_earned": exp_reward,
                    },
                    "message": "Task completed and rewards added",
                }

            return response.data[0]

        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail="Failed to update task status",
            ) from exc
