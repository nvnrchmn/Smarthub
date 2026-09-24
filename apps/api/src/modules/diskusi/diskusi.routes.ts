import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { diskusiController } from "./diskusi.controller";
import { diskusiValidation } from "./diskusi.validation";

export const diskusiRouter = Router();

diskusiRouter.use(authenticate, requireTenant);

diskusiRouter.get(
  "/mention",
  validate({ query: diskusiValidation.listMentionQuerySchema }),
  diskusiController.cariMention,
);

diskusiRouter.post(
  "/postingan",
  validate({ body: diskusiValidation.createPostinganSchema }),
  diskusiController.create,
);

diskusiRouter.get(
  "/postingan",
  validate({ query: diskusiValidation.listPostinganQuerySchema }),
  diskusiController.list,
);

diskusiRouter.get(
  "/postingan/:id_postingan",
  validate({ params: diskusiValidation.idPostinganParamSchema }),
  diskusiController.detail,
);

diskusiRouter.patch(
  "/postingan/:id_postingan",
  validate({
    params: diskusiValidation.idPostinganParamSchema,
    body: diskusiValidation.updatePostinganSchema,
  }),
  diskusiController.update,
);

diskusiRouter.delete(
  "/postingan/:id_postingan",
  validate({ params: diskusiValidation.idPostinganParamSchema }),
  diskusiController.remove,
);

diskusiRouter.patch(
  "/postingan/:id_postingan/status",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: diskusiValidation.idPostinganParamSchema,
    body: diskusiValidation.moderasiPostinganSchema,
  }),
  diskusiController.moderasi,
);

diskusiRouter.post(
  "/postingan/:id_postingan/reaksi",
  validate({ params: diskusiValidation.idPostinganParamSchema }),
  diskusiController.toggleReaksi,
);

diskusiRouter.post(
  "/poll/:id_poll/suara",
  validate({
    params: diskusiValidation.idPollParamSchema,
    body: diskusiValidation.votePollSchema,
  }),
  diskusiController.vote,
);

diskusiRouter.post(
  "/poll/:id_poll/tutup",
  validate({ params: diskusiValidation.idPollParamSchema }),
  diskusiController.tutupPoll,
);
