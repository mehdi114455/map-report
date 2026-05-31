"""
Train the category classifier.

Usage:
    python -m app.ml.train

Outputs:
    app/ml/category_classifier.joblib  - the fitted Pipeline
    app/ml/metrics.json                - eval scores
"""
import json
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

from app.ml.training_data import build_dataset


HERE = Path(__file__).parent
MODEL_PATH = HERE / "category_classifier.joblib"
METRICS_PATH = HERE / "metrics.json"


def build_pipeline() -> Pipeline:
    """
    TF-IDF features -> Calibrated Linear SVM.
    CalibratedClassifierCV wraps LinearSVC to give us predict_proba(),
    The confidence score will be visble to the admins.
    """
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),       # unigrams + bigrams catch "pot hole" vs "pothole"
            min_df=2,                  # ignore one-off typos
            max_df=0.95,               # ignore words that appear in 95%+ docs
            sublinear_tf=True,         # log-scale term frequency
        )),
        ("clf", CalibratedClassifierCV(
            LinearSVC(C=1.0, class_weight="balanced"),
            cv=5,
        )),
    ])


def train_and_evaluate() -> None:
    X, y = build_dataset()
    print(f"Loaded {len(X)} examples across {len(set(y))} categories.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    print(f"Train: {len(X_train)}  Test: {len(X_test)}")

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    print(f"\nTest accuracy: {acc:.3f}\n")
    print(classification_report(y_test, y_pred, zero_division=0))

    joblib.dump(pipeline, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(
        {"accuracy": acc, "report": report}, indent=2
    ))
    print(f"\n✓ Model saved to {MODEL_PATH}")
    print(f"✓ Metrics saved to {METRICS_PATH}")


if __name__ == "__main__":
    train_and_evaluate()