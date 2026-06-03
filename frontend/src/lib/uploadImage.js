import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const MAX_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Validating files before upload. Throws UploadError with error message.
 */

export function validateImage(file) {
  if (!file) {
    throw new UploadError("no_file", "No file selected.");
  }
  if (!file.type.startsWith("image/")) {
    throw new UploadError("bad_type", "Only image files are allowed.");
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new UploadError("too_big", `Image is ${mb} MB. Maximum is 5 MB.`);
  }
}

function buildPath(uid, file) {
  // crypto.randomUUID() avoids collisions if a user uploads two photos with the same name 
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const id = crypto.randomUUID();
  return `reports/${uid}/${id}.${ext}`;
}

/**
 * Uploads an image to Firebase Storage under reports/{uid}/{uuid}.{ext}.
 * Returns the download URL. Calls onProgress(0-100)
 */
export function uploadReportImage(file, uid, onProgress) {
  validateImage(file);

  const path = buildPath(uid, file);
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(pct);
      },
      (err) => {
        // Map Firebase's error codes to messages.
        if (err.code === "storage/unauthorized") {
          reject(new UploadError(
            "unauthorized",
            "Upload was blocked. Try logging out and back in."
          ));
        } else if (err.code === "storage/canceled") {
          reject(new UploadError("canceled", "Upload canceled."));
        } else if (err.code === "storage/quota-exceeded") {
          reject(new UploadError("quota", "Storage quota exceeded."));
        } else {
          reject(new UploadError("unknown", `Upload failed: ${err.message}`));
        }
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(new UploadError("url_failed", `Could not get image URL: ${e.message}`));
        }
      }
    );
  });
}