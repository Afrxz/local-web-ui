"""Sliding window memory with token-budget logic.

Strategy: Keep the most recent messages that fit within a token budget.
Short exchanges preserve more turns; long code-heavy ones keep fewer.
"""

from backend.utils.tokens import estimate_tokens, estimate_message_tokens
from backend.config import MAX_HISTORY_MESSAGES


def compute_history_budget(
    max_context: int,
    system_prompt: str,
    max_response_tokens: int,
) -> int:
    """Calculate how many tokens are available for conversation history.

    history_budget = max_context - system_prompt_tokens - max_response_tokens
    """
    system_tokens = estimate_tokens(system_prompt)
    budget = max_context - system_tokens - max_response_tokens
    return max(budget, 0)


def trim_messages_to_budget(
    messages: list[dict],
    budget: int,
    max_messages: int = MAX_HISTORY_MESSAGES,
) -> list[dict]:
    """Select the most recent messages that fit within the token budget.

    Fills from the most recent messages backward until the budget is spent
    or max_messages is reached — whichever limit is hit first.

    Returns messages in chronological order (oldest first).
    """
    if not messages:
        return []

    selected = []
    tokens_used = 0

    # Walk backward from most recent
    for msg in reversed(messages):
        if len(selected) >= max_messages:
            break
        msg_tokens = estimate_message_tokens(msg)
        if tokens_used + msg_tokens > budget:
            break
        selected.append(msg)
        tokens_used += msg_tokens

    # Reverse to restore chronological order
    selected.reverse()
    return selected


def build_prompt_messages(
    system_prompt: str,
    history: list[dict],
    max_context: int,
    max_response_tokens: int,
) -> list[dict]:
    """Build the final message list to send to the model.

    1. Compute the history budget
    2. Trim history to fit
    3. Prepend system prompt
    """
    budget = compute_history_budget(max_context, system_prompt, max_response_tokens)
    trimmed = trim_messages_to_budget(history, budget)

    prompt_messages = []
    if system_prompt.strip():
        prompt_messages.append({"role": "system", "content": system_prompt})
    prompt_messages.extend(trimmed)

    return prompt_messages
