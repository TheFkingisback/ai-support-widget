import Link from 'next/link';
import {
  Rocket, Shield, Puzzle, Server,
  Code2, AlertTriangle, Map, Zap,
  GitBranch, Lock, BarChart3, Globe,
} from 'lucide-react';

const navCards = [
  {
    href: '/developers/quick-start',
    icon: Rocket,
    title: 'Quick Start',
    desc: 'Get up and running in under 10 minutes',
    color: 'from-green-500/20 to-emerald-500/20 border-green-500/20',
    iconColor: 'text-green-400',
  },
  {
    href: '/developers/authentication',
    icon: Shield,
    title: 'Authentication',
    desc: 'JWT signing, token lifecycle, and security',
    color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/20',
    iconColor: 'text-yellow-400',
  },
  {
    href: '/developers/widget-sdk',
    icon: Puzzle,
    title: 'Widget SDK',
    desc: 'Configuration, theming, and event hooks',
    color: 'from-purple-500/20 to-violet-500/20 border-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    href: '/developers/api-reference',
    icon: Server,
    title: 'API Reference',
    desc: 'Every endpoint, parameter, and response',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    href: '/developers/types',
    icon: Code2,
    title: 'Type Definitions',
    desc: 'TypeScript interfaces and schemas',
    color: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    href: '/developers/error-reference',
    icon: AlertTriangle,
    title: 'Error Reference',
    desc: 'Error codes, handling, and retry logic',
    color: 'from-red-500/20 to-pink-500/20 border-red-500/20',
    iconColor: 'text-red-400',
  },
];

const features = [
  { icon: Zap, text: 'AI-powered diagnostics with evidence-based responses' },
  { icon: GitBranch, text: 'Multi-tenant SaaS with full data isolation' },
  { icon: Lock, text: 'Enterprise-grade security with PII redaction' },
  { icon: BarChart3, text: 'Built-in analytics, CSAT, and cost tracking' },
  { icon: Globe, text: 'Embeddable anywhere with Shadow DOM isolation' },
  { icon: Map, text: '6-step integration with zero dependencies' },
];

export default function DevelopersPage() {
  return (
    <div data-testid="developers-page">
      {/* Hero */}
      <div className="relative mb-16 overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/30 p-8 sm:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="relative">
          <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
            Developer Portal
          </span>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Build AI Support
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Into Any App
            </span>
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-gray-400">
            Embed intelligent, context-aware support that diagnoses real problems
            using your system&apos;s actual state. Not a chatbot — an investigator.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/developers/quick-start" className="btn-primary">
              Get Started
            </Link>
            <Link href="/developers/integration" className="btn-secondary">
              Integration Guide
            </Link>
          </div>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="mb-16">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest text-gray-500">
          Why developers choose this
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.text} className="flex items-start gap-3 rounded-lg p-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
                <span className="text-sm text-gray-300">{f.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation cards */}
      <div className="mb-16">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest text-gray-500">
          Documentation
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {navCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group rounded-xl border bg-gradient-to-br p-5 transition-all
                  hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 ${card.color}`}
              >
                <Icon className={`mb-3 h-6 w-6 ${card.iconColor}`} aria-hidden="true" />
                <h3 className="mb-1 font-semibold text-white group-hover:text-blue-300">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-400">{card.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Architecture overview */}
      <div className="mb-16">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-widest text-gray-500">
          Architecture
        </h2>
        <ArchitectureDiagram />
      </div>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0d1117] p-6">
      <pre className="text-center text-xs leading-relaxed text-gray-400 sm:text-sm">
{`┌──────────────┐     ┌───────────────────┐     ┌──────────────────────────┐
│              │     │                   │     │    Support Gateway        │
│   Host App   │────▶│   Widget SDK      │────▶│    (Fastify)             │
│              │     │   (JS embed)      │     │                          │
└──────────────┘     └───────────────────┘     └─────────┬────────────────┘
                                                         │
                                               ┌─────────┴─────────┐
                                               │                   │
                                        ┌──────┴───────┐   ┌──────┴────────┐
                                        │  Snapshot     │   │  AI           │
                                        │  Builder      │   │  Orchestrator │
                                        └──────┬───────┘   └──────┬────────┘
                                               │                  │
                                        ┌──────┴───────┐   ┌──────┴────────┐
                                        │  Client APIs  │   │  OpenRouter   │
                                        │  Knowledge    │   │  LLM          │
                                        └──────────────┘   └───────────────┘`}
      </pre>
    </div>
  );
}
