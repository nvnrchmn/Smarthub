import { env } from "./environment";

export interface HasilKirim {
  terkirim: boolean;
  dry: boolean;
  pesan?: string;
}

const siap = (base: string, key: string): boolean => Boolean(base && key);

export const whatsappSiap = (): boolean => siap(env.GOWA_BASE_URL, env.GOWA_API_KEY);
export const emailSiap = (): boolean =>
  siap(env.BILLIONMAIL_BASE_URL, env.BILLIONMAIL_API_KEY);

const gagal = (error: unknown): HasilKirim => ({
  terkirim: false,
  dry: false,
  pesan: error instanceof Error ? error.message : "Kesalahan tidak diketahui",
});

export const kirimWhatsApp = async (tujuan: string, pesan: string): Promise<HasilKirim> => {
  if (!whatsappSiap()) {
    return { terkirim: true, dry: true, pesan: "mode dry: GoWA belum dikonfigurasi" };
  }

  try {
    const response = await fetch(`${env.GOWA_BASE_URL.replace(/\/$/, "")}/send/message`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.GOWA_API_KEY}`,
      },
      body: JSON.stringify({ phone: tujuan, message: pesan }),
    });

    if (!response.ok) {
      return { terkirim: false, dry: false, pesan: `GoWA menolak (${response.status})` };
    }
    return { terkirim: true, dry: false };
  } catch (error) {
    return gagal(error);
  }
};

export const kirimEmail = async (
  tujuan: string,
  judul: string,
  pesan: string,
): Promise<HasilKirim> => {
  if (!emailSiap()) {
    return { terkirim: true, dry: true, pesan: "mode dry: BillionMail belum dikonfigurasi" };
  }

  try {
    const response = await fetch(`${env.BILLIONMAIL_BASE_URL.replace(/\/$/, "")}/api/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.BILLIONMAIL_API_KEY}`,
      },
      body: JSON.stringify({ from: env.BILLIONMAIL_FROM, to: tujuan, subject: judul, text: pesan }),
    });

    if (!response.ok) {
      return { terkirim: false, dry: false, pesan: `BillionMail menolak (${response.status})` };
    }
    return { terkirim: true, dry: false };
  } catch (error) {
    return gagal(error);
  }
};
