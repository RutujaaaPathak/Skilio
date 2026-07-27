from app.schemas.auth import TokenResponse, UserCreate, UserLogin, UserResponse
from app.schemas.question import QuestionCreate, QuestionResponse, QuestionUpdate
from app.schemas.device import DeviceBindRequest, DeviceCreate, DeviceResponse
from app.schemas.exam import (
    AnswerSyncItem,
    AnswerSyncRequest,
    AnswerSyncResponse,
    ExamAssignCreate,
    ExamAssignmentResponse,
    ExamCreate,
    ExamQuestionBulkCreate,
    ExamQuestionCreate,
    ExamQuestionResponse,
    ExamResponse,
    ExamUpdate,
    MySubmissionResponse,
    OfflinePackageResponse,
    OfflineQuestionResponse,
    StudentAnswerResponse,
    StudentExamResponse,
)
from app.schemas.proctor import ProctorEventCreate, ProctorEventResponse, ProctorEventResponseWithRisk, ProctorRiskReportResponse
from app.schemas.recommendation import PracticeRecommendationResponse, SubjectRecommendation
from app.schemas.ai_insight import AIInsightItem, AIInsightsResponse

__all__ = [
    "UserCreate", "UserLogin", "UserResponse", "TokenResponse",
    "QuestionCreate", "QuestionUpdate", "QuestionResponse",
    "ExamCreate", "ExamUpdate", "ExamResponse",
    "ExamQuestionCreate", "ExamQuestionBulkCreate", "ExamQuestionResponse",
    "ExamAssignCreate", "ExamAssignmentResponse", "StudentExamResponse",
    "OfflinePackageResponse", "OfflineQuestionResponse",
    "AnswerSyncItem", "AnswerSyncRequest", "AnswerSyncResponse",
    "StudentAnswerResponse", "MySubmissionResponse",
    "DeviceCreate", "DeviceResponse", "DeviceBindRequest",
    "ProctorEventCreate", "ProctorEventResponse", "ProctorEventResponseWithRisk", "ProctorRiskReportResponse",
]