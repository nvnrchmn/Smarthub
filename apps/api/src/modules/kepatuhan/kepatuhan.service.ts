import { catatAudit } from "../../common/audit/audit-log";
import { HttpError } from "../../common/utils/http-error";
import { toIso } from "../../common/utils/serialize";
import { kepatuhanRepository } from "./kepatuhan.repository";

interface Aktor {
  id_pengguna: number;
  id_tenant: number;
  email: string;
}

export const kepatuhanService = {
  async eksporTenant(id_tenant: number) {
    const data = await kepatuhanRepository.eksporTenant(id_tenant);

    return {
      dibuat_pada: new Date().toISOString(),
      id_tenant,
      tenant: data.tenant,
      rumah: data.rumah,
      kartu_keluarga: data.kartuKeluarga,
      warga: data.warga,
      akun: data.akun,
      kategori_keuangan: data.kategori,
      iuran: data.iuran,
      kas: data.kas,
      langganan: data.langganan,
      invoice: data.invoice,
    };
  },

  async subjekData(id_tenant: number, nik: string) {
    const warga = await kepatuhanRepository.wargaByNik(id_tenant, nik);
    if (!warga) throw HttpError.notFound("Warga tidak ditemukan");

    const iuran = await kepatuhanRepository.eksporTenant(id_tenant);

    return {
      warga: {
        nik: warga.nik,
        no_kk: warga.no_kk,
        nama_lengkap: warga.nama_lengkap,
        tempat_lahir: warga.tempat_lahir,
        tanggal_lahir: toIso(warga.tanggal_lahir),
        jenis_kelamin: warga.jenis_kelamin,
        agama: warga.agama,
        status_perkawinan: warga.status_perkawinan,
        pekerjaan: warga.pekerjaan,
        no_hp: warga.no_hp,
        status_hubungan_keluarga: warga.status_hubungan_keluarga,
        status_tinggal: warga.status_tinggal,
        status_aktif: warga.status_aktif,
      },
      kartu_keluarga: warga.kartu_keluarga,
      akun: warga.akun_pengguna,
      iuran: iuran.iuran.filter((item) => item.id_rumah === warga.kartu_keluarga?.id_rumah),
    };
  },

  async anonymize(id_tenant: number, nik: string, aktor: Aktor) {
    const warga = await kepatuhanRepository.wargaByNik(id_tenant, nik);
    if (!warga) throw HttpError.notFound("Warga tidak ditemukan");

    await kepatuhanRepository.anonymizeWarga(id_tenant, nik);
    await kepatuhanRepository.nonaktifkanAkun(nik);
    await kepatuhanRepository.sesiCabutByNik(nik);

    await catatAudit({
      id_tenant,
      id_pengguna: aktor.id_pengguna,
      aktor_email: aktor.email,
      aksi: "anonymize_subjek_data",
      entitas: "Warga",
      id_entitas: nik,
      detail: { catatan: "Permintaan hak subjek data (anonimisasi PII, akun dinonaktifkan)" },
    });

    return { nik, dianonimkan: true };
  },
};
