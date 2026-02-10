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
    """
    content = message.get("content", "")
    role_overhead = 4
    return estimate_tokens(content) + role_overhead


def estimate_messages_tokens(messages: list[dict]) -> int:
    """Estimate total tokens for a list of messages."""
    return sum(estimate_message_tokens(m) for m in messages)
