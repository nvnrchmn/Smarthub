import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { auditService } from "./audit.service";

interface ListQuery {
  page?: number;
  limit?: number;
  entitas?: string;
}

export const auditController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const query = req.validated?.query as ListQuery;
    const { data, meta } = await auditService.list(query, user.id_tenant);
    sendSuccess(res, "Audit log tenant", data, meta);
  }),
};
