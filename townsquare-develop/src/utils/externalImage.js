const IMAGE_PROXY_PATH = "/api/script-poster-image?url=";

export function normalizeExternalImageUrl(src) {
  const value = String(src || "").trim();
  if (!value) return "";
  if (value.startsWith("//")) {
    const protocol =
      typeof window !== "undefined" && window.location
        ? window.location.protocol
        : "https:";
    return `${protocol}${value}`;
  }
  return value;
}

export function shouldProxyExternalImages() {
  if (typeof navigator === "undefined") return false;
  return /micromessenger|wechat/i.test(navigator.userAgent || "");
}

export function proxiedExternalImageUrl(src) {
  const normalizedSrc = normalizeExternalImageUrl(src);
  if (!normalizedSrc || /^data:|^blob:/i.test(normalizedSrc)) {
    return normalizedSrc;
  }
  if (!/^https?:\/\//i.test(normalizedSrc)) return normalizedSrc;
  if (normalizedSrc.startsWith(IMAGE_PROXY_PATH)) return normalizedSrc;
  return `${IMAGE_PROXY_PATH}${encodeURIComponent(normalizedSrc)}`;
}

export function displayExternalImageUrl(src) {
  const normalizedSrc = normalizeExternalImageUrl(src);
  return shouldProxyExternalImages()
    ? proxiedExternalImageUrl(normalizedSrc)
    : normalizedSrc;
}
