import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthFrame } from "@/components/site/auth-frame";
import { redirectIfLoggedIn } from "@/lib/session";

export const metadata: Metadata = { title: "Forgot password" };

export default async function Layout({ children }: { children: ReactNode }) {
  await redirectIfLoggedIn();
  return <AuthFrame>{children}</AuthFrame>;
}
