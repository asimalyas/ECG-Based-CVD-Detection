import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info.tsx";
import { getAccessToken } from "../lib/api";

interface ECGImageThumbnailProps {
  filePath: string;
  fileType: string;
  fileName: string;
  className?: string;
}

export function ECGImageThumbnail({
  filePath,
  fileType,
  fileName,
  className = "",
}: ECGImageThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isImage = fileType?.startsWith("image/");

  useEffect(() => {
    if (isImage && filePath) {
      fetchImage();
    } else {
      setLoading(false);
    }
  }, [filePath, fileType]);

  const fetchImage = async () => {
    try {
      const bucketName = "make-39210185-ecg-files";
      const token = getAccessToken() || publicAnonKey;

      // Construct the Supabase Storage URL
      const url = `https://${projectId}.supabase.co/storage/v1/object/authenticated/${bucketName}/${filePath}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Error fetching image:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isImage) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--bg-light)] rounded-lg p-2 ${className}`}
      >
        <FileText className="w-6 h-6 text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--bg-light)] rounded-lg p-2 ${className}`}
      >
        <div className="w-6 h-6 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--error-color)] bg-opacity-10 rounded-lg p-2 ${className}`}
      >
        <AlertCircle className="w-6 h-6 text-[var(--error-color)]" />
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-lg bg-[var(--bg-light)] ${className}`}
    >
      <img
        src={imageUrl}
        alt={fileName}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}