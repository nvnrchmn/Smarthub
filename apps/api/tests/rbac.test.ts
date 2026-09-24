import type { Role } from "@smarthub/shared";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();

const secret = process.env.JWT_SECRET as string;

const tokenFor = (role: Role, id_pengguna = 1, nik = "3273012345670001"): string =>
  jwt.sign({ id_pengguna, nik, role, id_tenant: 1 }, secret, { expiresIn: "1h" });

type Method = "get" | "post" | "put" | "patch";

interface ForbiddenCase {
  label: string;
  method: Method;
  path: string;
  role: Role;
  body?: Record<string, unknown>;
}

const forbiddenCases: ForbiddenCase[] = [
  {
    label: "Bendahara tidak boleh menambah rumah",
    method: "post",
    path: "/api/v1/wilayah/rumah",
    role: "Bendahara",
    body: {},
  },
  {
    label: "Warga tidak boleh menambah rumah",
    method: "post",
    path: "/api/v1/wilayah/rumah",
    role: "Warga",
    body: {},
  },
  {
    label: "Keamanan tidak boleh melihat daftar warga",
    method: "get",
    path: "/api/v1/kependudukan/warga",
    role: "Keamanan",
  },
  {
    label: "Ketua_RT tidak boleh input mutasi",
    method: "post",
    path: "/api/v1/kependudukan/mutasi",
    role: "Ketua_RT",
    body: {},
  },
  {
    label: "Sekretaris tidak boleh memverifikasi mutasi",
    method: "patch",
    path: "/api/v1/kependudukan/mutasi/1/verifikasi",
    role: "Sekretaris",
    body: { status_verifikasi: "Terverifikasi" },
  },
  {
    label: "Ketua_RT tidak boleh check-in tamu",
    method: "post",
    path: "/api/v1/keamanan/tamu",
    role: "Ketua_RT",
    body: {},
  },
  {
    label: "Ketua_RT tidak boleh check-out tamu",
    method: "put",
    path: "/api/v1/keamanan/tamu/1/checkout",
    role: "Ketua_RT",
  },
  {
    label: "Keamanan tidak boleh melihat ledger kas",
    method: "get",
    path: "/api/v1/keuangan/kas",
    role: "Keamanan",
  },
  {
    label: "Keamanan tidak boleh melihat ringkasan kas",
    method: "get",
    path: "/api/v1/keuangan/kas/ringkasan",
    role: "Keamanan",
  },
  {
    label: "Ketua_RT tidak boleh mencatat kas",
    method: "post",
    path: "/api/v1/keuangan/kas",
    role: "Ketua_RT",
    body: {},
  },
  {
    label: "Bendahara tidak boleh memverifikasi kas",
    method: "patch",
    path: "/api/v1/keuangan/kas/1/verifikasi",
    role: "Bendahara",
    body: { status_verifikasi: "Terverifikasi" },
  },
  {
    label: "Bendahara tidak boleh membayar iuran sebagai warga",
    method: "put",
    path: "/api/v1/keuangan/iuran/1/bayar",
    role: "Bendahara",
    body: { bukti_transfer: "http://localhost/bukti.jpg" },
  },
  {
    label: "Sekretaris tidak boleh memverifikasi iuran",
    method: "patch",
    path: "/api/v1/keuangan/iuran/1/verifikasi",
    role: "Sekretaris",
    body: { status_bayar: "Lunas" },
  },
  {
    label: "Bendahara tidak boleh melihat daftar akun",
    method: "get",
    path: "/api/v1/auth/akun",
    role: "Bendahara",
  },
  {
    label: "Bendahara tidak boleh melihat kandidat akun warga",
    method: "get",
    path: "/api/v1/auth/akun/kandidat",
    role: "Bendahara",
  },
  {
    label: "Sekretaris tidak boleh mengubah status akun",
    method: "patch",
    path: "/api/v1/auth/akun/1/status",
    role: "Sekretaris",
    body: { status_akun: "Nonaktif" },
  },
  {
    label: "Bendahara tidak boleh mengubah role/email akun",
    method: "patch",
    path: "/api/v1/auth/akun/1",
    role: "Bendahara",
    body: { role: "Warga" },
  },
  {
    label: "Keamanan tidak boleh membuat tautan reset password",
    method: "post",
    path: "/api/v1/auth/akun/1/reset-password",
    role: "Keamanan",
  },
  {
    label: "Bendahara tidak boleh memoderasi postingan diskusi",
    method: "patch",
    path: "/api/v1/diskusi/postingan/1/status",
    role: "Bendahara",
    body: { status: "Disembunyikan" },
  },
  {
    label: "Warga tidak boleh memoderasi postingan diskusi",
    method: "patch",
    path: "/api/v1/diskusi/postingan/1/status",
    role: "Warga",
    body: { status: "Disembunyikan" },
  },
  {
    label: "Warga tidak boleh memoderasi produk marketplace",
    method: "patch",
    path: "/api/v1/marketplace/produk/1/status",
    role: "Warga",
    body: { status: "Disembunyikan" },
  },
  {
    label: "Bendahara tidak boleh membuat kategori produk",
    method: "post",
    path: "/api/v1/marketplace/kategori",
    role: "Bendahara",
    body: { nama: "Kategori Uji" },
  },
  {
    label: "Bendahara tidak boleh melihat daftar laporan produk",
    method: "get",
    path: "/api/v1/marketplace/laporan",
    role: "Bendahara",
  },
  {
    label: "Keamanan tidak boleh menangani laporan produk",
    method: "patch",
    path: "/api/v1/marketplace/laporan/1",
    role: "Keamanan",
    body: { status: "Ditangani" },
  },
  {
    label: "Keamanan tidak boleh melihat status langganan",
    method: "get",
    path: "/api/v1/langganan/status",
    role: "Keamanan",
  },
  {
    label: "Warga tidak boleh melihat daftar invoice langganan",
    method: "get",
    path: "/api/v1/langganan/invoice",
    role: "Warga",
  },
  {
    label: "Sekretaris tidak boleh membuat invoice langganan",
    method: "post",
    path: "/api/v1/langganan/invoice",
    role: "Sekretaris",
    body: { kode_paket: "pro", periode: "bulanan" },
  },
  {
    label: "Bendahara tidak boleh memverifikasi invoice langganan",
    method: "patch",
    path: "/api/v1/langganan/invoice/1/verifikasi",
    role: "Bendahara",
    body: { status_bayar: "Lunas" },
  },
  {
    label: "Bendahara tidak boleh mengimpor rumah",
    method: "post",
    path: "/api/v1/wilayah/rumah/impor",
    role: "Bendahara",
    body: { data: [] },
  },
  {
    label: "Warga tidak boleh mengimpor warga",
    method: "post",
    path: "/api/v1/kependudukan/warga/impor",
    role: "Warga",
    body: { data: [] },
  },
  {
    label: "Warga tidak boleh membuat tenant",
    method: "post",
    path: "/api/v1/tenant",
    role: "Warga",
    body: {},
  },
  {
    label: "Bendahara tidak boleh melihat daftar tenant",
    method: "get",
    path: "/api/v1/tenant",
    role: "Bendahara",
  },
];

describe("RBAC middleware", () => {
  it("menolak request tanpa token dengan 401", async () => {
    const response = await request(app).get("/api/v1/wilayah/rumah");
    expect(response.status).toBe(401);
    expect(response.body.status).toBe("error");
  });

  it("menolak token yang tidak valid dengan 401", async () => {
    const response = await request(app)
      .get("/api/v1/wilayah/rumah")
      .set("Authorization", "Bearer token-palsu");
    expect(response.status).toBe(401);
  });

  it.each(forbiddenCases)("$label", async ({ method, path, role, body }) => {
    const agent = request(app)[method](path).set("Authorization", `Bearer ${tokenFor(role)}`);
    const response = body ? await agent.send(body) : await agent;
    expect(response.status).toBe(403);
    expect(response.body.status).toBe("error");
  });

  it("mengizinkan role yang berhak namun menolak body tidak valid dengan 422", async () => {
    const response = await request(app)
      .post("/api/v1/wilayah/rumah")
      .set("Authorization", `Bearer ${tokenFor("Ketua_RT")}`)
      .send({ nomor_rumah: "" });
    expect(response.status).toBe(422);
    expect(response.body.status).toBe("error");
  });
});
