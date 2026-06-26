import { logger } from "./logger";

/**
 * Sends an SMS to a customer's phone.
 *
 * This is provider-agnostic and dormant until you configure an SMS gateway via
 * environment variables. Until then it records the message in the logs and
 * returns `{ sent: false }`, so the order workflow still works — no text just
 * goes out yet.
 *
 * To activate (recommended Bangladeshi gateway: bulksmsbd.net), set:
 *   SMS_API_KEY      your gateway API key
 *   SMS_SENDER_ID    your approved sender/mask id
 *   SMS_API_URL      (optional) defaults to https://bulksmsbd.net/api/smsapi
 *
 * For a different HTTP gateway, set SMS_API_URL to its endpoint; the call below
 * follows the common bulksmsbd query format. Adjust here if your provider
 * differs.
 */
export async function sendSms(
  phone: string,
  message: string,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env["SMS_API_KEY"];
  const senderId = process.env["SMS_SENDER_ID"];
  const apiUrl = process.env["SMS_API_URL"] || "https://bulksmsbd.net/api/smsapi";

  // Normalise a Bangladeshi number to international format (8801XXXXXXXXX).
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("880")
    ? digits
    : digits.startsWith("0")
      ? `88${digits}`
      : digits.startsWith("1") && digits.length === 10
        ? `880${digits}`
        : digits;

  if (!apiKey || !senderId) {
    logger.info({ to: number, message }, "[SMS not configured] would send");
    return { sent: false, reason: "SMS gateway not configured" };
  }

  try {
    const url =
      `${apiUrl}?api_key=${encodeURIComponent(apiKey)}` +
      `&type=text&senderid=${encodeURIComponent(senderId)}` +
      `&number=${encodeURIComponent(number)}` +
      `&message=${encodeURIComponent(message)}`;

    const res = await fetch(url, { method: "GET" });
    const body = await res.text();
    if (!res.ok) {
      logger.error({ status: res.status, body }, "SMS send failed");
      return { sent: false, reason: `gateway returned ${res.status}` };
    }
    logger.info({ to: number, body }, "SMS sent");
    return { sent: true };
  } catch (err) {
    logger.error({ err }, "SMS send error");
    return { sent: false, reason: "network error" };
  }
}

/** Builds the short order-confirmation message sent to the customer. */
export function orderConfirmationMessage(orderCode: string, customerName: string): string {
  const name = customerName?.split(" ")[0] || "there";
  return `Hi ${name}, your Mysha Enterprise order ${orderCode} has been confirmed. We'll update you as it ships. Thank you for shopping with us!`;
}
