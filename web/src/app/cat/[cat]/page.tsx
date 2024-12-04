import React from "react";
import Layout from "../../../components/Layout";

// Function to provide static parameters for the dynamic `[cat]` route
export async function generateStaticParams() {
  // Replace with your logic to fetch or define the list of 'cat' values
  const cats = ["cat1", "cat2", "cat3"];

  // Return an array of objects matching the expected `params` structure
  return cats.map((cat) => ({
    params: { cat }, // Static parameter structure
  }));
}

// Page Component
export default async function Page({
  params,
}: {
  params: { cat: string };
}) {
  const { cat } = params; // De-structure `cat` from `params`
  return (
    <Layout>
      <div className="justify-center text-center mt-9">
        My Post: {cat}
      </div>
    </Layout>
  );
}
