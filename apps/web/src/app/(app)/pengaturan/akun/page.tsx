"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Copy, KeyRound, MoreHorizontal, Pencil, Plus } from "lucide-react";
import {
  ROLES,
  ROLE_LABELS,
  STATUS_AKUN,
  adminUpdateAkunSchema,
  formatTanggalWaktu,
  queryKeys,
  registerSchema,
  updateAccountStatusSchema,
  type AdminUpdateAkunInput,
  type RegisterInput,
  type Role,
  type StatusAkun,
} from "@smarthub/shared";
import { ApiError, apiFetch, buildQuery } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { DataState } from "@/components/data-state";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WargaNikCombobox } from "@/components/warga-nik-combobox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AkunItem {
  id_pengguna: number;
  nik: string;
  email: string;
  role: Role;
  status_akun: StatusAkun;
  nama_lengkap: string | null;
}

interface ResetLinkResult {
  id_pengguna: number;
  email: string;
  reset_link: string;
  expires_at: string;
}

export default function AkunListPage() {
  const { data: me } = useMe();
  const canCreate = me?.role === "Ketua_RT" || me?.role === "Sekretaris";
  const canChangeStatus = me?.role === "Ketua_RT";

  const [page, setPage] = useState(1);
  const [role, setRole] = useState<string>("semua");
  const [statusAkun, setStatusAkun] = useState<string>("semua");
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 20,
    role: role === "semua" ? undefined : role,
    status_akun: statusAkun === "semua" ? undefined : statusAkun,
  };

  const akunQuery = useQuery({
    queryKey: queryKeys.akun(queryParams),
    queryFn: async () => apiFetch<AkunItem[]>(`/auth/akun${buildQuery(queryParams)}`),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nik: "", email: "", password: "", role: "Warga" },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: RegisterInput) =>
      apiFetch("/auth/register", { method: "POST", body: payload }),
    onSuccess: async () => {
      toast.success("Akun berhasil dibuat");
      setDialogOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["akun"] });
      await queryClient.invalidateQueries({ queryKey: ["warga"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof RegisterInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal membuat akun");
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: StatusAkun }) =>
      apiFetch(`/auth/akun/${id}/status`, {
        method: "PATCH",
        body: updateAccountStatusSchema.parse({ status_akun: status }),
      }),
    onSuccess: async () => {
      toast.success("Status akun diperbarui");
      await queryClient.invalidateQueries({ queryKey: ["akun"] });
    },
    onError: () => toast.error("Gagal memperbarui status akun"),
  });

  const [editTarget, setEditTarget] = useState<AkunItem | null>(null);
  const [resetTarget, setResetTarget] = useState<AkunItem | null>(null);
  const [resetResult, setResetResult] = useState<ResetLinkResult | null>(null);

  const editForm = useForm<AdminUpdateAkunInput>({
    resolver: zodResolver(adminUpdateAkunSchema),
    defaultValues: { email: undefined, role: undefined },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: AdminUpdateAkunInput }) =>
      apiFetch(`/auth/akun/${id}`, { method: "PATCH", body: values }),
    onSuccess: async () => {
      toast.success("Data akun diperbarui");
      setEditTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["akun"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          editForm.setError(field as keyof AdminUpdateAkunInput, { message });
        });
        toast.error(error.message);
      } else {
        toast.error("Gagal memperbarui data akun");
      }
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (id: number) =>
      apiFetch<ResetLinkResult>(`/auth/akun/${id}/reset-password`, { method: "POST" }),
    onSuccess: (result) => setResetResult(result.data),
    onError: () => toast.error("Gagal membuat tautan reset password"),
  });

  const openEdit = (akun: AkunItem) => {
    editForm.reset({ email: akun.email, role: akun.role });
    setEditTarget(akun);
  };

  const openReset = (akun: AkunItem) => {
    setResetResult(null);
    setResetTarget(akun);
    resetMutation.mutate(akun.id_pengguna);
  };

  const copyResetLink = async () => {
    if (!resetResult) return;
    await navigator.clipboard.writeText(resetResult.reset_link);
    toast.success("Tautan disalin ke clipboard");
  };

  const items = akunQuery.data?.data ?? [];
  const meta = akunQuery.data?.meta;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kelola Akun"
        description="Akun pengguna sistem informasi RT beserta hak aksesnya."
        action={
          canCreate ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Buat Akun
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buat Akun Pengguna</DialogTitle>
                  <DialogDescription>
                    Akun akan langsung aktif dan dapat digunakan untuk masuk ke sistem.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label>NIK Warga</Label>
                    <Controller
                      control={control}
                      name="nik"
                      render={({ field }) => (
                        <WargaNikCombobox
                          value={field.value}
                          onChange={field.onChange}
                          disabled={createMutation.isPending}
                          invalid={Boolean(errors.nik)}
                        />
                      )}
                    />
                    {errors.nik ? (
                      <p className="text-sm text-destructive">{errors.nik.message}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Hanya warga yang sudah terdata dan belum memiliki akun yang dapat dipilih.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email ? (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" {...register("password")} />
                    {errors.password ? (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Controller
                      control={control}
                      name="role"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {ROLE_LABELS[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.role ? (
                      <p className="text-sm text-destructive">{errors.role.message}</p>
                    ) : null}
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua role</SelectItem>
            {ROLES.map((value) => (
              <SelectItem key={value} value={value}>
                {ROLE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusAkun}
          onValueChange={(value) => {
            setStatusAkun(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status akun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {STATUS_AKUN.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState
        isLoading={akunQuery.isLoading}
        isError={akunQuery.isError}
        error={akunQuery.error}
        isEmpty={items.length === 0}
        emptyMessage="Belum ada akun pengguna"
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">NIK</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {canCreate ? <TableHead className="text-right">Aksi</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((akun) => (
                <TableRow key={akun.id_pengguna}>
                  <TableCell className="font-medium">{akun.nama_lengkap ?? "-"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{akun.nik}</TableCell>
                  <TableCell className="hidden lg:table-cell">{akun.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[akun.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={akun.status_akun === "Aktif" ? "success" : "secondary"}>
                      {akun.status_akun}
                    </Badge>
                  </TableCell>
                  {canCreate ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Aksi akun">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Aksi akun</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => openEdit(akun)}>
                            <Pencil className="h-4 w-4" /> Ubah role &amp; email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={resetMutation.isPending}
                            onSelect={() => openReset(akun)}
                          >
                            <KeyRound className="h-4 w-4" /> Kirim tautan reset password
                          </DropdownMenuItem>
                          {canChangeStatus ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={statusMutation.isPending}
                                onSelect={() =>
                                  statusMutation.mutate({
                                    id: akun.id_pengguna,
                                    status: akun.status_akun === "Aktif" ? "Nonaktif" : "Aktif",
                                  })
                                }
                              >
                                {akun.status_akun === "Aktif"
                                  ? "Nonaktifkan akun"
                                  : "Aktifkan akun"}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </DataState>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Data Akun</DialogTitle>
            <DialogDescription>
              {editTarget
                ? `${editTarget.nama_lengkap ?? editTarget.nik} — ubah role dan/atau email.`
                : undefined}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={editForm.handleSubmit((values) => {
              if (!editTarget) return;
              updateMutation.mutate({ id: editTarget.id_pengguna, values });
            })}
            noValidate
          >
            <div className="space-y-2">
              <Label>Role</Label>
              <Controller
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {ROLE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {editForm.formState.errors.role ? (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.role.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                {...editForm.register("email", {
                  setValueAs: (value) => (value === "" ? undefined : value),
                })}
              />
              {editForm.formState.errors.email ? (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setResetResult(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Tautan Reset Password</DialogTitle>
            <DialogDescription>
              {resetTarget
                ? `Tautan untuk ${resetTarget.nama_lengkap ?? resetTarget.nik}.`
                : undefined}
            </DialogDescription>
          </DialogHeader>

          {resetMutation.isPending ? (
            <p className="text-sm text-muted-foreground">Membuat tautan...</p>
          ) : resetResult ? (
            <div className="space-y-3">
              <div className="break-all rounded-md border bg-muted/40 p-3 text-xs">
                {resetResult.reset_link}
              </div>
              <p className="text-xs text-muted-foreground">
                Berlaku sampai {formatTanggalWaktu(resetResult.expires_at)} dan hanya dapat dipakai
                sekali. Kirim tautan ini ke pengguna melalui WhatsApp atau email.
              </p>
              <DialogFooter>
                <Button type="button" onClick={() => void copyResetLink()}>
                  <Copy className="h-4 w-4" /> Salin tautan
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p className="text-sm text-destructive">Gagal membuat tautan reset password.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
