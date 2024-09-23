import Head from "next/head";
import Link from "next/link";
import React from "react";
import ConnectWallet from "./ConnectWallet";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-secondary text-primary">
      <Head>
        <title>Clowder</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            Clowder
          </Link>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <Link href="/create">Create CAT</Link>
              </li>
              <li>
                <Link href="/my-cats">My CATs</Link>
              </li>
            </ul>
          </nav>
          <div className="flex">
            
            <ConnectWallet />
          </div>
        </div>
      </header>

      <main className="flex-grow">{children}</main>
    </div>
  );
}
