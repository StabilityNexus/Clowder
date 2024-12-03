import React from "react";
import Layout from "../../../components/Layout"

export default function page({ params }: { params: { cat: string } }) {
  return (<Layout>
    <div className="justify-center text-center mt-9">My Post: {params.cat}</div>
  </Layout>);
}
