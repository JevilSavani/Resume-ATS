from fastapi import FastAPI

app = FastAPI(
    title="AI Resume ATS API",
    version="1.0.0"
)

@app.get("/")
def home():
    return {
        "message": "Backend Running Successfully"
    }