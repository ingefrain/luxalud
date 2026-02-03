import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseSignedUrlOptions {
  expiresIn?: number; // seconds, default 1 hour
}

/**
 * Hook to generate signed URLs for private storage files
 * Generates on-demand, short-lived URLs for secure file access
 */
export function useSignedUrl(
  bucket: string,
  filePath: string | null,
  options: UseSignedUrlOptions = {}
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { expiresIn = 3600 } = options; // 1 hour default

  const generateUrl = useCallback(async () => {
    if (!filePath) {
      setSignedUrl(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (signError) throw signError;

      setSignedUrl(data.signedUrl);
      return data.signedUrl;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to generate signed URL");
      setError(error);
      setSignedUrl(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [bucket, filePath, expiresIn]);

  useEffect(() => {
    generateUrl();
  }, [generateUrl]);

  return { signedUrl, loading, error, refresh: generateUrl };
}

/**
 * Generate a signed URL on-demand (non-hook version)
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Extract file path from stored URL or path
 * Handles both full URLs and relative paths
 */
export function extractFilePath(storedValue: string, bucket: string): string {
  // If it's a full URL, extract the path
  if (storedValue.includes(`/storage/v1/object/public/${bucket}/`)) {
    return storedValue.split(`/storage/v1/object/public/${bucket}/`)[1];
  }
  if (storedValue.includes(`/storage/v1/object/sign/${bucket}/`)) {
    return storedValue.split(`/storage/v1/object/sign/${bucket}/`)[1].split("?")[0];
  }
  // Assume it's already a relative path
  return storedValue;
}
