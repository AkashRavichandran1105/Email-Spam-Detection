import csv
from datetime import datetime
from pathlib import Path

QUARANTINE_FILE = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "quarantine"
    / "quarantine.csv"
)


def quarantine_email(email_text, label):
    QUARANTINE_FILE.parent.mkdir(parents=True, exist_ok=True)
    new_file = not QUARANTINE_FILE.exists()

    with open(QUARANTINE_FILE, "a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if new_file:
            writer.writerow(["timestamp", "label", "email_text"])
        writer.writerow([datetime.now().isoformat(), label, email_text])


def quarantined_count():
    if not QUARANTINE_FILE.exists():
        return 0

    with open(QUARANTINE_FILE, newline="", encoding="utf-8") as file:
        return sum(1 for row in csv.DictReader(file) if row.get("label") == "spam")
