import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/signed-url";
import { AvatarImage } from "@/components/ui/avatar";

type Bucket = "profile-pictures" | "chat-files" | "jozveh-files";

export function useSignedUrl(bucket: Bucket, value: string | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!value) { setUrl(undefined); return; }
    getSignedUrl(bucket, value).then((u) => { if (!cancelled) setUrl(u ?? undefined); });
    return () => { cancelled = true; };
  }, [bucket, value]);
  return url;
}

interface SignedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  bucket: Bucket;
  source: string | null | undefined;
}

export function SignedImage({ bucket, source, ...rest }: SignedImageProps) {
  const url = useSignedUrl(bucket, source);
  if (!url) return null;
  return <img src={url} {...rest} />;
}

interface SignedLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  bucket: Bucket;
  source: string | null | undefined;
  children: React.ReactNode;
}

export function SignedLink({ bucket, source, children, ...rest }: SignedLinkProps) {
  const handle = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const u = await getSignedUrl(bucket, source);
    if (u) window.open(u, "_blank", "noopener,noreferrer");
  };
  return (
    <a href="#" onClick={handle} {...rest}>
      {children}
    </a>
  );
}

interface SignedAvatarImageProps {
  bucket?: Bucket;
  source: string | null | undefined;
  className?: string;
}

export function SignedAvatarImage({ bucket = "profile-pictures", source, className }: SignedAvatarImageProps) {
  const url = useSignedUrl(bucket, source);
  return <AvatarImage src={url} className={className} />;
}

import { FileText as _FileText } from "lucide-react";

export function ChatFileAttachment({ url, name, isImage, isAudio }: { url: string | null | undefined; name?: string | null; isImage?: boolean; isAudio?: boolean; }) {
  const signed = useSignedUrl("chat-files", url);
  if (!signed) return null;
  if (isImage) {
    return <img src={signed} alt={name || "تصویر"} className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(signed, "_blank")} />;
  }
  if (isAudio) {
    return <audio controls src={signed} className="max-w-full" />;
  }
  return (
    <a href={signed} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
      <_FileText className="w-4 h-4" /> {name || "فایل"}
    </a>
  );
}