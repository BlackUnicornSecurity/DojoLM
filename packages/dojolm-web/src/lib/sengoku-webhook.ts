import { resolveAndValidateUrl } from 'bu-tpi/llm';

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export async function validateSengokuWebhookUrl(webhookUrl: string): Promise<WebhookValidationResult> {
  let parsed: URL;

  try {
    parsed = new URL(webhookUrl);
  } catch {
    return { valid: false, error: 'webhookUrl must be a valid URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'webhookUrl must use https' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'webhookUrl must not include credentials' };
  }

  const normalizedUrl = parsed.toString();
  const resolvedIp = await resolveAndValidateUrl(normalizedUrl);

  if (!resolvedIp) {
    return {
      valid: false,
      error: 'webhookUrl is unsafe or resolves to a private/internal address',
    };
  }

  return { valid: true, normalizedUrl };
}
