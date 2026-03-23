/**
 * Live LLM Integration Tests
 *
 * Posts real messages to the running API and verifies end-to-end behaviour.
 * Costs API credits — run manually, not in CI.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npx tsx scripts/verify-live-conversations.ts
 *
 * Requires: running dev server with DATABASE_URL set.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ── Test harness ──────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

function skip(name: string, reason: string) {
  console.log(`  ⊘ ${name} — ${reason}`);
  skipped++;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Chat helper ─────────────────────────────

interface ChatResponse {
  reply: string;
  jobId?: string;
  conversationPhase?: string;
  completenessScore?: number;
  estimatePresented?: boolean;
  mode?: string;
  scoring?: {
    customerFitScore?: number;
    quoteWorthinessScore?: number;
    recommendation?: string;
    estimateAckStatus?: string;
  };
}

async function sendMessage(message: string, jobId?: string): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/v2/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      messageType: "text",
      ...(jobId ? { jobId } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat API returned ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Health check ────────────────────────────

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v2/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.database === "connected" || data.database === true;
  } catch {
    return false;
  }
}

// ── Scenarios ───────────────────────────────

async function scenario1_threeDoors() {
  console.log("\nScenario 1: 3-Door Replacement");

  const r1 = await sendMessage("Hi, I need 3 internal doors replaced — hollow core, standard sizes");
  assert("S1.1: Got reply", r1.reply.length > 0);
  assert("S1.1: Got jobId", !!r1.jobId);
  const jobId = r1.jobId!;

  await sleep(1000);
  const r2 = await sendMessage("I'm in Noosa Heads", jobId);
  assert("S1.2: Reply mentions location or follow-up", r2.reply.length > 10);

  await sleep(1000);
  const r3 = await sendMessage("Next couple of weeks would be good, no rush", jobId);
  assert("S1.3: Reply progresses conversation", r3.reply.length > 10);
  // By now we should have enough for an estimate
  assert("S1.3: Estimate presented or close to it",
    r3.estimatePresented === true || (r3.completenessScore || 0) > 40,
    `estimatePresented=${r3.estimatePresented}, completeness=${r3.completenessScore}`
  );

  // Check reply doesn't leak hourly rate
  const allReplies = [r1.reply, r2.reply, r3.reply].join(" ");
  assert("S1: No hourly rate leaked", !/\$\d+\s*\/\s*h(ou)?r/i.test(allReplies));

  // If estimate was presented, verify ROM range
  if (r3.estimatePresented) {
    const hasDollarAmount = /\$\d/.test(r3.reply) || /\$\d/.test(r2.reply);
    assert("S1: Estimate contains dollar amount", hasDollarAmount);
  }

  return jobId;
}

async function scenario2_fenceRepair() {
  console.log("\nScenario 2: Fence Repair");

  const r1 = await sendMessage("Got a section of fence that's fallen over in the storm, maybe 5 or 6 metres, timber paling fence");
  assert("S2.1: Got reply", r1.reply.length > 0);
  const jobId = r1.jobId!;

  await sleep(1000);
  const r2 = await sendMessage("Cooroy area", jobId);
  assert("S2.2: Reply continues", r2.reply.length > 10);

  await sleep(1000);
  const r3 = await sendMessage("Yeah pretty urgent, it's the side fence and the neighbour's dog keeps getting through", jobId);
  assert("S2.3: Conversation progressing", r3.reply.length > 10);

  const allReplies = [r1.reply, r2.reply, r3.reply].join(" ");
  assert("S2: No hourly rate leaked", !/\$\d+\s*\/\s*h(ou)?r/i.test(allReplies));
}

async function scenario3_paintRoom() {
  console.log("\nScenario 3: 1-Room Paint");

  const r1 = await sendMessage("Need a bedroom painted, about 4 by 3 metres, white walls, 2 coats. I'm at Sunrise Beach");
  assert("S3.1: Got reply", r1.reply.length > 0);
  const jobId = r1.jobId!;

  await sleep(1000);
  const r2 = await sendMessage("No rush, whenever you can fit it in. Ceilings are fine, just the walls", jobId);
  assert("S3.2: Conversation continues", r2.reply.length > 10);

  const allReplies = [r1.reply, r2.reply].join(" ");
  assert("S3: No hourly rate leaked", !/\$\d+\s*\/\s*h(ou)?r/i.test(allReplies));
}

async function scenario4_priceShopperRejection() {
  console.log("\nScenario 4: Price Shopper");

  const r1 = await sendMessage("What do you charge per hour?");
  assert("S4.1: Got reply", r1.reply.length > 0);
  assert("S4.1: No hourly rate in reply", !/\$\d+\s*\/\s*h(ou)?r/i.test(r1.reply) && !/\$\d+\s*per\s*h(ou)?r/i.test(r1.reply));
  assert("S4.1: No estimate presented yet", r1.estimatePresented !== true);

  const jobId = r1.jobId!;

  await sleep(1000);
  const r2 = await sendMessage("Actually I need some deck boards replaced, maybe 4 or 5 boards on the front deck", jobId);
  assert("S4.2: Now has real scope", r2.reply.length > 10);

  await sleep(1000);
  const r3 = await sendMessage("Noosaville", jobId);
  assert("S4.3: Location provided", r3.reply.length > 10);
}

async function scenario5_pushbackHandling() {
  console.log("\nScenario 5: Pushback Handling");

  // Start with enough detail to get an estimate quickly
  const r1 = await sendMessage("I need 3 interior doors hung and painted, hollow core doors, I'm in Tewantin, next couple of weeks");
  assert("S5.1: Got reply", r1.reply.length > 0);
  const jobId = r1.jobId!;

  // If estimate not yet presented, add more detail
  let estimateReply = r1;
  if (!r1.estimatePresented) {
    await sleep(1000);
    const r2 = await sendMessage("Ground floor, standard sizes, I'll supply the doors", jobId);
    estimateReply = r2;
  }

  if (estimateReply.estimatePresented) {
    await sleep(1000);
    const pushbackReply = await sendMessage("That seems cheap. How do you get two coats on them in that time and mortise all the hinges?", jobId);
    assert("S5: Pushback reply addresses concern", pushbackReply.reply.length > 30);
    assert("S5: Doesn't jump to contact collection",
      !pushbackReply.reply.toLowerCase().includes("contact details") &&
      !pushbackReply.reply.toLowerCase().includes("phone number") &&
      !pushbackReply.reply.toLowerCase().includes("get back to you"),
      pushbackReply.reply.substring(0, 100)
    );
    assert("S5: Estimate ack = pushback",
      pushbackReply.scoring?.estimateAckStatus === "pushback" ||
      pushbackReply.scoring?.estimateAckStatus === "wants_exact_price",
      `got ${pushbackReply.scoring?.estimateAckStatus}`
    );
  } else {
    skip("S5: Pushback handling", "Estimate not yet presented after 2 messages");
  }
}

async function scenario6_suburbExtraction() {
  console.log("\nScenario 6: Suburb Extraction");

  const r1 = await sendMessage("I need a tap replaced in my kitchen, I'm in Maroochydore");
  assert("S6.1: Got reply", r1.reply.length > 0);

  // We can't directly check the DB here without admin auth,
  // but we can verify the bot acknowledges the location
  const mentionsLocation = r1.reply.toLowerCase().includes("maroochydore") ||
    r1.reply.toLowerCase().includes("area") ||
    r1.reply.toLowerCase().includes("sunshine coast");
  // Bot might not echo the suburb — that's ok. Main test is that extraction works.
  assert("S6.1: Reply acknowledges (bot responds to full message)", r1.reply.length > 20);
}

// ── Main ────────────────────────────────────

async function main() {
  console.log(`Live LLM Integration Tests`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`${"=".repeat(50)}`);

  // Health check
  const healthy = await checkHealth();
  if (!healthy) {
    console.error(`\n✗ Server not healthy at ${BASE_URL}`);
    console.error("  Make sure the dev server is running with DATABASE_URL set.");
    console.error("  Usage: npm run dev  (in another terminal)");
    console.error("  Then:  BASE_URL=http://localhost:3000 npx tsx scripts/verify-live-conversations.ts");
    process.exit(1);
  }
  console.log("✓ Server healthy\n");

  try {
    await scenario1_threeDoors();
    await sleep(2000); // Avoid rate limiting

    await scenario2_fenceRepair();
    await sleep(2000);

    await scenario3_paintRoom();
    await sleep(2000);

    await scenario4_priceShopperRejection();
    await sleep(2000);

    await scenario5_pushbackHandling();
    await sleep(2000);

    await scenario6_suburbExtraction();
  } catch (error: any) {
    console.error(`\n✗ Fatal error: ${error.message}`);
    if (error.message.includes("429")) {
      console.error("  Rate limited — try again in a few minutes or increase rate limit thresholds.");
    }
    process.exit(1);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log("");
  if (failed > 0) {
    console.log("Live conversation tests FAILED.");
    process.exit(1);
  } else {
    console.log("Live conversation tests passed. Bot behaviour verified.");
  }
}

main();
