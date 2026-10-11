from datetime import date, datetime, timedelta, timezone
from typing import Optional
import uuid

from requests import request
import requests

from fastapi import HTTPException
from supabase import Client, create_client

from core.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,SUPABASE_SECRET_KEY


class UserTaskService:
    def __init__(self) -> None:
        self.supabase: Client = create_client(
            SUPABASE_URL,
            SUPABASE_SECRET_KEY,
        )

    def get_user_tasks(self, user):
        try:
            response = (
                self.supabase
                .table("user_tasks")
                .select(
                    "id, user_id, title, description, "
                    "exp_reward, coin_reward, status, progress, "
                    "is_active, assigned_at, completed_at,is_side_quest,batch_id"
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





    def update_task_status(self, user, task_id: str, status: str,jwt):
        try:
            supabase = self._client(jwt)

            completed_at = (
                datetime.now(timezone.utc).isoformat()
                if status == "completed"
                else None
            )
            # 1. Get the task and its rewards
            task_response = (
                supabase
                .table("user_tasks")
                .select("id, coin_reward, exp_reward, status")
                .eq("id", task_id)
                .eq("user_id", str(user.id))
                .maybe_single()
                .execute()
            )
            print(task_response)

            if not task_response or not task_response.data:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )
            task = task_response.data

            # 2. Prevent claiming rewards more than once
            if task["status"] == "completed" and status == "completed":
                raise HTTPException(
                    status_code=400,
                    detail="Task is already completed",
                )

            # 3. Update task status
            response = (
                supabase
                .table("user_tasks")
                .update({
                    "status": status,
                    "completed_at": completed_at,
                })
                .eq("id", task_id)
                .eq("user_id", str(user.id))
                .execute()
            )

            if not response or not response.data:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )

            # 4. Give rewards only when completing the task
            if status == "completed":
                coin_reward = task.get("coin_reward") or 0
                exp_reward = task.get("exp_reward") or 0

                profile_response = (
                    supabase
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
                supabase.table("profiles").update({
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
            print(f"Failed to update task status :{exc}")
            raise HTTPException(
                status_code=500,
                detail="Failed to update task status",
            ) from exc
    def create_json(
            self,
            side_quest: str,
            duration: int,
        ):
        start_date = date.today()
        deadline = start_date + timedelta(days=duration)

        if not side_quest:
            raise ValueError("Side quest title cannot be empty")

        return {
            "journeyDays": duration,
            "startDate": start_date.isoformat(),
            "mainTasks": [
                {
                    "goalId": "main-exercise",
                    "type": "exercise",
                    "target": [
                        {
                            "metric": "workoutFrequency",
                            "value": 3,
                            "unit": "sessions",
                            "period": "week",
                        },
                        {
                            "metric": "workoutDuration",
                            "value": 30,
                            "unit": "minutes",
                            "period": "session",
                        },
                    ],
                    "progression": {
                        "maxMinutes": 60,
                        "rampDays": 30,
                        "mode": "increase",
                    },
                },
                {
                    "goalId": "main-hydration",
                    "type": "hydration",
                    "target": [
                        {
                            "metric": "waterIntake",
                            "value": 2,
                            "unit": "liters",
                            "period": "day",
                        }
                    ],
                },
                {
                    "goalId": "main-sleep",
                    "type": "sleep",
                    "target": [
                        {
                            "metric": "bedtime",
                            "value": "23:00",
                            "unit": "time",
                            "period": "day",
                        },
                        {
                            "metric": "sleepDuration",
                            "value": 8,
                            "unit": "hours",
                            "period": "day",
                        },
                    ],
                },
                {
                    "goalId": "main-wake",
                    "type": "wakeUp",
                    "target": [
                        {
                            "metric": "wakeTime",
                            "value": "07:00",
                            "unit": "time",
                            "period": "day",
                        }
                    ],
                },
                {
                    "goalId": "main-learning",
                    "type": "learning",
                    "target": [
                        {
                            "metric": "studyOrReadingDuration",
                            "value": 20,
                            "unit": "minutes",
                            "period": "day",
                        }
                    ],
                    "progression": {
                        "maxMinutes": 40,
                        "rampDays": 30,
                        "mode": "increase",
                    },
                },
            ],
            "sideQuests": [
                {
                    "goalId": "side-project",
                    "title": side_quest,
                    "target": [
                        {
                            "metric": "projectTime",
                            "value": 30,
                            "unit": "minutes",
                            "period": "day",
                        }
                    ],
                    "deadline": deadline.isoformat(),
                    "dailyMinutes": 30,
                    "totalHours": 10,
                    "completedMinutes": 0,
                    "completed": False,
                }
            ],
        }


    def generate_tasks(self,user,side_quest:str,days:int,jwt:str):
        # duration in string(days)
        json_object = self.create_json(side_quest,days)
        plans = requests.post("http://localhost:8000/api/plans",json=json_object)
        print(plans.json())
        return self.add_tasks(user=user,plan=plans.json(),jwt=jwt)

# services/user_task_service.py

    CHUNK_SIZE = 100  # rows per insert call

    def _client(self, jwt: str) -> Client:
        # Build a client per request so one user's JWT never leaks into another's.
        client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        client.postgrest.auth(jwt)  # RLS now sees auth.uid() == the user
        return client

    @staticmethod
    def _rewards(active_minutes: int, is_side: bool) -> tuple[int, int]:
        # The plan has no reward data, so tune these numbers to your game design.
        exp = max(10, active_minutes)          # 0-minute tasks (water, sleep) get 10
        coins = max(5, active_minutes // 5)
        if is_side:
            exp, coins = int(exp * 1.5), int(coins * 1.5)
        return exp, coins

    def _build_rows(self, plan: dict, user_id: str) -> list[dict]:
        batch_id = str(uuid.UUID(plan["planId"]))  # 32-char hex -> valid uuid
        today = date.today()
        rows = []

        for day in plan["days"]:
            day_date = date.fromisoformat(day["date"])
            assigned_at = datetime(
                day_date.year, day_date.month, day_date.day, tzinfo=timezone.utc
            ).isoformat()

            for todo in day["todos"]:
                is_side = todo["category"] == "side"
                exp, coins = self._rewards(todo.get("activeMinutes", 0), is_side)
                rows.append({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "title": todo["title"],
                    "description": todo["completionCriteria"],
                    "exp_reward": exp,
                    "coin_reward": coins,
                    "status": "remaining",
                    "progress": 0,
                    # only today's (or overdue) tasks are active; future days unlock later
                    "is_active": day_date <= today,
                    "assigned_at": assigned_at,
                    "completed_at": None,
                    "is_side_quest": is_side,
                    "batch_id": batch_id,
                })
        return rows

    def add_tasks(self, user, plan: dict, jwt: str):
        try:
            if not user or not user.id:
                raise HTTPException(status_code=401, detail="Authentication required")
            supabase = self._client(jwt)
            user_id = str(user.id)
            rows = self._build_rows(plan, user_id)
            batch_id = rows[0]["batch_id"] if rows else None

            # Idempotency: don't insert the same plan twice
            if batch_id:
                existing = (
                    self.supabase.table("user_tasks")
                    .select("id")
                    .eq("user_id", user_id)
                    .limit(1)
                    .execute()
                )
                if existing.data:
                    return {"message": "Plan already added", "created": False, "batch_id": batch_id}

            inserted = 0
            for i in range(0, len(rows), self.CHUNK_SIZE):
                # print(rows[i])
                resp = self.supabase.table("user_tasks").insert(rows[i:i + self.CHUNK_SIZE]).execute()
                if not resp.data:
                    raise HTTPException(status_code=500, detail="Failed to insert tasks")
                inserted += len(resp.data)

            return {
                "message": "Tasks created successfully",
                "created": True,
                "batch_id": batch_id,
                "count": inserted,
            }

        except HTTPException:
            raise
        except (KeyError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid plan payload: {exc}") from exc
        except Exception as exc:
            print(f"Failed to add tasks: {exc}")
            raise HTTPException(status_code=500, detail="Failed to add tasks") from exc




    def get_current_tasks(self, user, jwt: str, day: Optional[date] = None):
       """Tasks assigned on the given day (default: today, UTC) whose status is not 'remaining'."""
       try:
           if not user or not user.id:
               raise HTTPException(status_code=401, detail="Authentication required")

           day = day or datetime.now(timezone.utc).date()
           start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
           end = start + timedelta(days=1)

           supabase = self._client(jwt)
           response = (
               supabase.table("user_tasks")
               .select("*")
               .eq("user_id", str(user.id))
               .gte("assigned_at", start.isoformat())
               .lt("assigned_at", end.isoformat())
               .eq("status", "remaining")
               .execute()
           )
           return {"date": day.isoformat(), "count": len(response.data), "tasks": response.data}

       except HTTPException:
           raise
       except Exception as exc:
           print(f"Failed to get current tasks: {exc}")
           raise HTTPException(status_code=500, detail="Failed to retrieve current tasks") from exc
    def get_completed_tasks(self, user, jwt: str, limit: int = 50, offset: int = 0):
        """Tasks with status == 'completed', newest completion first."""
        try:
            if not user or not user.id:
                raise HTTPException(status_code=401, detail="Authentication required")

            supabase = self._client(jwt)
            response = (
                supabase.table("user_tasks")
                .select("*")
                .eq("user_id", str(user.id))
                .eq("status", "completed")
                .order("completed_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return {"count": len(response.data), "limit": limit, "offset": offset, "tasks": response.data}

        except HTTPException:
            raise
        except Exception as exc:
            print(f"Failed to get completed tasks: {exc}")
            raise HTTPException(status_code=500, detail="Failed to retrieve completed tasks") from exc
