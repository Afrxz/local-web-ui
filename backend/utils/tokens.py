"""Token counting/estimation utilities.

Uses a simple word-based approximation (words * 1.3) for v1.
This is intentionally rough — APIs return clear errors on context overflow,
so exact counts aren't critical.
"""


def estimate_tokens(text: str) -> int:
    """Estimate token count for a string using word-based approximation."""
    if not text:
        return 0
    words = len(text.split())
    return int(words * 1.3)


def estimate_message_tokens(message: dict) -> int:
    """Estimate tokens for a single chat message.

    Accounts for role overhead (~4 tokens per message for formatting).
    Content may be a string or a vision content-array (list of parts).
    """
    content = message.get("content", "")
    role_overhead = 4
    if isinstance(content, list):
        # Vision content array — count only text parts, images are ~85 tokens each
        text = " ".join(p.get("text", "") for p in content if p.get("type") == "text")
        image_count = sum(1 for p in content if p.get("type") == "image_url")
        return estimate_tokens(text) + (image_count * 85) + role_overhead
    return estimate_tokens(content) + role_overhead


def estimate_messages_tokens(messages: list[dict]) -> int:
    """Estimate total tokens for a list of messages."""
    return sum(estimate_message_tokens(m) for m in messages)
