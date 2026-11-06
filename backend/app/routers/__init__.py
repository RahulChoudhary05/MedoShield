from .analysis import router as analysis_router
from .assistant import router as assistant_router
from .auth import router as auth_router
from .chat import router as chat_router
from .doctors import router as doctors_router
from .medications import router as medications_router
from .patients import router as patients_router
from .reports import router as reports_router
from .video import router as video_router
from .wellbeing import router as wellbeing_router

ALL_ROUTERS = [
    auth_router, patients_router, doctors_router, analysis_router, video_router, assistant_router,
    medications_router, reports_router, chat_router, wellbeing_router,
]
