import React from "react";
import Layout from "../../../components/Layout";

export default async function Page({
  params,
}: { params: Promise<{ cat: string }> }) {
  const resolvedParams = await params;
  return (
    <Layout>
      <div className="justify-center text-center mt-9">
        My Post: {resolvedParams.cat}
      </div>
    </Layout>
  );
}
