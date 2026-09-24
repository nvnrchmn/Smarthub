import bcrypt from "bcryptjs";
import { runWithTenant, tenantCreateScope } from "../src/common/tenant/tenant-context";
import { prisma } from "../src/config/database";

const PASSWORD_DEMO = "Password123";

const rumahSeed = [
  { nomor_rumah: "A-01", blok: "Blok A", jalan_gang: "Jl. Melati I", status_kepemilikan: "Milik_Sendiri", status_hunian: "Dihuni" },
  { nomor_rumah: "A-02", blok: "Blok A", jalan_gang: "Jl. Melati I", status_kepemilikan: "Milik_Sendiri", status_hunian: "Dihuni" },
  { nomor_rumah: "B-05", blok: "Blok B", jalan_gang: "Jl. Mawar III", status_kepemilikan: "Sewa_Kontrak", status_hunian: "Dihuni" },
  { nomor_rumah: "B-06", blok: "Blok B", jalan_gang: "Jl. Mawar III", status_kepemilikan: "Sewa_Kontrak", status_hunian: "Dihuni" },
  { nomor_rumah: "C-10", blok: "Blok C", jalan_gang: "Jl. Anggrek II", status_kepemilikan: "Milik_Sendiri", status_hunian: "Tidak_Dihuni" },
  { nomor_rumah: "C-11", blok: "Blok C", jalan_gang: "Jl. Anggrek II", status_kepemilikan: "Kosong", status_hunian: "Tidak_Dihuni" },
] as const;

const pengurusSeed = [
  { nik: "3273012345670001", nama: "Hendra Wijaya", email: "ketuart@smarthub.local", username: "hendra_wijaya", role: "Ketua_RT" as const, rumahIndex: 0, hub: "Kepala_Keluarga" as const, phone: "081200000001" },
  { nik: "3273012345670002", nama: "Siti Aminah", email: "sekretaris@smarthub.local", username: "siti_aminah", role: "Sekretaris" as const, rumahIndex: 1, hub: "Kepala_Keluarga" as const, phone: "081200000002" },
  { nik: "3273012345670003", nama: "Dewi Kartika", email: "bendahara@smarthub.local", username: "dewi_kartika", role: "Bendahara" as const, rumahIndex: 2, hub: "Kepala_Keluarga" as const, phone: "081200000003" },
  { nik: "3273012345670004", nama: "Joko Susilo", email: "keamanan@smarthub.local", username: "joko_susilo", role: "Keamanan" as const, rumahIndex: 3, hub: "Kepala_Keluarga" as const, phone: "081200000004" },
  { nik: "3273012345670005", nama: "Budi Santoso", email: "warga@smarthub.local", username: "budi_santoso", role: "Warga" as const, rumahIndex: 3, hub: "Famili_Lain" as const, phone: "081200000005" },
];

const paketSeed = [
  {
    kode: "basic",
    nama: "Basic",
    harga_bulanan: 75000,
    harga_tahunan: 750000,
    batas_rumah: 100,
    fitur: ["Kependudukan", "Keamanan", "Keuangan", "Diskusi"],
  },
  {
    kode: "pro",
    nama: "Pro",
    harga_bulanan: 150000,
    harga_tahunan: 1500000,
    batas_rumah: 300,
    fitur: ["Semua Basic", "Marketplace", "Notifikasi WhatsApp/email", "Laporan ekspor"],
  },
  {
    kode: "enterprise",
    nama: "Enterprise",
    harga_bulanan: 400000,
    harga_tahunan: 4000000,
    batas_rumah: null,
    fitur: ["Semua Pro", "Multi-blok", "SLA", "Pendampingan onboarding"],
  },
];

const kategoriSeed = [
  { nama_kategori: "Iuran Kebersihan", jenis: "Pemasukan" as const },
  { nama_kategori: "Iuran Keamanan", jenis: "Pemasukan" as const },
  { nama_kategori: "Donasi Sosial", jenis: "Pemasukan" as const },
  { nama_kategori: "Gaji Satpam", jenis: "Pengeluaran" as const },
  { nama_kategori: "Perbaikan Fasilitas", jenis: "Pengeluaran" as const },
];

