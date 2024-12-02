import Head from "next/head";
import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useTheme } from "next-themes";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col bg-cover bg-centerbg-white text-black bg-white bg-[url('../images/background-light.png')] dark:text-white dark:bg-black  dark:bg-[url('../images/background-dark.png')] }`}
    /*style={
      theme === "dark"
        ? { backgroundImage: `url(${darkThemeBack.src})` }
        : { backgroundImage: `url(${lightThemeBack.src})` }
    }*/
    >
      <Head>
        <title>Clowder</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
