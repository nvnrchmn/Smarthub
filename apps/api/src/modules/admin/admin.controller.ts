import type { Request, Response } from "express";
import type {
  AdminAkunCreateInput,
  AdminAkunGantiPasswordInput,
  AdminAkunResetPasswordInput,
  AdminAkunUpdateInput,
  AdminLoginInput,
  ImpersonateInput,
  MfaKodeInput,
  ListAdminAkunQueryInput,
  ListAdminLanggananQueryInput,
  ListAdminTenantQueryInput,
  ListAdminWebhookQueryInput,
  ListAuditQueryInput,
  PaketUpdateInput,
  UbahStatusTenantInput,
} from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { adminService } from "./admin.service";

const aktor = (req: Request): { id_akun_platform: number; email: string } => {
  const user = req.platform_user;
  if (!user) throw HttpError.unauthorized();
  return { id_akun_platform: user.id_akun_platform, email: user.email };
};

export const adminController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as AdminLoginInput;
    const result = await adminService.login(body);
    sendSuccess(res, "Login platform berhasil", result);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = req.platform_user;
    if (!user) throw HttpError.unauthorized();
    const result = await adminService.me(user.id_akun_platform);
    sendSuccess(res, "Profil akun platform", result);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const { id_akun_platform, email } = aktor(req);
    const result = await adminService.logout(id_akun_platform, { email });
    sendSuccess(res, "Logout platform berhasil", result);
  }),

  gantiPassword: asyncHandler(async (req: Request, res: Response) => {
    const { id_akun_platform, email } = aktor(req);
    const body = req.validated?.body as AdminAkunGantiPasswordInput;
    const result = await adminService.gantiPasswordSendiri(id_akun_platform, body, { email });
    sendSuccess(res, "Password platform diperbarui", result);
  }),

  setupMfa: asyncHandler(async (req: Request, res: Response) => {
    const user = req.platform_user;
    if (!user) throw HttpError.unauthorized();
    const result = await adminService.setupMfa(user.id_akun_platform);
    sendSuccess(res, "Setup MFA dibuat", result);
  }),

  activateMfa: asyncHandler(async (req: Request, res: Response) => {
    const user = req.platform_user;
    if (!user) throw HttpError.unauthorized();
    const body = req.validated?.body as MfaKodeInput;
    const result = await adminService.activateMfa(user.id_akun_platform, body.kode, {
      email: user.email,
    });
    sendSuccess(res, "MFA diaktifkan", result);
  }),

  disableMfa: asyncHandler(async (req: Request, res: Response) => {
    const user = req.platform_user;
    if (!user) throw HttpError.unauthorized();
    const body = req.validated?.body as MfaKodeInput;
    const result = await adminService.disableMfa(user.id_akun_platform, body.kode, {
      email: user.email,
    });
    sendSuccess(res, "MFA dinonaktifkan", result);
  }),

  ringkasan: asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.ringkasan();
    sendSuccess(res, "Ringkasan platform", result);
  }),

  listPaket: asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.listPaket();
    sendSuccess(res, "Daftar paket langganan", result);
  }),

  updatePaket: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { kode: string };
    const body = req.validated?.body as PaketUpdateInput;
    const result = await adminService.updatePaket(params.kode, body, aktor(req));
    sendSuccess(res, "Paket langganan diperbarui", result);
  }),

  metrik: asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.metrik();
    sendSuccess(res, "Metrik platform", result);
  }),

  rekonsiliasi: asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.rekonsiliasi();
    sendSuccess(res, "Rekonsiliasi ledger vs pembayaran", result);
  }),

  alert: asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.alert();
    sendSuccess(res, "Alert operasional", result);
  }),

  listTenant: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListAdminTenantQueryInput;
    const { data, meta } = await adminService.listTenant(query);
    sendSuccess(res, "Daftar tenant", data, meta);
  }),

  detailTenant: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_tenant: number };
    const result = await adminService.detailTenant(params.id_tenant);
    sendSuccess(res, "Detail tenant", result);
  }),

  ubahStatusTenant: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_tenant: number };
    const body = req.validated?.body as UbahStatusTenantInput;
    const result = await adminService.ubahStatusTenant(params.id_tenant, body, aktor(req));
    sendSuccess(res, "Status tenant diperbarui", result);
  }),

  listLangganan: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListAdminLanggananQueryInput;
    const { data, meta } = await adminService.listLangganan(query);
    sendSuccess(res, "Daftar langganan", data, meta);
  }),

  listWebhook: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListAdminWebhookQueryInput;
    const { data, meta } = await adminService.listWebhook(query);
    sendSuccess(res, "Daftar webhook Hub", data, meta);
  }),

  listAkun: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListAdminAkunQueryInput;
    const { data, meta } = await adminService.listAkun(query);
    sendSuccess(res, "Daftar akun platform", data, meta);
  }),

  createAkun: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as AdminAkunCreateInput;
    const result = await adminService.createAkun(body, aktor(req));
    sendSuccess(res, "Akun platform dibuat", result, undefined, 201);
  }),

  updateAkun: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_akun_platform: number };
    const body = req.validated?.body as AdminAkunUpdateInput;
    const result = await adminService.updateAkun(params.id_akun_platform, body, aktor(req));
    sendSuccess(res, "Akun platform diperbarui", result);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_akun_platform: number };
    const body = req.validated?.body as AdminAkunResetPasswordInput;
    const result = await adminService.resetPassword(params.id_akun_platform, body, aktor(req));
    sendSuccess(res, "Password akun platform direset", result);
  }),

  impersonate: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_tenant: number };
    const body = req.validated?.body as ImpersonateInput;
    const result = await adminService.impersonate(params.id_tenant, body, aktor(req));
    sendSuccess(res, "Token impersonasi diterbitkan", result);
  }),

  listAudit: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListAuditQueryInput;
    const { data, meta } = await adminService.listAudit(query);
    sendSuccess(res, "Audit log platform", data, meta);
  }),
};
