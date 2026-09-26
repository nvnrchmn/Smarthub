import type { Request, Response } from "express";
import type {
  CreateTenantInput,
  ListTenantQueryInput,
  UpdatePengaturanTenantInput,
  UpdateTenantProfilInput,
} from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { tenantService } from "./tenant.service";

const konteksTenant = (req: Request): { id_tenant: number; id_pengguna: number } => {
  const id_tenant = req.user?.id_tenant;
  const id_pengguna = req.user?.id_pengguna;
  if (!id_tenant || !id_pengguna) {
    throw HttpError.forbidden("Konteks tenant tidak tersedia pada sesi ini");
  }
  return { id_tenant, id_pengguna };
};

export const tenantController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateTenantInput;
    const result = await tenantService.create(body);
    sendSuccess(res, "Tenant berhasil dibuat", result, undefined, 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListTenantQueryInput;
    const { data, meta } = await tenantService.list(query);
    sendSuccess(res, "Daftar tenant", data, meta);
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_tenant: number };
    const result = await tenantService.detail(params.id_tenant);
    sendSuccess(res, "Detail tenant", result);
  }),

  profil: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = konteksTenant(req);
    const result = await tenantService.profil(id_tenant);
    sendSuccess(res, "Profil tenant", result);
  }),

  updateProfil: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = konteksTenant(req);
    const body = req.validated?.body as UpdateTenantProfilInput;
    const result = await tenantService.updateProfil(id_tenant, body);
    sendSuccess(res, "Profil tenant diperbarui", result);
  }),

  pengaturan: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = konteksTenant(req);
    const result = await tenantService.pengaturan(id_tenant);
    sendSuccess(res, "Pengaturan tenant", result);
  }),

  updatePengaturan: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant, id_pengguna } = konteksTenant(req);
    const body = req.validated?.body as UpdatePengaturanTenantInput;
    const result = await tenantService.updatePengaturan(id_tenant, body, id_pengguna);
    sendSuccess(res, "Pengaturan tenant diperbarui", result);
  }),
};
