import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/signed-url";

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