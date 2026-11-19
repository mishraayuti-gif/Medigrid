/**
 * Ollama LLM Integration Service for MindCare AI.
 * Supports both local Ollama (http://localhost:11434/api/chat) and
 * authenticated Ollama Cloud / OpenAI-compatible Ollama endpoints
 * (e.g. https://ollama.com/api/chat or https://ollama.com/v1/chat/completions).
 *
 * Implements:
 * - Health check
 * - AI Wellness Companion chat
 * - Stress assessment interpretation (strictly interpreting deterministic backend scores)
 * - Journal analysis
 * - Exercise recommendations
 * - Music recommendations
 *
 * Guarantees honest offline handling: if Ollama is unreachable or returns invalid JSON,
 * callers receive { aiAvailable: false, error, fallback } and never pretend AI succeeded.
 */

const WELLNESS_SYSTEM_PROMPT = `You are the MindCare AI Wellness Companion.
Your purpose is to offer warm, grounded, empathetic mental wellness support, reflection, and practical non-clinical self-care guidance.

STRICT SAFETY RULES:
1. Never diagnose medical, psychiatric, or psychological conditions.
2. Never prescribe or recommend specific medications or dosages.
3. Never invent or alter numerical stress scores—only interpret the deterministic score provided to you.
4. Keep advice concise, supportive, and grounded in everyday practices (breathing, stretching, sleep hygiene, journaling, seeking human/professional support when appropriate).
5. If a user expresses suicidal ideation, self-harm intent, or acute danger, prioritize empathy and immediately urge them to contact emergency services (911) or the 988 Suicide & Crisis Lifeline (call/text 988) or text HOME to 741741.`;