const main = async (): Promise<void> => {
  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 12);

  console.log(
    "PERINGATAN: seed ini MENGHAPUS seluruh data existing lalu mengisi data demo SmartHub.",
  );

  await prisma.pembayaranLangganan.deleteMany();
  await prisma.invoiceLangganan.deleteMany();
  await prisma.langgananTenant.deleteMany();
  await prisma.laporanProduk.deleteMany();
  await prisma.favoritProduk.deleteMany();
  await prisma.produkFoto.deleteMany();
  await prisma.produk.deleteMany();
  await prisma.kategoriProduk.deleteMany();
  await prisma.notifikasi.deleteMany();
  await prisma.postinganMention.deleteMany();
  await prisma.iuranRumah.deleteMany();
  await prisma.kasUmum.deleteMany();
  await prisma.mutasiWarga.deleteMany();
  await prisma.tamuKunjungan.deleteMany();
  await prisma.pollSuara.deleteMany();
  await prisma.pollOpsi.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.postinganLampiran.deleteMany();
  await prisma.reaksiPostingan.deleteMany();
  await prisma.postingan.deleteMany();
  await prisma.akunPengguna.deleteMany();
  await prisma.warga.deleteMany();
  await prisma.kartuKeluarga.deleteMany();
  await prisma.kategoriKeuangan.deleteMany();
  await prisma.rumah.deleteMany();

  const tenant = await prisma.tenant.upsert({
    where: { slug: "rt-default" },
    update: {},
    create: {
      nama: "RT Default",
      slug: "rt-default",
      provinsi: "-",
      kabupaten: "-",
      kecamatan: "-",
      kontak_email: "admin@smarthub.local",
      status: "Aktif",
    },
  });

  for (const paket of paketSeed) {
    await prisma.paketLangganan.upsert({
      where: { kode: paket.kode },
      update: paket,
      create: paket,
    });
  }

  const hariIni = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const trialBerakhir = new Date(hariIni);
  trialBerakhir.setUTCDate(trialBerakhir.getUTCDate() + 30);

  await prisma.langgananTenant.upsert({
    where: { id_tenant: tenant.id_tenant },
    update: {},
    create: {
      id_tenant: tenant.id_tenant,
      kode_paket: "pro",
      status: "Trial",
      mulai: hariIni,
      berakhir: trialBerakhir,
      trial_berakhir: trialBerakhir,
    },
  });

  await runWithTenant({ id_tenant: tenant.id_tenant }, async () => {
  const rumahList = [];
  for (const rumah of rumahSeed) {
    rumahList.push(await prisma.rumah.create({ data: { ...rumah, ...tenantCreateScope() } }));
  }

  const kkList = [];
  for (const [index, rumah] of rumahList.slice(0, 4).entries()) {
    kkList.push(
      await prisma.kartuKeluarga.create({
        data: {
        ...tenantCreateScope(),
          no_kk: `32730111223344${String(index + 1).padStart(2, "0")}`,
          id_rumah: rumah.id_rumah,
          tgl_dikeluarkan: new Date("2023-11-12T00:00:00.000Z"),
        },
      }),
    );
  }

  for (const pengurus of pengurusSeed) {
    const kk = kkList[Math.min(pengurus.rumahIndex, kkList.length - 1)];
    if (!kk) continue;

    await prisma.warga.create({
      data: {
        ...tenantCreateScope(),
        nik: pengurus.nik,
        no_kk: kk.no_kk,
        nama_lengkap: pengurus.nama,
        tempat_lahir: "Bekasi",
        tanggal_lahir: new Date("1990-01-01T00:00:00.000Z"),
        jenis_kelamin: "Laki_Laki",
        agama: "Islam",
        status_perkawinan: "Kawin",
        pekerjaan: "Karyawan",
        no_hp: pengurus.phone,
        status_hubungan_keluarga: pengurus.hub,
        status_tinggal: "Tetap",
      },
    });

    await prisma.akunPengguna.create({
      data: {
        ...tenantCreateScope(),
        nik: pengurus.nik,
        email: pengurus.email,
        username: pengurus.username,
        password_hash: passwordHash,
        role: pengurus.role,
      },
    });
  }

  const kategoriList = [];
  for (const kategori of kategoriSeed) {
    kategoriList.push(await prisma.kategoriKeuangan.create({ data: { ...kategori, ...tenantCreateScope() } }));
  }

  const kategoriIuran = kategoriList[0];
  const kategoriGaji = kategoriList[3];
  const kategoriDonasi = kategoriList[2];
  const ketua = await prisma.akunPengguna.findUnique({ where: { email: "ketuart@smarthub.local" } });
  const bendahara = await prisma.akunPengguna.findUnique({
    where: { email: "bendahara@smarthub.local" },
  });

  if (kategoriIuran) {
    await prisma.iuranRumah.createMany({
      data: rumahList.slice(0, 4).map((rumah, index) => ({
        ...tenantCreateScope(),
        id_rumah: rumah.id_rumah,
        id_kategori: kategoriIuran.id_kategori,
        bulan: 9,
        tahun: 2026,
        jumlah_tagihan: 75000,
        status_bayar: index === 0 ? ("Lunas" as const) : ("Belum_Bayar" as const),
        tgl_bayar: index === 0 ? new Date("2026-09-05T00:00:00.000Z") : null,
      })),
      skipDuplicates: true,
    });
  }

  if (bendahara && kategoriGaji) {
    await prisma.kasUmum.create({
      data: {
        ...tenantCreateScope(),
        id_kategori: kategoriGaji.id_kategori,
        id_pengurus: bendahara.id_pengguna,
        tanggal: new Date("2026-09-10T00:00:00.000Z"),
        jumlah: 1500000,
        keterangan: "Gaji bulanan petugas keamanan",
        status_verifikasi: "Terverifikasi",
        diverifikasi_oleh: ketua?.id_pengguna ?? null,
        diverifikasi_pada: new Date("2026-09-11T00:00:00.000Z"),
      },
    });
  }

  if (bendahara && kategoriDonasi) {
    await prisma.kasUmum.create({
      data: {
        ...tenantCreateScope(),
        id_kategori: kategoriDonasi.id_kategori,
        id_pengurus: bendahara.id_pengguna,
        tanggal: new Date("2026-09-15T00:00:00.000Z"),
        jumlah: 500000,
        keterangan: "Donasi kegiatan kerja bakti",
        status_verifikasi: "Menunggu_Verifikasi",
      },
    });
  }

  const rumahTujuan = rumahList[0];
  if (rumahTujuan) {
    await prisma.tamuKunjungan.create({
      data: {
        ...tenantCreateScope(),
        id_rumah_tujuan: rumahTujuan.id_rumah,
        nama_tamu: "Andri Gunawan",
        jumlah_tamu: 2,
        keperluan: "Silaturahmi keluarga",
      },
    });
  }

  const wargaUntukMutasi = pengurusSeed[4];
  if (wargaUntukMutasi) {
    await prisma.mutasiWarga.create({
      data: {
        ...tenantCreateScope(),
        nik: wargaUntukMutasi.nik,
        jenis_mutasi: "Datang",
        tanggal_peristiwa: new Date("2026-08-01T00:00:00.000Z"),
        keterangan: "Pindah masuk dari RT 03",
      },
    });
  }

  const sekretarisAkun = await prisma.akunPengguna.findUnique({
    where: { email: "sekretaris@smarthub.local" },
  });
  const wargaAkun = await prisma.akunPengguna.findUnique({
    where: { email: "warga@smarthub.local" },
  });

  if (ketua && sekretarisAkun && wargaAkun) {
    const postinganKerjaBakti = await prisma.postingan.create({
      data: {
        ...tenantCreateScope(),
        id_penulis: ketua.id_pengguna,
        isi: "Selamat pagi warga! Kerja bakti lingkungan akan dilaksanakan hari Minggu pukul 07.00. Mohon membawa alat kebersihan masing-masing.",
        poll: {
          create: {
            berakhir_pada: new Date("2026-12-31T23:59:59.999Z"),
            opsi: {
              create: [
                { label: "Saya hadir", urutan: 1 },
                { label: "Hadir tetapi terlambat", urutan: 2 },
                { label: "Tidak bisa hadir", urutan: 3 },
              ],
            },
          },
        },
      },
    });

    const postinganServisAc = await prisma.postingan.create({
      data: {
        ...tenantCreateScope(),
        id_penulis: wargaAkun.id_pengguna,
        isi: "Ada yang punya kontak tukang servis AC langganan RT? Terima kasih sebelumnya.",
      },
    });

    await prisma.postingan.create({
      data: {
        ...tenantCreateScope(),
        id_penulis: sekretarisAkun.id_pengguna,
        isi: "Pengingat: pendaftaran lomba 17-an dibuka sampai akhir bulan di rumah Sekretaris.",
      },
    });

    await prisma.postingan.create({
      data: {
        ...tenantCreateScope(),
        id_penulis: sekretarisAkun.id_pengguna,
        id_induk: postinganServisAc.id_postingan,
        isi: "Saya kirimkan kontaknya lewat WhatsApp ya.",
      },
    });

    await prisma.reaksiPostingan.create({
      data: { id_postingan: postinganServisAc.id_postingan, id_pengguna: ketua.id_pengguna },
    });
    await prisma.reaksiPostingan.create({
      data: {
        id_postingan: postinganServisAc.id_postingan,
        id_pengguna: sekretarisAkun.id_pengguna,
      },
    });
    await prisma.postingan.update({
      where: { id_postingan: postinganServisAc.id_postingan },
      data: { jumlah_balasan: 1, jumlah_suka: 2 },
    });

    const pollKerjaBakti = await prisma.poll.findUnique({
      where: { id_postingan: postinganKerjaBakti.id_postingan },
      include: { opsi: { orderBy: { urutan: "asc" } } },
    });
    const opsiPertama = pollKerjaBakti?.opsi[0];
    if (pollKerjaBakti && opsiPertama) {
      await prisma.pollSuara.create({
        data: {
          id_poll: pollKerjaBakti.id_poll,
          id_opsi: opsiPertama.id_opsi,
          id_pengguna: wargaAkun.id_pengguna,
        },
      });
      await prisma.pollOpsi.update({
        where: { id_opsi: opsiPertama.id_opsi },
        data: { jumlah_suara: { increment: 1 } },
      });
    }
  }

  const penjualKetua = await prisma.akunPengguna.findUnique({
    where: { email: "ketuart@smarthub.local" },
  });
  const penjualBendahara = await prisma.akunPengguna.findUnique({
    where: { email: "bendahara@smarthub.local" },
  });
  const penjualWarga = await prisma.akunPengguna.findUnique({
    where: { email: "warga@smarthub.local" },
  });

  if (penjualKetua && penjualBendahara && penjualWarga) {
    const kategoriMakanan = await prisma.kategoriProduk.create({
      data: {
        ...tenantCreateScope(), nama: "Makanan & Minuman", slug: "makanan-minuman" },
    });
    const kategoriJasa = await prisma.kategoriProduk.create({
      data: {
        ...tenantCreateScope(), nama: "Jasa", slug: "jasa" },
    });
    const kategoriRumahTangga = await prisma.kategoriProduk.create({
      data: {
        ...tenantCreateScope(), nama: "Barang Rumah Tangga", slug: "barang-rumah-tangga" },
    });
    await prisma.kategoriProduk.create({
      data: {
        ...tenantCreateScope(), nama: "Elektronik", slug: "elektronik" },
    });

    await prisma.produk.create({
      data: {
        ...tenantCreateScope(),
        id_penjual: penjualBendahara.id_pengguna,
        id_kategori_produk: kategoriMakanan.id_kategori_produk,
        judul: "Kue Kering Nastar (per toples)",
        deskripsi:
          "Nastar homemade, dibuat harian. Bisa pesan untuk acara keluarga atau hari raya. Silakan chat untuk varian rasa.",
        harga: 85000,
        kondisi: "Baru",
        satuan: "toples",
        bisa_nego: true,
      },
    });

    await prisma.produk.create({
      data: {
        ...tenantCreateScope(),
        id_penjual: penjualWarga.id_pengguna,
        id_kategori_produk: kategoriJasa.id_kategori_produk,
        judul: "Jasa Servis AC & Cuci AC",
        deskripsi:
          "Melayani cuci AC, isi freon, dan perbaikan ringan. Khusus warga perumahan, bisa panggil ke rumah.",
        harga: 75000,
        kondisi: "Baru",
        satuan: "unit",
        bisa_nego: true,
      },
    });

    await prisma.produk.create({
      data: {
        ...tenantCreateScope(),
        id_penjual: penjualKetua.id_pengguna,
        id_kategori_produk: kategoriRumahTangga.id_kategori_produk,
        judul: "Lemari Plastik 3 Tingkat (bekas layak)",
        deskripsi:
          "Lemari plastik 3 tingkat, masih kokoh, hanya ada bekas pemakaian wajar. Diambil sendiri di rumah.",
        harga: 150000,
        kondisi: "Bekas",
        satuan: "unit",
        bisa_nego: true,
      },
    });
  }

  });

  const platformHash = await bcrypt.hash("Password123", 12);
  await prisma.akunPlatform.upsert({
    where: { email: "admin@smarthub.local" },
    update: {
      nama: "Superadmin SmartHub",
      password_hash: platformHash,
      role: "Superadmin",
      status_akun: "Aktif",
    },
    create: {
      nama: "Superadmin SmartHub",
      email: "admin@smarthub.local",
      password_hash: platformHash,
      role: "Superadmin",
    },
  });

  console.log("Seed SmartHub selesai. Akun demo (password: Password123):");
  for (const pengurus of pengurusSeed) {
    console.log(` - ${pengurus.email} (${pengurus.role})`);
  }
  console.log(" - admin@smarthub.local (Superadmin — konsol platform /api/v1/admin)");
};

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
