import type { Request, Response } from "express";
import type {
  AdminUpdateAkunInput,
  AuthMfaKodeInput,
  ChangePasswordInput,
  ListAkunQueryInput,
  ListWargaTanpaAkunQueryInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
  StatusAkun,
  UpdateAccountStatusInput,
} from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { saveFile } from "../../config/storage";
import { authService } from "./auth.service";

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as LoginInput;
    const result = await authService.login(body, {
      user_agent: req.headers["user-agent"] ?? null,
      ip: req.ip ?? null,
    });
    sendSuccess(res, "Login berhasil", result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as RefreshTokenInput;
    const result = await authService.refresh(body, {
      user_agent: req.headers["user-agent"] ?? null,
      ip: req.ip ?? null,
    });
    sendSuccess(res, "Sesi diperbarui", result);
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as RegisterInput;
    const result = await authService.register(body);
    sendSuccess(res, "Akun berhasil dibuat", result, undefined, 201);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const result = await authService.me(user.id_pengguna);
    sendSuccess(res, "Profil pengguna", {
      ...result,
      impersonasi: Boolean(user.impersonated_by),
    });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const body = req.validated?.body as ChangePasswordInput;
    await authService.changePassword(user.id_pengguna, body);
    sendSuccess(res, "Password berhasil diubah", null);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const body = (req.validated?.body ?? {}) as LogoutInput;
    await authService.logout(body);
    sendSuccess(res, "Logout berhasil", null);
  }),

  logoutAll: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    await authService.logoutAll(user.id_pengguna);
    sendSuccess(res, "Semua sesi dicabut", null);
  }),

  setupMfa: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const result = await authService.setupMfa(user.id_pengguna);
    sendSuccess(res, "Setup MFA dibuat", result);
  }),

  activateMfa: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const body = req.validated?.body as AuthMfaKodeInput;
    const result = await authService.activateMfa(user.id_pengguna, body.kode);
    sendSuccess(res, "MFA diaktifkan", result);
  }),

  disableMfa: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const body = req.validated?.body as AuthMfaKodeInput;
    const result = await authService.disableMfa(user.id_pengguna, body.kode);
    sendSuccess(res, "MFA dinonaktifkan", result);
  }),

  listAccounts: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListAkunQueryInput;
    const { data, meta } = await authService.listAccounts(query);
    sendSuccess(res, "Daftar akun", data, meta);
  }),

  listKandidatAkun: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListWargaTanpaAkunQueryInput;
    const { data, meta } = await authService.listKandidatAkun(query);
    sendSuccess(res, "Daftar warga tanpa akun", data, meta);
  }),

  updateAkun: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const params = req.validated?.params as { id_pengguna: number };
    const body = req.validated?.body as AdminUpdateAkunInput;
    const result = await authService.updateAkun(params.id_pengguna, body, user.id_pengguna);
    sendSuccess(res, "Data akun diperbarui", result);
  }),

  createResetLink: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_pengguna: number };
    const result = await authService.createResetLink(params.id_pengguna);
    sendSuccess(res, "Tautan reset password dibuat", result);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as ResetPasswordInput;
    await authService.resetPassword(body);
    sendSuccess(res, "Password berhasil direset, silakan login kembali", null);
  }),

  updateAccountStatus: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const params = req.validated?.params as { id_pengguna: number };
    const body = req.validated?.body as UpdateAccountStatusInput;
    const result = await authService.updateAccountStatus(
      params.id_pengguna,
      body.status_akun as StatusAkun,
      user.id_pengguna,
    );
    sendSuccess(res, "Status akun diperbarui", result);
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "file", message: "Berkas wajib diunggah pada field 'file'" },
      ]);
    }
    const stored = await saveFile({ originalname: req.file.originalname, buffer: req.file.buffer });
    sendSuccess(res, "Berkas terunggah", { url: stored.url }, undefined, 201);
  }),
};
