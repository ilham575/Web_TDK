import os
import uuid
from datetime import datetime

from google.cloud import storage

DEFAULT_LOCAL_UPLOAD_DIR = "uploads/logos"
FILE_STORAGE_BACKEND = (os.getenv("FILE_STORAGE_BACKEND", "auto") or "auto").strip().lower()
GCS_BUCKET_NAME = (os.getenv("GCS_BUCKET_NAME", "") or "").strip()
LOCAL_UPLOAD_DIR = (os.getenv("LOCAL_UPLOAD_DIR", DEFAULT_LOCAL_UPLOAD_DIR) or DEFAULT_LOCAL_UPLOAD_DIR).strip()


def _resolve_storage_backend() -> str:
    if FILE_STORAGE_BACKEND in {"auto", "gcs", "local"}:
        return FILE_STORAGE_BACKEND
    return "auto"


def _ensure_local_upload_dir() -> str:
    os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
    return LOCAL_UPLOAD_DIR


def _local_logo_url(filename: str) -> str:
    return f"/uploads/logos/{filename}"


def _save_to_local(file_content, destination_blob_name):
    upload_dir = _ensure_local_upload_dir()
    filename = os.path.basename(destination_blob_name)
    target_path = os.path.join(upload_dir, filename)
    with open(target_path, "wb") as output_file:
        output_file.write(file_content)
    return _local_logo_url(filename)


def _upload_directly_to_gcs(file_content, destination_blob_name, content_type, public=True):
    if not GCS_BUCKET_NAME:
        raise RuntimeError("GCS_BUCKET_NAME is not configured")

    storage_client = storage.Client()
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(destination_blob_name)

    blob.upload_from_string(file_content, content_type=content_type)

    if public:
        try:
            blob.make_public()
        except Exception as public_error:
            print(f"Warning: Could not make blob public (Bucket might have Uniform Bucket-Level Access): {public_error}")

    return f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{destination_blob_name}"


def upload_to_gcs(file_content, destination_blob_name, content_type, public=True):
    """
    Uploads a file to the configured storage backend.
    - FILE_STORAGE_BACKEND=gcs   -> require GCS and return None on failure
    - FILE_STORAGE_BACKEND=local -> always save to local uploads/logos
    - FILE_STORAGE_BACKEND=auto  -> try GCS first, fallback to local storage
    """
    backend = _resolve_storage_backend()

    if backend in {"auto", "gcs"}:
        try:
            return _upload_directly_to_gcs(
                file_content,
                destination_blob_name,
                content_type=content_type,
                public=public,
            )
        except Exception as error:
            print(f"Error uploading to GCS: {error}")
            if backend == "gcs":
                return None
            print("Falling back to local storage under uploads/logos")

    try:
        return _save_to_local(file_content, destination_blob_name)
    except Exception as error:
        print(f"Error saving file to local storage: {error}")
        return None


def _resolve_gcs_location(blob_name_or_url):
    if not blob_name_or_url:
        raise ValueError("blob_name_or_url is empty")

    if "storage.googleapis.com/" not in str(blob_name_or_url):
        if not GCS_BUCKET_NAME:
            raise RuntimeError("GCS bucket name is not configured")
        return GCS_BUCKET_NAME, blob_name_or_url

    _, _, remainder = str(blob_name_or_url).partition("storage.googleapis.com/")
    bucket_name, _, blob_name = remainder.partition("/")
    if not bucket_name or not blob_name:
        raise ValueError("Invalid GCS URL")
    return bucket_name, blob_name


def delete_from_gcs(blob_name_or_url):
    """
    Deletes a file from GCS given its public URL or blob name.
    """
    if not blob_name_or_url:
        return False
    
    try:
        bucket_name, blob_name = _resolve_gcs_location(blob_name_or_url)
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.delete()
        return True
    except Exception as e:
        print(f"Error deleting from GCS: {e}")
        return False


def delete_uploaded_file(blob_name_or_url):
    """Delete a previously uploaded logo from either local storage or GCS."""
    if not blob_name_or_url or not isinstance(blob_name_or_url, str):
        return False

    if blob_name_or_url.startswith("/uploads/logos/"):
        try:
            upload_dir = os.path.abspath(_ensure_local_upload_dir())
            filename = os.path.basename(blob_name_or_url)
            candidate = os.path.abspath(os.path.join(LOCAL_UPLOAD_DIR, filename))
            if not candidate.startswith(upload_dir + os.path.sep):
                return False
            if os.path.exists(candidate):
                os.remove(candidate)
                return True
            return False
        except Exception as error:
            print(f"Error deleting from local storage: {error}")
            return False

    return delete_from_gcs(blob_name_or_url)


def generate_safe_filename(original_filename, prefix=""):
    """
    Generates a safe, unique filename by removing non-ASCII characters
    and appending a timestamp/uuid.
    """
    ext = os.path.splitext(original_filename)[1]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    return f"{prefix}{timestamp}_{unique_id}{ext}"
