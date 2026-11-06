from pathlib import Path

import joblib
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from src.data.preprocess import clean_text
from src.quarantine.store import quarantine_email, quarantined_count

PROJECT_ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = PROJECT_ROOT / "src" / "api" / "static"

app = FastAPI(title="Signal — Email Security")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

model = joblib.load(PROJECT_ROOT / "models" / "spam_model.pkl")
vectorizer = joblib.load(PROJECT_ROOT / "models" / "count_vectorizer.pkl")


class Email(BaseModel):
    text: str = Field(min_length=1, max_length=10_000)

    @field_validator("text")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Email text cannot be blank.")
        return value


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/api/stats")
def stats():
    return {"quarantined_count": quarantined_count()}


@app.post("/predict")
def predict(email: Email):
    features = vectorizer.transform([clean_text(email.text)])
    label = str(model.predict(features)[0])

    if label == "spam":
        quarantine_email(email.text, label)

    confidence = None
    if hasattr(model, "predict_proba") and hasattr(model, "classes_"):
        probabilities = model.predict_proba(features)[0]
        class_index = list(model.classes_).index(label)
        confidence = float(probabilities[class_index])

    return {"label": label, "confidence": confidence}
