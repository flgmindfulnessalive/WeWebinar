import { Suspense } from "react";

import { AuthConfirmClient } from "./confirm-client";

export default function AuthConfirmPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/30 p-6">
      <Suspense fallback={null}>
        <AuthConfirmClient />
      </Suspense>
    </div>
  );
}
