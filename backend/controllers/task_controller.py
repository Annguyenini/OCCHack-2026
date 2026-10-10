
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from controllers.auth_controller import AuthController
from services.task_service import UserTaskService


class UpdateTaskStatusRequest(BaseModel):
    status: Literal["remaining", "completed"]


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
        ):
            return self.user_task_service.update_task_status(
                user=user,
                task_id=str(task_id),
                status=request.status,
            )


user_task_controller = UserTaskController()
router = user_task_controller.router
