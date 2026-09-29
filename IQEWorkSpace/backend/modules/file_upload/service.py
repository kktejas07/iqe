import os
import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile


class FileUploadService:

    @staticmethod
    async def upload(file: UploadFile, section_id: str = "0", generic_id: str = ""):
        if not file.filename:
            raise HTTPException(400, "No file provided")
        ext = os.path.splitext(file.filename)[1]
        file_guid = str(uuid.uuid4())
        upload_dir = Path("uploads") / str(section_id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / f"{file_guid}{ext}"
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        # Using posix path format ensures cross-platform consistency (no Windows backslashes in URL)
        posix_rel_path = file_path.as_posix()
        return {
            "file_id": file_guid,
            "title": file.filename,
            "url": f"/files/{posix_rel_path}",
            "guid": file_guid,
            "size": len(content),
            "section_id": int(section_id) if str(section_id).isdigit() else 0,
        }

    @staticmethod
    async def get_mime_type(filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower()
        mime_map = {
            ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".gif": "image/gif", ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".zip": "application/zip",
        }
        return mime_map.get(ext, "application/octet-stream")