function getOllamaConfig() {
  const rawBase = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').trim();
  const model = (process.env.OLLAMA_MODEL || 'llama3.1').trim().replace(/^['"]|['"]$/g, '');
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 25000);
  const rawKey = (process.env.OLLAMA_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  const apiKey = rawKey.replace(/^Bearer\s+/i, '').trim();

  // Extract a valid http(s) URL even if a full curl command or quotes were pasted into OLLAMA_BASE_URL
  const urlMatch = rawBase.match(/https?:\/\/[^\s'"\\]+/i);
  let extractedUrl = urlMatch ? urlMatch[0] : rawBase.replace(/^['"]|['"]$/g, '');

  // Strip trailing slashes
  extractedUrl = extractedUrl.replace(/\/+$/, '');

  let preferOpenAICompat = false;
  let baseUrl = extractedUrl;

  if (/\/v1\/chat\/completions$/i.test(extractedUrl)) {
    preferOpenAICompat = true;
    baseUrl = extractedUrl.replace(/\/v1\/chat\/completions$/i, '');
  } else if (/\/v1$/i.test(extractedUrl)) {
    preferOpenAICompat = true;
    baseUrl = extractedUrl.replace(/\/v1$/i, '');
  } else if (/\/api\/chat$/i.test(extractedUrl)) {
    baseUrl = extractedUrl.replace(/\/api\/chat$/i, '');
  } else if (/\/api\/tags$/i.test(extractedUrl)) {
    baseUrl = extractedUrl.replace(/\/api\/tags$/i, '');
  }

  let validUrl = true;
  let isOllamaCloud = false;
  try {
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      validUrl = false;
    } else {
      isOllamaCloud = parsed.hostname === 'ollama.com' || parsed.hostname.endsWith('.ollama.com');
    }
  } catch {
    validUrl = false;
  }

  if (!validUrl) {
    baseUrl = 'http://localhost:11434';
    preferOpenAICompat = false;
    isOllamaCloud = false;
  }

  return {
    baseUrl,
    model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 25000,
    apiKey,
    preferOpenAICompat,
    isOllamaCloud,
    wasSanitized: extractedUrl !== rawBase || !validUrl,
  };
}

function buildAuthHeaders(apiKey, includeJson = false) {
  const headers = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonObject(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

let lastInferenceIssue = null;

export async function checkHealth() {
  const cfg = getOllamaConfig();

  if (cfg.isOllamaCloud && !cfg.apiKey) {
    return {
      available: false,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      modelLoaded: false,
      models: [],
      error: `Ollama Cloud (${cfg.baseUrl}) requires OLLAMA_API_KEY to be configured in Secrets.`,
    };
  }

  const endpoints = cfg.preferOpenAICompat
    ? [
        { url: `${cfg.baseUrl}/v1/models`, kind: 'openai' },
        { url: `${cfg.baseUrl}/api/tags`, kind: 'ollama' },
      ]
    : [
        { url: `${cfg.baseUrl}/api/tags`, kind: 'ollama' },
        { url: `${cfg.baseUrl}/v1/models`, kind: 'openai' },
      ];

  let lastError = `Ollama is not reachable at ${cfg.baseUrl}`;

  for (const ep of endpoints) {
    try {
      const res = await fetchWithTimeout(
        ep.url,
        {
          method: 'GET',
          headers: buildAuthHeaders(cfg.apiKey, false),
        },
        5000
      );

      if (!res.ok) {
        lastError =
          res.status === 401 || res.status === 403
            ? `Ollama authentication failed (HTTP ${res.status}). Check OLLAMA_API_KEY.`
            : `Ollama responded with HTTP ${res.status} at ${ep.url}`;
        continue;
      }

      const data = await res.json();
      let models = [];
      if (ep.kind === 'ollama' && Array.isArray(data?.models)) {
        models = data.models.map((m) => m.name || m.model).filter(Boolean);
      } else if (Array.isArray(data?.data)) {
        models = data.data.map((m) => m.id).filter(Boolean);
      }

      const hasConfiguredModel =
        models.length === 0 ||
        models.some((name) => name === cfg.model || name.startsWith(`${cfg.model}:`));

      if (lastInferenceIssue && Date.now() - lastInferenceIssue.at < 10 * 60 * 1000) {
        return {
          available: false,
          baseUrl: cfg.baseUrl,
          model: cfg.model,
          modelLoaded: hasConfiguredModel,
          models,
          error: lastInferenceIssue.message,
        };
      }

      return {
        available: true,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
        modelLoaded: hasConfiguredModel,
        models,
        error: null,
      };
    } catch (err) {
      lastError =
        err?.name === 'AbortError'
          ? `Ollama health check timed out at ${cfg.baseUrl}`
          : `Ollama is not reachable at ${cfg.baseUrl} (${err?.message || 'connection refused'})`;
    }
  }

  return {
    available: false,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    modelLoaded: false,
    models: [],
    error: lastError,
  };
}

function formatOllamaHttpError(status, rawText, endpointLabel) {
  let detail = '';
  if (rawText) {
    try {
      const parsed = JSON.parse(rawText);
      detail = parsed?.error?.message || parsed?.error || parsed?.message || '';
    } catch {
      detail = rawText.trim().slice(0, 160);
    }
  }

  if (status === 402) {
    return 'Ollama Cloud credits are exhausted or require an active plan. Deterministic wellness guidance is active until credits are added or a local Ollama server is configured.';
  }
  if (status === 401 || status === 403) {
    return `Ollama authentication failed (HTTP ${status}). Verify OLLAMA_API_KEY in Secrets.`;
  }
  if (status === 429) {
    return 'Ollama rate limit reached. Please wait a moment and try again.';
  }
  if (status === 404) {
    return `Configured Ollama model or ${endpointLabel} endpoint was not found (HTTP 404).`;
  }
  return detail
    ? `Ollama request failed (HTTP ${status}): ${detail}`
    : `Ollama ${endpointLabel} failed (HTTP ${status}).`;
}

async function callNativeOllamaChat(cfg, messages, formatJson) {
  const payload = {
    model: cfg.model,
    messages,
    stream: false,
    options: {
      temperature: 0.4,
    },
  };
  if (formatJson) {
    payload.format = 'json';
  }

  const res = await fetchWithTimeout(
    `${cfg.baseUrl}/api/chat`,
    {
      method: 'POST',
      headers: buildAuthHeaders(cfg.apiKey, true),
      body: JSON.stringify(payload),
    },
    cfg.timeoutMs
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(formatOllamaHttpError(res.status, text, '/api/chat'));
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Ollama returned an empty response payload.');
  }
  return content;
}

async function callOpenAICompatChat(cfg, messages, formatJson) {
  const payload = {
    model: cfg.model,
    messages,
    stream: false,
    temperature: 0.4,
  };
  if (formatJson) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetchWithTimeout(
    `${cfg.baseUrl}/v1/chat/completions`,
    {
      method: 'POST',
      headers: buildAuthHeaders(cfg.apiKey, true),
      body: JSON.stringify(payload),
    },
    cfg.timeoutMs
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(formatOllamaHttpError(res.status, text, '/v1/chat/completions'));
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Ollama returned an empty chat completion payload.');
  }
  return content;
}

function formatOllamaNetworkError(err, baseUrl) {
  if (err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''))) {
    return `Ollama at ${baseUrl} did not respond in time. Guided Wellness Mode is active so you can continue smoothly.`;
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(String(err?.message || ''))) {
    return `Ollama at ${baseUrl} is currently unreachable. Guided Wellness Mode is active until Ollama is connected.`;
  }
  return err?.message || 'Unable to reach Ollama service. Guided Wellness Mode is active.';
}

async function callOllamaChat(messages, formatJson = false) {
  const cfg = getOllamaConfig();

  if (
    lastInferenceIssue &&
    lastInferenceIssue.status === 402 &&
    Date.now() - lastInferenceIssue.at < 60 * 1000
  ) {
    const cachedErr = new Error(lastInferenceIssue.message);
    cachedErr.status = 402;
    throw cachedErr;
  }

  const attempt = async () => {
    if (cfg.preferOpenAICompat) {
      try {
        return await callOpenAICompatChat(cfg, messages, formatJson);
      } catch (err) {
        if (err?.status === 404 || err?.status === 405) {
          return await callNativeOllamaChat(cfg, messages, formatJson);
        }
        throw err;
      }
    }

    try {
      return await callNativeOllamaChat(cfg, messages, formatJson);
    } catch (err) {
      if (err?.status === 404 || err?.status === 405) {
        return await callOpenAICompatChat(cfg, messages, formatJson);
      }
      throw err;
    }
  };

  try {
    const content = await attempt();
    lastInferenceIssue = null;
    return content;
  } catch (err) {
    if ([401, 402, 403].includes(err?.status)) {
      lastInferenceIssue = {
        at: Date.now(),
        status: err.status,
        message: err.message,
      };
      throw err;
    }
    const friendly = new Error(formatOllamaNetworkError(err, cfg.baseUrl));
    friendly.status = err?.status;
    throw friendly;
  }
}

export async function chatWithCompanion(historyMessages, latestUserMessage, userContext = {}) {
  const cfg = getOllamaConfig();
  const contextSummary = userContext?.summaryText
    ? `\n\nOptional User Wellness Context (use gently without sounding robotic): ${userContext.summaryText}`
    : '';

  const messages = [
    {
      role: 'system',
      content: `${WELLNESS_SYSTEM_PROMPT}${contextSummary}`,
    },
    ...(Array.isArray(historyMessages) ? historyMessages.slice(-10) : []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
    {
      role: 'user',
      content: String(latestUserMessage || ''),
    },
  ];

  try {
    const reply = await callOllamaChat(messages, false);
    return {
      aiAvailable: true,
      model: cfg.model,
      reply: reply.trim(),
      error: null,
    };
  } catch (err) {
    return {
      aiAvailable: false,
      model: cfg.model,
      reply: null,
      error: err?.message || 'Unable to connect to Ollama LLM.',
    };
  }
}

export async function analyzeStressAssessment({ score, category, breakdown, responses }) {
  const cfg = getOllamaConfig();
  const prompt = `Analyze this deterministic mental wellness stress check-in and return STRICT JSON only.
Do NOT change or recalculate the score. The authoritative backend score is ${score}/100 (${category}).

Dimension breakdown:
${JSON.stringify(breakdown, null, 2)}

User reflection note: "${String(responses?.freeTextReflection || 'None provided').slice(0, 800)}"
Selected stress causes: ${JSON.stringify(responses?.stressCauses || [])}

Return JSON with this exact schema:
{
  "emotionalObservations": ["2 to 3 concise grounded observations"],
  "supportiveExplanation": "1 warm paragraph explaining what this score range suggests without diagnosing any medical condition",
  "personalizedRecommendations": ["3 practical self-care recommendations"],
  "actionPlan": ["3 short step-by-step actions for today"]
}`;

  try {
    const raw = await callOllamaChat(
      [
        { role: 'system', content: WELLNESS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      true
    );
    const parsed = extractJsonObject(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.emotionalObservations) ||
      typeof parsed.supportiveExplanation !== 'string' ||
      !Array.isArray(parsed.personalizedRecommendations) ||
      !Array.isArray(parsed.actionPlan)
    ) {
      throw new Error('Ollama returned invalid JSON structure for stress analysis.');
    }

    return {
      aiAvailable: true,
      model: cfg.model,
      analysis: {
        emotionalObservations: parsed.emotionalObservations.slice(0, 4).map(String),
        supportiveExplanation: String(parsed.supportiveExplanation),
        personalizedRecommendations: parsed.personalizedRecommendations.slice(0, 4).map(String),
        actionPlan: parsed.actionPlan.slice(0, 4).map(String),
      },
      error: null,
    };
  } catch (err) {
    return {
      aiAvailable: false,
      model: cfg.model,
      analysis: null,
      error: err?.message || 'Ollama stress interpretation unavailable.',
    };
  }
}

export async function analyzeJournalEntry({ mood, intensity, note, journalText }) {
  const cfg = getOllamaConfig();
  const prompt = `Reflect empathetically on this private wellness journal entry and return STRICT JSON only.
Mood: ${mood} (Intensity ${intensity}/10)
Short note: "${String(note || '').slice(0, 300)}"
Journal entry: "${String(journalText || '').slice(0, 2000)}"

Return JSON with this exact schema:
{
  "keyThemes": ["2 to 3 brief emotional themes"],
  "empatheticReflection": "2-3 warm supportive sentences validating the user's experience without diagnosing",
  "gentleReframe": "1 constructive perspective or self-compassion prompt",
  "suggestedNextStep": "1 small actionable wellness activity for right now"
}`;

  try {
    const raw = await callOllamaChat(
      [
        { role: 'system', content: WELLNESS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      true
    );
    const parsed = extractJsonObject(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.keyThemes) ||
      typeof parsed.empatheticReflection !== 'string' ||
      typeof parsed.gentleReframe !== 'string' ||
      typeof parsed.suggestedNextStep !== 'string'
    ) {
      throw new Error('Ollama returned invalid JSON structure for journal analysis.');
    }

    return {
      aiAvailable: true,
      model: cfg.model,
      analysis: {
        keyThemes: parsed.keyThemes.slice(0, 4).map(String),
        empatheticReflection: String(parsed.empatheticReflection),
        gentleReframe: String(parsed.gentleReframe),
        suggestedNextStep: String(parsed.suggestedNextStep),
      },
      error: null,
    };
  } catch (err) {
    return {
      aiAvailable: false,
      model: cfg.model,
      analysis: null,
      error: err?.message || 'Ollama journal reflection unavailable.',
    };
  }
}

export async function recommendExercises(wellnessState, exercisesCatalog) {
  const cfg = getOllamaConfig();
  const catalogSummary = exercisesCatalog.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    durationMinutes: Math.round(e.durationSeconds / 60),
    difficulty: e.difficulty,
  }));

  const prompt = `Select 3 exercise IDs from the provided catalog that best fit this user's current wellness state. Return STRICT JSON only.
Wellness state: ${JSON.stringify(wellnessState)}
Available exercises: ${JSON.stringify(catalogSummary)}

Return JSON:
{
  "recommendedIds": ["id1", "id2", "id3"],
  "rationale": "1-2 sentences explaining why these exercises match their current mood and stress level"
}`;

  try {
    const raw = await callOllamaChat(
      [
        { role: 'system', content: WELLNESS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      true
    );
    const parsed = extractJsonObject(raw);
    const validIds = new Set(exercisesCatalog.map((e) => e.id));
    const ids = Array.isArray(parsed?.recommendedIds)
      ? parsed.recommendedIds.filter((id) => validIds.has(id)).slice(0, 3)
      : [];
    if (ids.length === 0 || typeof parsed?.rationale !== 'string') {
      throw new Error('Ollama returned invalid exercise recommendation payload.');
    }
    return {
      aiAvailable: true,
      model: cfg.model,
      recommendedIds: ids,
      rationale: parsed.rationale,
      error: null,
    };
  } catch (err) {
    return {
      aiAvailable: false,
      model: cfg.model,
      recommendedIds: null,
      rationale: null,
      error: err?.message || 'Ollama exercise recommendation unavailable.',
    };
  }
}

export async function recommendMusic(wellnessState, musicCatalog) {
  const cfg = getOllamaConfig();
  const catalogSummary = musicCatalog.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    moodTags: t.moodTags,
  }));

  const prompt = `Select 3 soundscape/music track IDs from the catalog for the user's current state. Return STRICT JSON only.
Wellness state: ${JSON.stringify(wellnessState)}
Catalog: ${JSON.stringify(catalogSummary)}

Return JSON:
{
  "recommendedIds": ["id1", "id2", "id3"],
  "rationale": "1-2 sentences explaining why these soundscapes support their state"
}`;

  try {
    const raw = await callOllamaChat(
      [
        { role: 'system', content: WELLNESS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      true
    );
    const parsed = extractJsonObject(raw);
    const validIds = new Set(musicCatalog.map((t) => t.id));
    const ids = Array.isArray(parsed?.recommendedIds)
      ? parsed.recommendedIds.filter((id) => validIds.has(id)).slice(0, 3)
      : [];
    if (ids.length === 0 || typeof parsed?.rationale !== 'string') {
      throw new Error('Ollama returned invalid music recommendation payload.');
    }
    return {
      aiAvailable: true,
      model: cfg.model,
      recommendedIds: ids,
      rationale: parsed.rationale,
      error: null,
    };
  } catch (err) {
    return {
      aiAvailable: false,
      model: cfg.model,
      recommendedIds: null,
      rationale: null,
      error: err?.message || 'Ollama music recommendation unavailable.',
    };
  }
}

export default {
  checkHealth,
  chatWithCompanion,
  analyzeStressAssessment,
  analyzeJournalEntry,
  recommendExercises,
  recommendMusic,
};
