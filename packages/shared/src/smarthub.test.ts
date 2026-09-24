import { describe, expect, it } from "vitest";
import { formatPeriode, formatRupiah, formatTanggal, jenisIdentifier } from "./format";
import { createWargaSchema, generateIuranSchema, loginSchema, usernameSchema } from "./schemas";

describe("format", () => {
  it("memformat rupiah dari string desimal", () => {
    expect(formatRupiah("75000.00")).toContain("75.000");
  });

  it("menangani nilai kosong", () => {
    expect(formatRupiah(null)).toBe("Rp 0");
    expect(formatRupiah(undefined)).toBe("Rp 0");
    expect(formatRupiah("bukan-angka")).toBe("Rp 0");
  });

  it("memformat periode bulan dan tahun", () => {
    expect(formatPeriode(10, 2026)).toBe("Oktober 2026");
  });

  it("memformat tanggal date-only tanpa pergeseran zona waktu", () => {
    expect(formatTanggal("2026-09-21")).toContain("2026");
  });
});

describe("schema", () => {
  it("menolak email tidak valid pada login", () => {
    expect(loginSchema.safeParse({ email: "salah", password: "x" }).success).toBe(false);
  });

  it("menolak jumlah tagihan nol pada generate iuran", () => {
    const result = generateIuranSchema.safeParse({
      id_kategori: 1,
      bulan: 10,
      tahun: 2026,
      jumlah_tagihan: 0,
    });
    expect(result.success).toBe(false);
  });

  it("menolak bulan di luar rentang", () => {
    const result = generateIuranSchema.safeParse({
      id_kategori: 1,
      bulan: 13,
      tahun: 2026,
      jumlah_tagihan: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("menerima payload warga yang lengkap", () => {
    const result = createWargaSchema.safeParse({
      nik: "3273019876543210",
      no_kk: "3273011122334455",
      nama_lengkap: "Budi Santoso",
      tempat_lahir: "Bekasi",
      tanggal_lahir: "1992-04-12",
      jenis_kelamin: "Laki_Laki",
      agama: "Islam",
      status_perkawinan: "Kawin",
      pekerjaan: "Wiraswasta",
      no_hp: "081299998888",
      status_hubungan_keluarga: "Kepala_Keluarga",
      status_tinggal: "Kontrak_Sewa",
    });
    expect(result.success).toBe(true);
  });
});

describe("identitas login", () => {
  it("mengenali email, nomor HP, dan username", () => {
    expect(jenisIdentifier("budi@smarthub.local")).toBe("email");
    expect(jenisIdentifier("081200000005")).toBe("telepon");
    expect(jenisIdentifier("+62 812-0000-0005")).toBe("telepon");
    expect(jenisIdentifier("budi_santoso")).toBe("username");
    expect(jenisIdentifier("warga01")).toBe("username");
  });

  it("menolak username yang seluruhnya angka agar tidak bentrok dengan nomor HP", () => {
    expect(usernameSchema.safeParse("081200000005").success).toBe(false);
    expect(usernameSchema.safeParse("123456").success).toBe(false);
    expect(usernameSchema.safeParse("budi_santoso").success).toBe(true);
    expect(usernameSchema.safeParse("warga_01").success).toBe(true);
  });
});
