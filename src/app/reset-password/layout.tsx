import type { ReactNode } from "react";
import { AuthFrame } from "@/components/site/auth-frame";

export default function Layout({ children }: { children: ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
