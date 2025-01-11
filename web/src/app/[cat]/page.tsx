import { notFound } from "next/navigation";
import InteractionClient from "./InteractionClient";
import { Suspense } from "react";

export async function generateStaticParams() {
  return [{ cat: "c" }];
}

export default function VaultPage() {
  return (
    <Suspense>
      <InteractionClient />
    </Suspense>
  );
}
