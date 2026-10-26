"""
OpenLens Model Gateway Adapter
Provider-neutral interface for open-source model inference.

Design:
- All adapters implement ModelGatewayAdapter (ABC).
- Secret redaction is applied before any prompt leaves the process.
- Model output is treated as a proposal, never executed directly.
- Local adapters (Ollama, vLLM) are preferred for privacy.
- Remote adapters require explicit user consent.
"""

from __future__ import annotations

import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Secret redaction patterns (conservative; never transmit detected secrets)
# ---------------------------------------------------------------------------

_REDACTION_PATTERNS = [
    re.compile(r'(?i)(api[_-]?key|secret|password|token|bearer)\s*[=:]\s*["\']?[\w\-\.]{8,}["\']?'),
    re.compile(r'(?i)(sk-|ghp_|glpat-|xoxb-|xoxs-)[a-zA-Z0-9\-_]{16,}'),
    re.compile(r'\b[A-Z0-9]{20,40}\b'),   # AWS-style access keys
]

def redact_secrets(text: str) -> str:
    """Replace potential secrets with [REDACTED]. Always applied before remote calls."""
    for pattern in _REDACTION_PATTERNS:
        text = pattern.sub('[REDACTED]', text)
    return text


# ---------------------------------------------------------------------------
# Data contracts
# ---------------------------------------------------------------------------

@dataclass
class BoundedPrompt:
    """A minimal, scoped prompt with explicit size limits and redaction applied."""
    system_instruction: str
    user_message: str
    max_tokens: int = 512
    temperature: float = 0.2
    metadata: dict = field(default_factory=dict)

    def redacted(self) -> "BoundedPrompt":
        return BoundedPrompt(
            system_instruction=redact_secrets(self.system_instruction),
            user_message=redact_secrets(self.user_message),
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            metadata=self.metadata,
        )


@dataclass
class ModelProposal:
    """Structured proposal returned by the model — a suggestion, not a command."""
    text: str
    model_id: str
    finish_reason: str
    is_truncated: bool = False
    provider: str = "unknown"
    note: str = "Model output is a proposal; verify before applying."


@dataclass
class ModelGatewayConfig:
    preferred_provider: str = field(
        default_factory=lambda: os.environ.get("OPENLENS_MODEL_PROVIDER", "local_stub")
    )
    local_base_url: str = field(
        default_factory=lambda: os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    local_model_name: str = field(
        default_factory=lambda: os.environ.get("OPENLENS_LOCAL_MODEL", "llama3")
    )
    remote_base_url: str = field(
        default_factory=lambda: os.environ.get("REMOTE_MODEL_BASE_URL", "")
    )
    remote_model_name: str = field(
        default_factory=lambda: os.environ.get("REMOTE_MODEL_NAME", "")
    )
    allow_remote: bool = field(
        default_factory=lambda: os.environ.get("OPENLENS_ALLOW_REMOTE", "false").lower() == "true"
    )


# ---------------------------------------------------------------------------
# Abstract adapter
# ---------------------------------------------------------------------------

class ModelGatewayAdapter(ABC):
    """Provider-neutral interface for language model inference."""

    @abstractmethod
    async def complete(self, prompt: BoundedPrompt) -> ModelProposal:
        """
        Submit a bounded prompt and return a model proposal.
        Must redact secrets before transmitting and never execute model output.
        """
        ...

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Identifier string for this model (used in evaluation records)."""
        ...

    @property
    @abstractmethod
    def is_available(self) -> bool:
        """True if the adapter can currently serve requests."""
        ...


# ---------------------------------------------------------------------------
# Local Ollama adapter
# ---------------------------------------------------------------------------

class OllamaAdapter(ModelGatewayAdapter):
    """
    Adapter for locally running Ollama (https://ollama.ai).
    No data leaves the local machine.
    """

    def __init__(self, base_url: str, model_name: str):
        self._base_url = base_url.rstrip("/")
        self._model_name = model_name
        self._available: Optional[bool] = None

    @property
    def model_id(self) -> str:
        return f"ollama/{self._model_name}"

    @property
    def is_available(self) -> bool:
        return self._available is not False

    async def complete(self, prompt: BoundedPrompt) -> ModelProposal:
        safe_prompt = prompt.redacted()
        try:
            import httpx  # type: ignore
            payload = {
                "model": self._model_name,
                "prompt": f"{safe_prompt.system_instruction}\n\n{safe_prompt.user_message}",
                "stream": False,
                "options": {
                    "temperature": safe_prompt.temperature,
                    "num_predict": safe_prompt.max_tokens,
                },
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{self._base_url}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
                self._available = True
                return ModelProposal(
                    text=data.get("response", ""),
                    model_id=self.model_id,
                    finish_reason=data.get("done_reason", "stop"),
                    provider="ollama",
                )
        except Exception as exc:
            logger.warning("Ollama unavailable: %s", exc)
            self._available = False
            raise


# ---------------------------------------------------------------------------
# Stub adapter (always available; returns transparent placeholder)
# ---------------------------------------------------------------------------

class StubAdapter(ModelGatewayAdapter):
    """
    Transparent stub adapter for offline / test environments.
    Returns a clearly-labelled placeholder so callers know AI is unavailable.
    """

    @property
    def model_id(self) -> str:
        return "stub/no-model"

    @property
    def is_available(self) -> bool:
        return True

    async def complete(self, prompt: BoundedPrompt) -> ModelProposal:
        return ModelProposal(
            text=(
                "[AI interpretation unavailable — no model configured] "
                "Deterministic findings above are from local static analysis. "
                "Configure OPENLENS_MODEL_PROVIDER to enable contextual explanations."
            ),
            model_id=self.model_id,
            finish_reason="stub",
            provider="stub",
            note="Stub adapter active. No model has been invoked.",
        )


# ---------------------------------------------------------------------------
# Gateway (routes to available adapter, falls back to stub)
# ---------------------------------------------------------------------------

class ModelGateway:
    """
    Routes inference requests to the best available adapter according to
    privacy configuration and task requirements.
    Always falls back to the stub adapter rather than raising.
    """

    def __init__(self, config: Optional[ModelGatewayConfig] = None):
        self._config = config or ModelGatewayConfig()
        self._adapters: list[ModelGatewayAdapter] = []
        self._stub = StubAdapter()
        self._build_adapter_chain()

    def _build_adapter_chain(self):
        provider = self._config.preferred_provider
        if provider == "ollama":
            self._adapters.append(OllamaAdapter(
                self._config.local_base_url,
                self._config.local_model_name,
            ))
        # Remote adapters only when explicitly allowed
        if self._config.allow_remote and self._config.remote_base_url:
            logger.info("Remote model adapter enabled — user consent required per request.")
            # Extend with RemoteAdapter when implementing Phase 3
        # Stub is always last
        self._adapters.append(self._stub)

    async def complete(self, prompt: BoundedPrompt) -> ModelProposal:
        """
        Attempt each adapter in order; return the first successful response.
        Always returns a ModelProposal (stub as final fallback).
        """
        for adapter in self._adapters:
            if not adapter.is_available:
                continue
            try:
                result = await adapter.complete(prompt)
                logger.info("Model response from %s", adapter.model_id)
                return result
            except Exception as exc:
                logger.warning("Adapter %s failed: %s", adapter.model_id, exc)
                continue
        # Unreachable in theory (stub always succeeds), but be defensive
        return await self._stub.complete(prompt)

    @property
    def active_model_id(self) -> str:
        for adapter in self._adapters:
            if adapter.is_available and adapter.model_id != "stub/no-model":
                return adapter.model_id
        return "stub/no-model"
