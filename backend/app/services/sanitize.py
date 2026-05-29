import bleach


def sanitize_text(value: str) -> str:
    """
    Strip ALL HTML tags from user-supplied text but keep the text content.
    """
    if value is None:
        return value
    cleaned = bleach.clean(value, tags=[], attributes={}, strip=True, strip_comments=True)
    return cleaned.strip()