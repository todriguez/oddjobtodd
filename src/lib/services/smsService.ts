import { createLogger } from "@/lib/logger";
import { hasTwilioSms, getConfig } from "@/lib/config";
import { normalizePhone } from "@/lib/services/otpService";

// ─────────────────────────────────────────────
// SMS Service Adapter
//
// Real: Twilio Messages (when TWILIO_FROM_NUMBER is set)
// Mock: Console log (local dev)
// ─────────────────────────────────────────────

const log = createLogger("sms");

export interface SmsService {
  sendMessage(to: string, body: string): Promise<{ success: boolean; messageSid?: string }>;
}

// ── Twilio implementation ──────────────────

class TwilioSmsService implements SmsService {
  private client: ReturnType<typeof import("twilio")> | null = null;
  private fromNumber: string;

  constructor() {
    this.fromNumber = getConfig().TWILIO_FROM_NUMBER!;
  }

  private async getClient() {
    if (!this.client) {
      const twilio = (await import("twilio")).default;
      const config = getConfig();
      this.client = twilio(config.TWILIO_ACCOUNT_SID!, config.TWILIO_AUTH_TOKEN!);
    }
    return this.client;
  }

  async sendMessage(to: string, body: string): Promise<{ success: boolean; messageSid?: string }> {
    const normalized = normalizePhone(to);
    try {
      const client = await this.getClient();
      const message = await client.messages.create({
        to: normalized,
        from: this.fromNumber,
        body,
      });

      log.info({ to: maskPhone(normalized), sid: message.sid }, "sms.send.success");
      return { success: true, messageSid: message.sid };
    } catch (err) {
      log.error(
        { to: maskPhone(normalized), error: err instanceof Error ? err.message : String(err) },
        "sms.send.failure"
      );
      return { success: false };
    }
  }
}

// ── Mock implementation (local dev) ────────

class MockSmsService implements SmsService {
  async sendMessage(to: string, body: string): Promise<{ success: boolean; messageSid?: string }> {
    const normalized = normalizePhone(to);
    log.warn(
      { to: maskPhone(normalized), bodyLength: body.length },
      "sms.mock.send — TWILIO_FROM_NUMBER not set, SMS NOT actually sent. Set TWILIO_FROM_NUMBER to enable real SMS."
    );
    // Return failure so the admin UI doesn't show a false "sent" confirmation
    return { success: false };
  }
}

// ── Factory ────────────────────────────────

let _instance: SmsService | null = null;

export function getSmsService(): SmsService {
  if (_instance) return _instance;
  _instance = hasTwilioSms() ? new TwilioSmsService() : new MockSmsService();
  return _instance;
}

// ── Helpers ────────────────────────────────

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4);
}

// Re-export for convenience
export { normalizePhone } from "@/lib/services/otpService";
