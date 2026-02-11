import uuid
import urllib.request
import urllib.error
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Policy, User
from .models_documents import Document
from .audit_helper import log_action

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"

router = APIRouter(prefix="/files", tags=["files"])


def _safe_path(object_key: str) -> Path:
    """Validate path to prevent directory traversal attacks."""
    # Resolve the path and ensure it stays within UPLOAD_DIR
    dest = (UPLOAD_DIR / object_key).resolve()
    if not str(dest).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid file path")
    return dest


@router.put("/upload/{object_key:path}")
async def upload_file(object_key: str, request: Request):
    dest = _safe_path(object_key)
    dest.parent.mkdir(parents=True, exist_ok=True)
    body = await request.body()
    dest.write_bytes(body)
    return {"ok": True}


@router.get("/download/{object_key:path}")
async def download_file(object_key: str):
    path = _safe_path(object_key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


@router.post("/direct-upload")
async def direct_upload(
    policy_id: int = Form(...),
    doc_type: str = Form("policy"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    p = db.get(Policy, policy_id)
    if not p or p.user_id != user.id:
        raise HTTPException(status_code=404, detail="Policy not found")

    object_key = f"policies/{p.scope}/{policy_id}/{uuid.uuid4()}-{file.filename}"
    dest = UPLOAD_DIR / object_key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(await file.read())

    doc = Document(
        policy_id=policy_id,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        object_key=object_key,
        doc_type=doc_type,
    )
    db.add(doc)
    db.flush()
    log_action(db, user.id, "uploaded", "document", doc.id)
    db.commit()
    db.refresh(doc)
    return {"ok": True, "document_id": doc.id}


class ImportUrlRequest(BaseModel):
    policy_id: int
    url: str
    doc_type: str = "policy"


@router.post("/import-url")
def import_from_url(
    payload: ImportUrlRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    p = db.get(Policy, payload.policy_id)
    if not p or p.user_id != user.id:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Validate URL
    url = payload.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    # Download the file
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PolicyVault/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            content_type = resp.headers.get("Content-Type", "")
            data = resp.read(20 * 1024 * 1024)  # 20MB limit
    except urllib.error.URLError as e:
        raise HTTPException(status_code=400, detail=f"Could not download file: {e.reason}")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not download file from the provided URL")

    # Validate it looks like a PDF
    if not data[:5] == b"%PDF-" and "pdf" not in content_type.lower():
        raise HTTPException(status_code=400, detail="The URL does not point to a PDF file")

    # Extract filename from URL
    filename = url.split("/")[-1].split("?")[0] or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"

    # Store the file
    object_key = f"policies/{p.scope}/{payload.policy_id}/{uuid.uuid4()}-{filename}"
    dest = UPLOAD_DIR / object_key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)

    doc = Document(
        policy_id=payload.policy_id,
        filename=filename,
        content_type="application/pdf",
        object_key=object_key,
        doc_type=payload.doc_type,
    )
    db.add(doc)
    db.flush()
    log_action(db, user.id, "imported_url", "document", doc.id)
    db.commit()
    db.refresh(doc)
    return {"ok": True, "document_id": doc.id}
