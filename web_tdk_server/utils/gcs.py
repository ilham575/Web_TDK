import os
from google.cloud import storage
import uuid
from datetime import datetime

# Get bucket name from environment variable
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "tdk-proj-489111_cloudbuild")

def upload_to_gcs(file_content, destination_blob_name, content_type, public=True):
    """
    Uploads a file to Google Cloud Storage.
    Returns the public URL of the uploaded file.
    """
    try:
        # Initialize storage client
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)

        # Upload the file
        blob.upload_from_string(file_content, content_type=content_type)
        
        # Note: In projects with Uniform Bucket-Level Access (default in many newer projects),
        # make_public() might fail. The URL below will work if the bucket or files are 
        # already configured for public read access.
        if public:
            try:
                blob.make_public()
            except Exception as pe:
                print(f"Warning: Could not make blob public (Bucket might have Uniform Bucket-Level Access): {pe}")
        
        # Return the public URL
        return f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{destination_blob_name}"
    except Exception as e:
        print(f"Error uploading to GCS: {e}")
        return None

def delete_from_gcs(blob_name_or_url):
    """
    Deletes a file from GCS given its public URL or blob name.
    """
    if not blob_name_or_url:
        return False
    
    try:
        # If it's a URL, extract the blob name
        if "storage.googleapis.com" in blob_name_or_url:
            blob_name = blob_name_or_url.split(f"{GCS_BUCKET_NAME}/")[-1]
        else:
            blob_name = blob_name_or_url
            
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)
        blob.delete()
        return True
    except Exception as e:
        print(f"Error deleting from GCS: {e}")
        return False

def generate_safe_filename(original_filename, prefix=""):
    """
    Generates a safe, unique filename by removing non-ASCII characters
    and appending a timestamp/uuid.
    """
    ext = os.path.splitext(original_filename)[1]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    return f"{prefix}{timestamp}_{unique_id}{ext}"
