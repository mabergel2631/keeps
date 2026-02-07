import uuid
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
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
