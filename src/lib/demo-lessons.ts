export type DemoLesson = {
  slug: string;
  title: string;
  topic: string;
  teachingStyle: string;
  duration: string;
  excerpt: string;
  visual: "rust" | "react" | "sql" | "security" | "trading" | "solana" | "defi";
  windowTitle: string;
  previewLines: string[];
};

export const demoLessons: DemoLesson[] = [
  {
    slug: "rust-ownership",
    title: "Rust ownership, without the mystery",
    topic: "Rust · Systems",
    teachingStyle: "Visual walkthrough",
    duration: "12 min",
    excerpt: "Follow values through stack frames and see how borrowing keeps memory safe.",
    visual: "rust",
    windowTitle: "ownership.rs",
    previewLines: ["let owner = String::from(\"learn\");", "let borrowed = &owner;", "println!(\"{}\", borrowed);"],
  },
  {
    slug: "react-state",
    title: "React state that stays predictable",
    topic: "React · Frontend",
    teachingStyle: "Build-along",
    duration: "16 min",
    excerpt: "Build a small interface and learn when state belongs in a component.",
    visual: "react",
    windowTitle: "Counter.tsx",
    previewLines: ["function Counter() {", "  const [count, setCount] =", "    useState(0);", "}"],
  },
  {
    slug: "sql-query-plans",
    title: "Read a SQL query plan with confidence",
    topic: "Postgres · Data",
    teachingStyle: "Step-by-step teardown",
    duration: "14 min",
    excerpt: "Trace scans, joins, and indexes to understand what a query is doing.",
    visual: "sql",
    windowTitle: "EXPLAIN ANALYZE",
    previewLines: ["Index Scan using users_idx", "  actual rows=42", "Planning Time: 0.12ms", "Execution Time: 0.41ms"],
  },
  {
    slug: "web-security-basics",
    title: "Web security: trace a request safely",
    topic: "Security · Web",
    teachingStyle: "Threat-model walkthrough",
    duration: "18 min",
    excerpt: "Inspect a request path and spot common trust-boundary mistakes.",
    visual: "security",
    windowTitle: "request-flow",
    previewLines: ["request → validation", "  auth → permission", "trust boundary → handler", "response ← safe output"],
  },
  {
    slug: "memecoin-market-structure",
    title: "Memecoin trading: liquidity and market structure",
    topic: "Memecoins · Trading",
    teachingStyle: "Chart walkthrough",
    duration: "17 min",
    excerpt: "Explore liquidity, slippage, and risk controls through annotated chart examples.",
    visual: "trading",
    windowTitle: "market-structure",
    previewLines: ["pool depth → slippage", "  entry → position size", "risk limit → invalidation", "review → journal"],
  },
  {
    slug: "solana-blockchain-basics",
    title: "Solana: how the blockchain fits together",
    topic: "Solana · Blockchain",
    teachingStyle: "Concept-first diagrams",
    duration: "15 min",
    excerpt: "Trace transactions, validators, programs, and accounts across the Solana network.",
    visual: "solana",
    windowTitle: "solana-network",
    previewLines: ["client → signed transaction", "  leader → execution", "program → account state", "validators → consensus"],
  },
  {
    slug: "defi-protocols",
    title: "DeFi protocols: swaps, lending, and liquidity",
    topic: "DeFi · Protocols",
    teachingStyle: "System walkthrough",
    duration: "19 min",
    excerpt: "Map the roles of pools, collateral, and smart contracts in common DeFi flows.",
    visual: "defi",
    windowTitle: "protocol-map",
    previewLines: ["wallet → smart contract", "  swap → liquidity pool", "collateral → borrow", "position → health factor"],
  },
];

export function getDemoLesson(slug: string) {
  return demoLessons.find((lesson) => lesson.slug === slug);
}
