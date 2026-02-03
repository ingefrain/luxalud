import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSignedUrl, extractFilePath } from "@/hooks/useSignedUrl";
import { Loader2, Eye, Download } from "lucide-react";

interface SecureFileLinkProps {
  bucket: string;
  filePath: string;
  fileName: string;
  action: "view" | "download";
  className?: string;
}

/**
 * Secure file link component that generates signed URLs on-demand
 * Prevents storing/exposing permanent URLs
 */
export function SecureFileLink({
  bucket,
  filePath,
  fileName,
  action,
  className,
}: SecureFileLinkProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const path = extractFilePath(filePath, bucket);
      const signedUrl = await getSignedUrl(bucket, path, 300); // 5 minute expiry

      if (!signedUrl) {
        console.error("Failed to generate signed URL");
        return;
      }

      if (action === "view") {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      } else {
        // Create a temporary link for download
        const link = document.createElement("a");
        link.href = signedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setLoading(false);
    }
  };

  const Icon = action === "view" ? Eye : Download;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </Button>
  );
}
