# Email Spam Detection

An NLP-based email spam detector with a browser interface for checking messages
and reviewing recent results.

## Run the application

From the repository root, start the FastAPI service:

```bash
uvicorn src.api.app:app --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. The app
loads `models/spam_model.pkl` and `models/count_vectorizer.pkl` and uses the
existing preprocessing pipeline for predictions. Spam detections are appended
to `data/quarantine/quarantine.csv`; the dashboard shows the count without
exposing stored email contents. Recent checks are kept in the current browser.

The JSON prediction endpoint is `POST /predict` with a body such as:

```json
{"text": "The email message to analyze"}
```

It returns the predicted `label` and model `confidence`. The service also
provides `GET /api/health` and `GET /api/stats`.
