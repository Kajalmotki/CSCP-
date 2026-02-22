"""
epub_loader.py — Loads and indexes all CSCP EPUB modules at startup.
Provides a fast keyword-based search for relevant chunks.
"""

import os
import re
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup

# Paths to all 8 EPUB modules
MODULE_PATHS = [
    r"C:\Users\Siddharth\OneDrive\Desktop\CSCP\CSCP Modules\cscp2025_module1.epub",
    r"C:\Users\Siddharth\OneDrive\Desktop\CSCP\CSCP Modules\cscp2025_module2.epub",
    r"C:\Users\Siddharth\OneDrive\Desktop\CSCP\CSCP Modules\cscp2025_module3.epub",
    r"C:\Users\Siddharth\OneDrive\Desktop\CSCP\CSCP Modules\cscp2025_module4.epub",
    r"C:\Users\Siddharth\OneDrive\Desktop\CSCP\CSCP Modules\cscp2025_module5.epub",
    r"C:\Users\Siddharth\OneDrive\Desktop\CSCP\CSCP Modules\cscp2025_module6.epub",
    r"C:\Users\Siddharth\OneDrive\Desktop\CSCP\CSCP Modules\cscp2025_module7.epub",
    r"C:\Users\Siddharth\OneDrive\Desktop\CSCP\CSCP Modules\cscp2025_module8.epub",
]

# Global knowledge base — list of {"module": int, "text": str}
KNOWLEDGE_CHUNKS: list[dict] = []

def _extract_text_from_epub(path: str, module_num: int) -> list[dict]:
    """Extract all text chunks from an EPUB file."""
    chunks = []
    try:
        book = epub.read_epub(path)
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                soup = BeautifulSoup(item.get_content(), "lxml")
                text = soup.get_text(separator=" ", strip=True)
                # Split into paragraphs of ~500 chars
                paragraphs = [p.strip() for p in re.split(r'\n{2,}|(?<=\.)\s{2,}', text) if len(p.strip()) > 80]
                for para in paragraphs:
                    chunks.append({"module": module_num, "text": para})
    except Exception as e:
        print(f"[epub_loader] Warning: Could not load module {module_num}: {e}")
    return chunks


def load_all_modules():
    """Load all EPUB modules into the global knowledge base."""
    global KNOWLEDGE_CHUNKS
    KNOWLEDGE_CHUNKS = []
    for i, path in enumerate(MODULE_PATHS, start=1):
        if os.path.exists(path):
            chunks = _extract_text_from_epub(path, i)
            KNOWLEDGE_CHUNKS.extend(chunks)
            print(f"[epub_loader] Module {i}: loaded {len(chunks)} chunks from {os.path.basename(path)}")
        else:
            print(f"[epub_loader] Module {i}: file not found at {path}")
    print(f"[epub_loader] Total chunks loaded: {len(KNOWLEDGE_CHUNKS)}")


def search_relevant_chunks(query: str, top_n: int = 5) -> list[str]:
    """
    Find the most relevant text chunks for a given query.
    Uses simple keyword overlap scoring for fast, dependency-free matching.
    """
    if not KNOWLEDGE_CHUNKS:
        return ["No module data loaded yet."]

    # Tokenize query
    query_words = set(re.findall(r'\b\w{3,}\b', query.lower()))
    stop_words = {"the", "and", "for", "that", "this", "with", "are", "was", "what", "when", "how", "can", "should", "would", "could", "from", "have", "has", "been", "will", "them"}
    query_words -= stop_words

    scored = []
    for chunk in KNOWLEDGE_CHUNKS:
        text_lower = chunk["text"].lower()
        chunk_words = set(re.findall(r'\b\w{3,}\b', text_lower))
        score = len(query_words & chunk_words)
        if score > 0:
            scored.append((score, chunk))

    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_n]
    return [f"[Module {c['module']}] {c['text']}" for _, c in top]
