import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();
const secret = process.env.JWT_SECRET as string;

const token = jwt.sign(
  { id_pengguna: 1, nik: "3273012345670001", role: "Ketua_RT", id_tenant: 1 },
  secret,
  { expiresIn: "1h" },
);

describe("Keamanan unggahan KYC (G-F)", () => {
  it("menolak tipe berkas yang tidak diizinkan", async () => {
    const res = await request(app)
      .post("/api/v1/kyc/dokumen")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("halo"), { filename: "catatan.txt", contentType: "text/plain" });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/tipe berkas/i);
  });

  it("menolak berkas melebihi batas ukuran", async () => {
    const besar = Buffer.alloc(6 * 1024 * 1024, 1);

    const res = await request(app)
      .post("/api/v1/kyc/dokumen")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", besar, { filename: "ktp.png", contentType: "image/png" });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/ukuran berkas/i);
  });

  it("menolak permintaan tanpa token", async () => {
    const res = await request(app).post("/api/v1/kyc/dokumen");
    expect(res.status).toBe(401);
  });
});
