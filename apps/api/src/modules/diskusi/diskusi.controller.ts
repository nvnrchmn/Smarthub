import type { Request, Response } from "express";
import type {
  CreatePostinganInput,
  ListMentionQueryInput,
  ListPostinganQueryInput,
  ModerasiPostinganInput,
  UpdatePostinganInput,
  VotePollInput,
} from "@smarthub/shared";
import type { Role } from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { diskusiService, type Viewer } from "./diskusi.service";

const viewerOf = (req: Request): Viewer => {
  if (!req.user) throw HttpError.unauthorized();
  return { id_pengguna: req.user.id_pengguna, role: req.user.role as Role };
};

export const diskusiController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreatePostinganInput;
    const result = await diskusiService.create(body, viewerOf(req));
    sendSuccess(res, "Postingan berhasil dibuat", result, undefined, 201);
  }),

  cariMention: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListMentionQueryInput;
    const data = await diskusiService.cariMention(query, viewerOf(req));
    sendSuccess(res, "Kandidat sebutan", data);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListPostinganQueryInput;
    const { data, meta } = await diskusiService.list(query, viewerOf(req));
    sendSuccess(res, "Feed diskusi", data, meta);
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_postingan: number };
    const result = await diskusiService.detail(params.id_postingan, viewerOf(req));
    sendSuccess(res, "Detail postingan", result);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_postingan: number };
    const body = req.validated?.body as UpdatePostinganInput;
    const result = await diskusiService.update(params.id_postingan, body, viewerOf(req));
    sendSuccess(res, "Postingan diperbarui", result);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_postingan: number };
    const result = await diskusiService.remove(params.id_postingan, viewerOf(req));
    sendSuccess(res, "Postingan dihapus", result);
  }),

  moderasi: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_postingan: number };
    const body = req.validated?.body as ModerasiPostinganInput;
    const result = await diskusiService.moderasi(params.id_postingan, body, viewerOf(req));
    sendSuccess(res, "Status postingan diperbarui", result);
  }),

  toggleReaksi: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_postingan: number };
    const result = await diskusiService.toggleReaksi(params.id_postingan, viewerOf(req));
    sendSuccess(res, result.disukai_saya ? "Postingan disukai" : "Suka dibatalkan", result);
  }),

  vote: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_poll: number };
    const body = req.validated?.body as VotePollInput;
    const result = await diskusiService.vote(params.id_poll, body, viewerOf(req));
    sendSuccess(res, "Suara Anda tercatat", result);
  }),

  tutupPoll: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_poll: number };
    const result = await diskusiService.tutupPoll(params.id_poll, viewerOf(req));
    sendSuccess(res, "Poll ditutup", result);
  }),
};
