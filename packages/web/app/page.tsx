'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useIdentity } from '@/hooks/useIdentity';

export default function HomePage() {
  const { connected } = useWallet();
  const { hasIdentity } = useIdentity();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-india py-20 md:py-32">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
            Self-Sovereign Identity
            <br />
            <span className="text-neutral-900">Powered by Solana</span>
          </h1>
          <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto mb-8 animate-slide-up">
            Bridge India&apos;s government-grade identity verification with decentralized ownership.
            Your identity, your control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            {!connected ? (
              <div className="btn-primary cursor-not-allowed opacity-75 inline-block px-8 py-3 text-lg">
                Connect Wallet to Get Started
              </div>
            ) : hasIdentity ? (
              <Link href="/dashboard" className="btn-primary inline-block px-8 py-3 text-lg">
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/identity/create" className="btn-primary inline-block px-8 py-3 text-lg">
                Create Your Identity
              </Link>
            )}
            <a
              href="https://docs.solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-block px-8 py-3 text-lg bg-white"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why AadhaarChain?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🔐"
              title="Self-Sovereign"
              description="Complete control over your identity. No intermediaries, no centralized databases."
            />
            <FeatureCard
              icon="✓"
              title="Government Verified"
              description="Direct integration with Aadhaar and PAN for government-grade verification."
            />
            <FeatureCard
              icon="🌐"
              title="Global Portable"
              description="Your verified identity works anywhere, anytime, on the Solana blockchain."
            />
            <FeatureCard
              icon="🔒"
              title="Privacy First"
              description="Zero-knowledge proofs ensure your data stays private with selective disclosure."
            />
            <FeatureCard
              icon="⚡"
              title="Instant Verification"
              description="Near-instant credential verification powered by Solana's speed."
            />
            <FeatureCard
              icon="💎"
              title="Reputation System"
              description="Build and maintain your on-chain reputation through verified credentials."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-neutral-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Step
              number="1"
              title="Connect Wallet"
              description="Connect your Solana wallet (Phantom, Solflare, etc.)"
            />
            <Step
              number="2"
              title="Create Identity"
              description="Create your decentralized identifier (DID) on Solana"
            />
            <Step
              number="3"
              title="Get Verified"
              description="Verify with Aadhaar, PAN, or other credentials"
            />
            <Step
              number="4"
              title="Use Anywhere"
              description="Share your verified identity globally"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <Stat value="1000+" label="Identities Created" />
            <Stat value="5000+" label="Verifications" />
            <Stat value="99.9%" label="Uptime" />
            <Stat value="< 2s" label="Avg Verification Time" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Take Control?
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-8">
            Join thousands of users who have already created their self-sovereign identity
            on AadhaarChain.
          </p>
          {!connected ? (
            <div className="btn-primary cursor-not-allowed opacity-75 inline-block px-8 py-3 text-lg">
              Connect Wallet to Get Started
            </div>
          ) : hasIdentity ? (
            <Link href="/dashboard" className="btn-primary inline-block px-8 py-3 text-lg">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/identity/create" className="btn-primary inline-block px-8 py-3 text-lg">
              Create Your Identity Now
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card text-center hover:scale-105 transition-transform">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl md:text-5xl font-bold mb-2">{value}</div>
      <div className="text-lg opacity-90">{label}</div>
    </div>
  );
}
