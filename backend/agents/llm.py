"""
Groq LLM singleton configuration.
All agents share the same LLM instance to avoid unnecessary initialization.
"""
from crewai import LLM
from config import settings


# Singleton LLM instance
_llm_instance = None


def get_llm() -> LLM:
    """
    Get or create the singleton Groq LLM instance.

    Uses llama-4-scout-17b-16e-instruct which provides:
    - 30K TPM (tokens per minute)
    - 500K TPD (tokens per day)

    Returns:
        LLM: Configured Groq LLM instance
    """
    global _llm_instance

    if _llm_instance is None:
        _llm_instance = LLM(
            model="groq/meta-llama/llama-4-scout-17b-16e-instruct",
            api_key=settings.groq_api_key
        )

    return _llm_instance
