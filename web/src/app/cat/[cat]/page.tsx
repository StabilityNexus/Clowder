import React from "react";
import Layout from "../../../components/Layout";

// Page Component for the dynamic `[cat]` route
export default function Page({ params }: { params: { cat: string } }) {
  const { cat } = params; // Extract `cat` from `params`
  return (
    <Layout>
      <div className="justify-center text-center mt-9">
        My Post: {cat}
      </div>
    </Layout>
  );
}
