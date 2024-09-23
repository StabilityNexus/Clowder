import React from "react";

export default function page({ params }: { params: { cat: string } }) {
  return <div>My Post: {params.cat}</div>;
}
