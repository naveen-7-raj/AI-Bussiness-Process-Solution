import os
import httpx
import logging

logger = logging.getLogger("llm_layer")

def get_deterministic_fallback(prediction: str, risk: str, root_causes: str, recommendation: str) -> str:
    """
    Deterministic template fallback when the LLM is unavailable or not configured.
    """
    # Clean up root causes for a readable flow
    causes_clean = root_causes.replace("\n", " ").strip()
    if not causes_clean or "No specific SHAP" in causes_clean:
        causes_phrase = "system load indicators"
    else:
        # Simplify explanation lists for managers if possible
        causes_phrase = causes_clean

    return f"Risk is {risk} ({prediction}) due to {causes_phrase}. Recommended: {recommendation}"

async def generate_business_explanation(prediction: str, risk: str, root_causes: str, recommendation: str) -> str:
    """
    Tries to generate a concise business explanation using the Gemini Free API
    if GEMINI_API_KEY is configured. Falls back to a deterministic template otherwise.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.info("GEMINI_API_KEY not configured. Using deterministic fallback.")
        return get_deterministic_fallback(prediction, risk, root_causes, recommendation)

    # Use Gemini 2.5 Flash which has a free tier
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = (
        "You are an operations translator. Translate the following technical logistics metrics into a single "
        "concise sentence for a business manager.\n\n"
        "STRICT COMPLIANCE RULES:\n"
        "- Do NOT predict or calculate risk.\n"
        "- Do NOT invent any numbers. Use only the provided metrics.\n"
        "- Do NOT invent causes or reasons. Use only the provided SHAP causes.\n"
        "- Do NOT create new recommendations. Use only the provided recommendation.\n"
        "- Make it a smooth, readable summary.\n\n"
        f"DATA:\n"
        f"- Prediction: {prediction}\n"
        f"- Risk Level: {risk}\n"
        f"- SHAP Root Causes: {root_causes}\n"
        f"- Recommendation: {recommendation}\n\n"
        "Concise Business Explanation:"
    )

    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 100
        }
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                result = response.json()
                text = result["contents"][0]["parts"][0]["text"].strip()
                # Clean up any potential markdown wraps
                text = text.replace('"', '').replace('**', '').strip()
                if text:
                    return text
            logger.warning(f"Gemini API returned status code {response.status_code}. Falling back.")
    except Exception as e:
        logger.error(f"Failed to generate LLM explanation: {e}. Falling back.")

    return get_deterministic_fallback(prediction, risk, root_causes, recommendation)
