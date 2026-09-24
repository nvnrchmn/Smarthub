import type { Request, Response } from "express";
import type { CreateTenantInput, ListTenantQueryInput } from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { sendSuccess } from "../../common/utils/response";
import { tenantService } from "./tenant.service";

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
};
