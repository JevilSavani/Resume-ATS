from fastapi import FastAPI, status
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from .config.settings import settings
from .database.session import Base, engine
from .models.application import Application
from .models.candidate import Candidate
from .models.job_profile import JobProfile
from .models.user import User
from .routes.applications import router as applications_router
from .routes.auth import router as auth_router
from .routes.jobs import router as jobs_router
from .routes.recruiter import router as recruiter_router
from .routes.resumes import router as resume_router

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


def ensure_database_schema():
    if engine is None:
        return

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if "users" not in tables:
        Base.metadata.create_all(bind=engine, tables=[User.__table__])
    else:
        columns = {column["name"] for column in inspector.get_columns("users")}
        with engine.begin() as connection:
            if "role" not in columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'candidate'"))
            connection.execute(text("UPDATE users SET role = 'candidate' WHERE role IS NULL"))

    if "candidates" not in tables:
        Base.metadata.create_all(bind=engine, tables=[Candidate.__table__])
    else:
        columns = {column["name"] for column in inspector.get_columns("candidates")}
        with engine.begin() as connection:
            if "user_id" not in columns:
                connection.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS user_id UUID"))
            if "skills" not in columns:
                connection.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills JSON DEFAULT '[]'::json"))
            if "resume_path" not in columns:
                connection.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_path VARCHAR(500)"))
            if "resume_text" not in columns:
                connection.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_text TEXT"))

    if "job_profiles" not in tables:
        Base.metadata.create_all(bind=engine, tables=[JobProfile.__table__])
    else:
        columns = {column["name"] for column in inspector.get_columns("job_profiles")}
        with engine.begin() as connection:
            if "user_id" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS user_id UUID"))
            if "skills" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS skills JSON DEFAULT '[]'::json"))
            if "keywords" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS keywords JSON DEFAULT '[]'::json"))
            if "job_text" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS job_text TEXT"))
            if "status" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'"))
            if "company_name" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(200)"))
            if "required_skills" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS required_skills JSON DEFAULT '[]'::json"))
            if "preferred_skills" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS preferred_skills JSON DEFAULT '[]'::json"))
            if "education_requirement" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS education_requirement VARCHAR(200)"))
            if "minimum_experience" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS minimum_experience VARCHAR(200)"))
            if "employment_type" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS employment_type VARCHAR(100) DEFAULT 'Full-time'"))
            if "salary" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS salary VARCHAR(100)"))
            if "updated_at" not in columns:
                connection.execute(text("ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
            connection.execute(text("UPDATE job_profiles SET status = 'active' WHERE status IS NULL"))

    if "applications" not in tables:
        Base.metadata.create_all(bind=engine, tables=[Application.__table__])


@app.on_event("startup")
def startup():
    if engine is not None:
        try:
            ensure_database_schema()
        except SQLAlchemyError as exc:
            print(f"Database startup check skipped: {exc}")


@app.get("/")
def home():
    return {
        "message": "Backend Running Successfully"
    }


app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(recruiter_router)

