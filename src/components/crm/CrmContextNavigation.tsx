"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function CrmContextNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <div className="mb-6 flex items-center justify-between">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <button
        type="button"
        onClick={() => router.forward()}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        Suivant
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}