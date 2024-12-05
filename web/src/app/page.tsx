"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/WalletConnectProvider";
import ConnectWallet from "@/components/ConnectWallet";
import Service_1 from "../images/Service_1.png";
import Service_2 from "../images/Service_2.png";
import Service_3 from "../images/Service_3.png";
import catLight from "../images/Light_cat.png";
import catDark from "../images/Dark_cat.png";
import { useTheme } from "next-themes";
import { faGithub, faDiscord, faTwitter, faTelegram } from "@fortawesome/free-brands-svg-icons";

const services = [
  { image: Service_1, alt: "Buy and Sell CAT", description: "Buy and Sell CAT" },
  { image: Service_2, alt: "Secure Wallet", description: "Secure Wallet" },
  { image: Service_3, alt: "24/7 Customer Support", description: "24/7 Customer Support" },
];

const contact_links = [
  { href: "https://github.com/StabilityNexus", icon: faGithub },
  { href: "https://discord.gg/YzDKeEfWtS", icon: faDiscord },
  { href: "https://t.me/StabilityNexus", icon: faTelegram },
  { href: "https://x.com/StabilityNexus", icon: faTwitter },
];

export default function Home() {
  const { resolvedTheme } = useTheme(); // Use resolvedTheme for accurate theme detection
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [catAddress, setCatAddress] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false); // Track wallet connection state
  const router = useRouter();
  const { address } = useWallet();

  const handleUseCAT = () => {
    if (catAddress.trim()) {
      router.push(`/cat/${catAddress}`);
      const value = catAddress;
      localStorage.setItem("param", value);
    }
  };

  useEffect(() => {
    if (resolvedTheme) {
      setIsThemeReady(true);
    }
  }, [resolvedTheme]);

  useEffect(() => {
    setIsWalletConnected(!!address); // Update wallet connection state when address changes
  }, [address]);

  if (!isThemeReady) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center min-h-screen text-center">
          <div>
            {/* Heading for Desktop */}
            <h1 className="hidden md:block text-3xl font-bold mb-8 font-mono">
              Welcome to <span className="text-[#5cacc5] dark:text-[#BA9901]">Clowder</span> - A Tool to Track Your GitHub Contributions
            </h1>

            {/* Heading for Mobile */}
            <h1 className="block md:hidden text-3xl font-bold mb-8 font-mono">
              Welcome to <span className="text-[#5cacc5] dark:text-[#BA9901]">Clowder</span>
            </h1>
          </div>

          <p className="text-xl md:text-2xl mb-6 max-w-4xl font-mono">
            Clowder is a premier blockchain platform offering fast and secure transactions. It enables users to create
            Contribution Accounting Tokens (CATs) for tracking contributions within decentralized organizations.
          </p>
          <div className="flex space-x-4 mb-8">
            {contact_links.map(({ href, icon }, index) => (
              <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-3xl md:text-4xl hover:text-blue-600 transition"
              >
                <FontAwesomeIcon icon={icon} />
              </a>
            ))}
          </div>
          {!isWalletConnected ? (
            <ConnectWallet />
          ) : (
            <div className=" max-w-full">
              <Button onClick={() => router.push("/create")} className=" mb-2" >
                Create CAT
              </Button>
              <div className="flex py-3 w-full">
                <Input
                  placeholder="Enter CAT address"
                  value={catAddress}
                  onChange={(e) => setCatAddress(e.target.value)}
                  style={{ width: "500px" }}
                />
              </div>
              <Button onClick={handleUseCAT}>Use CAT</Button>
            </div>
          )}
        </section>

        {/* Services Section */}
        <section className="py-16 text-center">
          <h2 id="Services" className="text-3xl md:text-5xl font-bold mb-12" style={{ fontFamily: "var(--font-bebas-nueue)" }}>
            Our Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="flex flex-col items-center">
                <Image src={service.image} alt={service.alt} width={250} height={150} />
                <p className="text-lg md:text-2xl font-semibold mt-3 font-mono">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Us Section */}
        <section className="py-16 mx-4 md:mx-12">
          <h2 id="Contact" className="text-3xl md:text-5xl font-bold mb-12 text-center" style={{ fontFamily: "var(--font-bebas-nueue)" }}>
            Contact Us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center md:py-20">
            {/* Contact Info */}
            <div>
              <p className="text-lg md:text-2xl mb-4 font-mono">
                Share your insights on this topic, and let us know if there’s anything you’d like to expand on or include.
              </p>
              <hr className="bg-black dark:bg-white" style={{ width: "80%", height: "1px", fontWeight: "bold", marginBottom: "10px" }} />
              <p className="text-lg md:text-2xl mb-3 font-mono">
                Let’s connect through:
              </p>
              <hr className="bg-black dark:bg-white" style={{ width: "50%", height: "1px", fontWeight: "bold", marginBottom: "15px" }} />
              <div className="flex flex-col md:flex-row space-y-2 md:space-x-4 md:space-y-0 ">
                {contact_links.map(({ href, icon }, index) => (
                  <a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl hover:text-blue-600 transition"
                  >
                    <FontAwesomeIcon icon={icon} />
                  </a>
                ))}
              </div>
            </div>

            {/* Right Content */}
            <div className="relative flex justify-center items-center mt-[-120px] md:mt-0 mx-[45px] md:mx-[0px] ">
              <Image
                src={resolvedTheme === "dark" ? catDark : catLight}
                alt="Clowder Contact"
                className="absolute"
                style={{
                  marginLeft: "120px",
                  width: resolvedTheme === "dark" ? "400px" : "450px",
                }}
                width={450}
                height={450}
              />
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
