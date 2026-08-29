import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Locale-aware Link/redirect/usePathname/useRouter for routes inside the
// src/app/[locale] segment (marketing + public webinar pages). Routes
// outside that segment (dashboard, admin, login, signup...) are not part
// of this locale's pathname space and must keep using plain next/link.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
