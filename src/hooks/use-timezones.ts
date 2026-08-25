import { useMemo } from "react";

export function useTimezones() {
  return useMemo(() => {
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone");
    }
    return ["UTC", "America/Argentina/Buenos_Aires", "America/Mexico_City", "America/New_York"];
  }, []);
}
