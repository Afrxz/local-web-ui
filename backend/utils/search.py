"""Web search utility — DuckDuckGo search with top-result page fetch."""

import asyncio
import re
from datetime import datetime, timezone

import httpx
from duckduckgo_search import DDGS


def _strip_html(html: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def _fetch_page_text(url: str, timeout: float = 5.0) -> str:
    """Fetch a URL and return stripped plain text, truncated to ~1500 chars."""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            text = _strip_html(resp.text)
            return text[:1500]
    except Exception:
        return ""


def _ddg_search(query: str, num_results: int = 5) -> list[dict]:
    """Run DuckDuckGo text search (sync, runs in thread)."""
    with DDGS() as ddgs:
        return list(ddgs.text(query, max_results=num_results))


async def web_search(query: str, num_results: int = 5) -> str:
    """Search the web for *query* and return a formatted context block.

    - Uses DuckDuckGo for top results (title, snippet, URL).
    - Fetches the full page text of the #1 result in parallel.
    - Returns empty string on any failure (graceful degradation).
    """
    try:
        # Run DDG search in a thread (it's synchronous)
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(None, _ddg_search, query, num_results)

        if not results:
            return ""

        # Fetch top result page in parallel with formatting
        top_url = results[0].get("href", "")
        page_text_task = asyncio.create_task(_fetch_page_text(top_url)) if top_url else None

        # Wait for page fetch
        page_text = await page_text_task if page_text_task else ""

        # Build formatted context block
        now = datetime.now(timezone.utc)
        date_str = now.strftime("%A, %B %d, %Y, %I:%M %p UTC")
        lines = [f"[Current date and time: {date_str}]"]
        lines.append(f'[Web Search Results for: "{query}"]\n')

        # Detailed top source
        top = results[0]
        lines.append("[Detailed source]")
        lines.append(f"{top.get('title', '')} ({top.get('href', '')})")
        if page_text:
            lines.append(page_text)
        else:
            lines.append(top.get("body", ""))
        lines.append("")

        # Additional sources
        if len(results) > 1:
            lines.append("[Additional sources]")
            for i, r in enumerate(results[1:], start=2):
                title = r.get("title", "")
                snippet = r.get("body", "")
                url = r.get("href", "")
                lines.append(f"{i}. {title} - {snippet} ({url})")
            lines.append("")

        return "\n".join(lines)

    except Exception:
        return ""
