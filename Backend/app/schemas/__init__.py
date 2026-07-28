from app.schemas.auth import TokenResponse, UserCreate, UserLogin, UserResponse
from app.schemas.question import AIGenerateRequest, AIGenerateResponse, AIGeneratedQuestion, BulkDuplicateRequest, BulkUpdateRequest, PaginatedQuestionResponse, QuestionAnalytics, QuestionBulkCreate, QuestionCreate, QuestionResponse, QuestionUpdate, SuggestResponse, VersionEntry
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
from app.schemas.analytics import (
    CoreAnalyticsResponse,
    LearningStreakResponse,
    TopicMasteryItem,
    TopicMasteryResponse,
    WeeklyProgressItem,
    WeeklyProgressResponse,
)
 
__all__ = [
    "UserCreate", "UserLogin", "UserResponse", "TokenResponse",
    "QuestionCreate", "QuestionUpdate", "QuestionResponse", "AIGenerateRequest", "AIGenerateResponse", "AIGeneratedQuestion", "QuestionBulkCreate", "BulkUpdateRequest", "BulkDuplicateRequest", "PaginatedQuestionResponse", "QuestionAnalytics", "SuggestResponse", "VersionEntry",
    "ExamCreate", "ExamUpdate", "ExamResponse",
    "ExamQuestionCreate", "ExamQuestionBulkCreate", "ExamQuestionResponse",
    "ExamAssignCreate", "ExamAssignmentResponse", "StudentExamResponse",
    "OfflinePackageResponse", "OfflineQuestionResponse",
    "AnswerSyncItem", "AnswerSyncRequest", "AnswerSyncResponse",
    "StudentAnswerResponse", "MySubmissionResponse",
    "DeviceCreate", "DeviceResponse", "DeviceBindRequest",
    "ProctorEventCreate", "ProctorEventResponse", "ProctorEventResponseWithRisk", "ProctorRiskReportResponse",
]