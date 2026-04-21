/**
 * GET /api/v3/jobs/:id/export?recipient_cert_id=...&recipient_pubkey_hex=...
 *
 * Returns a SignedBundle carrying every patch for the given job,
 * signed by the admin identity and addressed to the requested
 * recipient cert. The recipient (a peer REA) uses
 * verifyBundleWithTrust on their side to authenticate and then
 * applies patches through POST /api/v3/federation/bundle.
 *
 * 200: SignedBundle<{objectId, patches}>
 * 400: { code: "bad_request", detail }
 * 404: { code: "not_found", detail }
 * 500: { code: "internal", detail }
 */

import { NextRequest, NextResponse } from "next/server";

import { signBundle } from "@semantos/session-protocol";

import { adminIdentity, adminSigner } from "@/lib/federation/singletons";
import { loadJobPatches } from "@/lib/federation/export";
import { logBundleOut } from "@/lib/federation/logging";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  const resolved = await params;
  const jobId = resolved.id;

  const url = new URL(req.url);
  const recipientCertId = url.searchParams.get("recipient_cert_id");
  const recipientPubkeyHex = url.searchParams.get("recipient_pubkey_hex");

  if (!recipientCertId || !recipientPubkeyHex) {
    return NextResponse.json(
      {
        code: "bad_request",
        detail:
          "recipient_cert_id and recipient_pubkey_hex query params are required",
      },
      { status: 400 },
    );
  }

  try {
    const patches = await loadJobPatches(jobId);
    if (patches.length === 0) {
      logBundleOut({
        result: "not_found",
        recipientCertId,
        objectId: jobId,
      });
      return NextResponse.json(
        { code: "not_found", detail: `no patches for job ${jobId}` },
        { status: 404 },
      );
    }

    const objectId = patches[0].objectId;
    const payload = { objectId, patches };
    const bundle = await signBundle(payload, adminSigner(), {
      recipient: {
        certId: recipientCertId,
        pubkeyHex: recipientPubkeyHex,
      },
    });

    // Belt-and-braces — signBundle should already include signer.certId
    // from the admin StubSigner, but keep callers robust if a future
    // adapter omits it.
    if (!bundle.signer.certId) {
      bundle.signer.certId = adminIdentity().certId;
    }

    logBundleOut({
      result: "ok",
      recipientCertId,
      objectId,
      patchId: patches[0].id,
    });

    return NextResponse.json(bundle, { status: 200 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logBundleOut({
      result: "internal",
      recipientCertId,
      objectId: jobId,
      detail,
    });
    return NextResponse.json({ code: "internal", detail }, { status: 500 });
  }
}
