"use client";

import { useEffect } from "react";

// Browsers keep a frozen copy of recent pages so the back button feels instant.
// That copy can be out of date (e.g. it still shows "Log in" after you logged in),
// so when a page is restored from it, reload it fresh from the server.
export function FreshOnBack() {
  useEffect(() => {
    function reloadIfRestored(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", reloadIfRestored);
    return () => window.removeEventListener("pageshow", reloadIfRestored);
  }, []);

  return null;
}
