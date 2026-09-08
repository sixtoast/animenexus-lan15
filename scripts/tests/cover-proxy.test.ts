import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../../app/api/cover/route.ts";

function req(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("cover proxy route", () => {
  it("rejects missing url", async () => {
    const res = await GET(req("/api/cover"));
    assert.equal(res.status, 400);
  });

  it("rejects http and non-allowlisted hosts", async () => {
    const httpRes = await GET(
      req(
        "/api/cover?u=" +
          encodeURIComponent("http://s4.anilist.co/file/anilistcdn/x.jpg"),
      ),
    );
    assert.equal(httpRes.status, 403);

    const evil = await GET(
      req(
        "/api/cover?u=" + encodeURIComponent("https://evil.example/x.jpg"),
      ),
    );
    assert.equal(evil.status, 403);
  });

  it("accepts allowlisted https anilist host (network)", async () => {
    const sample =
      "https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/bx1-CXtrrkMpOW7.jpg";
    const res = await GET(
      req("/api/cover?u=" + encodeURIComponent(sample)),
    );
    assert.ok([200, 502].includes(res.status), `status ${res.status}`);
    if (res.status === 200) {
      const ct = res.headers.get("content-type") || "";
      assert.ok(ct.startsWith("image/"), ct);
    }
  });
});
