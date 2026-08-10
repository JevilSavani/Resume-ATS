from fastapi import FastAPI, status
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config.settings import settings
from app.database.session import Base, engine
from app.models.user import User
from app.routes.auth import router as auth_router
from app.routes.resumes import router as resume_router

app = FastAPI(
    title="AI Resume ATS API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.on_event("startup")
def startup():
    if engine is not None:
        try:
            Base.metadata.create_all(bind=engine, tables=[User.__table__])
        except SQLAlchemyError as exc:
            print(f"Database startup check skipped: {exc}")


@app.get("/")
def home():
    return {
        "message": "Backend Running Successfully"
    }


app.include_router(auth_router)
app.include_router(resume_router)
