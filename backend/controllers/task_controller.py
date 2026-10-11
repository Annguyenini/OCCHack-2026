
from dataclasses import Field
from datetime import date
from typing import Literal
from uuid import UUID
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from controllers.auth_controller import AuthController
from services.task_service import UserTaskService


class UpdateTaskStatusRequest(BaseModel):
    status: Literal["remaining", "completed"]

class CreateSideQuestRequest(BaseModel):
    side_quest: str
    duration: Literal[30, 60, 90]

class UserTaskController:
    def __init__(self):
        self.router = APIRouter(
            prefix="/user-tasks",
            tags=["User Tasks"],
        )

        self.auth = AuthController()
        self.user_task_service = UserTaskService()

        self.register_routes()

    def register_routes(self):
        @self.router.get("/")
        def get_my_tasks(
            user=Depends(self.auth.get_current_user),
        ):
            return self.user_task_service.get_user_tasks(user)

        @self.router.patch("/{task_id}/status")
        def update_task_status(
            task_id: UUID,
            request: UpdateTaskStatusRequest,
            user=Depends(self.auth.get_current_user),
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),

        ):
            return self.user_task_service.update_task_status(
                user=user,
                task_id=str(task_id),
                status=request.status,
                jwt =credentials.credentials
            )
        @self.router.post("/generate-task")
        def create_side_quest(
            request: CreateSideQuestRequest,
            user=Depends(self.auth.get_current_user),
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),

        ):
            return self.user_task_service.generate_tasks(
                user=user,
                side_quest=request.side_quest.strip(),
                days=request.duration,
                jwt=credentials.credentials

            )

        @self.router.get("/current")
        def get_current_tasks(
            day: Optional[date] = Query(
                None, description="YYYY-MM-DD, defaults to today (UTC)"
            ),
            user=Depends(self.auth.get_current_user),
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
        ):
            return self.user_task_service.get_current_tasks(
                user=user,
                jwt=credentials.credentials,
                day=day,
            )

        @self.router.get("/completed")
        def get_completed_tasks(
            limit: int = Query(50, ge=1, le=200),
            offset: int = Query(0, ge=0),
            user=Depends(self.auth.get_current_user),
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
        ):
            return self.user_task_service.get_completed_tasks(
                user=user,
                jwt=credentials.credentials,
                limit=limit,
                offset=offset,
            )

user_task_controller = UserTaskController()
router = user_task_controller.router
