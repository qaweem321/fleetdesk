import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirectIfLoggedIn } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

export default async function Layout({ children }: { children: ReactNode }) {
  await redirectIfLoggedIn();
  return children;
}
