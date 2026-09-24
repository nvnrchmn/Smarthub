import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-primary">403</p>
      <h1 className="text-xl font-semibold">Akses ditolak</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Role akun Anda tidak memiliki izin untuk membuka halaman ini.
      </p>
      <Button asChild>
        <Link href="/">Kembali ke beranda</Link>
      </Button>
    </div>
  );
}
