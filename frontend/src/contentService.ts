export type IconName =
  | "bag"
  | "bolt"
  | "check"
  | "chevron"
  | "clock"
  | "coin"
  | "compass"
  | "home"
  | "leaf"
  | "plus"
  | "shirt"
  | "spark"
  | "target"
  | "trophy"
  | "users";

export type Quest = {
  id: number | string;
  title: string;
  detail: string;
  coinReward?: number;
  category: string;
  icon: IconName;
  tone: string;
  done: boolean;
};

export type OutfitVariant =
  | "tee"
  | "hoodie"
  | "jacket"
  | "overalls"
  | "tracksuit"
  | "vest"
  | "tank"
  | "shorts"
  | "baggy";

export type StoreItem = {
  id: number | string;
  name: string;
  description: string;
  price: number;
  icon: IconName;
  tone: string;
  category: "casual" | "formal" | "semi-formal" | "sport";
  featured?: boolean;
  style: {
    primary: string;
    secondary: string;
    pants: string;
    variant: OutfitVariant;
  };
};

export type AppContent = {
  quests: Quest[];
  storeCategories: Array<{
    id: StoreItem["category"];
    label: string;
    description: string;
  }>;
  storeItems: StoreItem[];
  bonusQuest: {
    title: string;
    detail: string;
    duration: string;
    coins: number;
  };
  economy: {
    startingCoins: number;
    coinsPerQuest: number;
  };
  dashboard: {
    quote: string;
    quoteAuthor: string;
  };
};

export const defaultOutfit: StoreItem = {
  id: 0,
  name: "Everyday tee",
  description: "The original Sidekick look.",
  price: 0,
  icon: "shirt",
  tone: "focus",
  category: "casual",
  style: {
    primary: "#7567dc",
    secondary: "#eeeaff",
    pants: "#3d435f",
    variant: "tee",
  },
};

export function resolveOutfit(name: string, catalog: StoreItem[]): StoreItem {
  return catalog.find((item) => item.name === name) ?? defaultOutfit;
}

export const defaultAppContent: AppContent = {
  quests: [],
  storeCategories: [
    {
      id: "casual",
      label: "Casual",
      description: "Relaxed looks for everyday quests",
    },
    {
      id: "formal",
      label: "Formal",
      description: "Polished pieces for milestone moments",
    },
    {
      id: "semi-formal",
      label: "Semi-formal",
      description: "Smart layers with an easy feel",
    },
    {
      id: "sport",
      label: "Sport",
      description: "Movement-ready outfits for active days",
    },
  ],
  storeItems: [
    {
      id: 1,
      name: "Lilac cloud hoodie",
      description: "A soft oversized hoodie for cozy quest days.",
      price: 160,
      icon: "shirt",
      tone: "focus",
      category: "casual",
      style: {
        primary: "#9b8bea",
        secondary: "#eeeaff",
        pants: "#353c58",
        variant: "hoodie",
      },
    },
    {
      id: 2,
      name: "Weekend overalls",
      description: "Easygoing denim overalls over a sunny tee.",
      price: 210,
      icon: "shirt",
      tone: "freeze",
      category: "casual",
      style: {
        primary: "#f4d76d",
        secondary: "#f4d76d",
        pants: "#4d709e",
        variant: "overalls",
      },
    },
    {
      id: 3,
      name: "Stone baggy pants",
      description: "Extra-roomy pants paired with a simple fitted tee.",
      price: 145,
      icon: "shirt",
      tone: "confetti",
      category: "casual",
      style: {
        primary: "#bd8aa9",
        secondary: "#f5dced",
        pants: "#5b5869",
        variant: "baggy",
      },
    },
    {
      id: 4,
      name: "Midnight suit",
      description: "A clean tailored suit for your biggest achievements.",
      price: 420,
      icon: "shirt",
      tone: "focus",
      category: "formal",
      featured: true,
      style: {
        primary: "#30354c",
        secondary: "#f2f0e8",
        pants: "#272b3e",
        variant: "jacket",
      },
    },
    {
      id: 5,
      name: "Cream ceremony set",
      description: "A light formal set with a deep green accent.",
      price: 390,
      icon: "shirt",
      tone: "forest",
      category: "formal",
      style: {
        primary: "#ddd5bf",
        secondary: "#45654c",
        pants: "#5b594f",
        variant: "jacket",
      },
    },
    {
      id: 6,
      name: "Sunset bomber",
      description: "A bright layered jacket with relaxed sleeves.",
      price: 240,
      icon: "shirt",
      tone: "gold",
      category: "semi-formal",
      featured: true,
      style: {
        primary: "#ed7559",
        secondary: "#ffd9cb",
        pants: "#3e4666",
        variant: "jacket",
      },
    },
    {
      id: 7,
      name: "Forest knit",
      description: "A textured green sweater for slower days.",
      price: 190,
      icon: "shirt",
      tone: "forest",
      category: "semi-formal",
      style: {
        primary: "#668c55",
        secondary: "#dcebcf",
        pants: "#4b4b59",
        variant: "tee",
      },
    },
    {
      id: 8,
      name: "Trail utility vest",
      description: "A pocketed vest for your next big adventure.",
      price: 320,
      icon: "shirt",
      tone: "confetti",
      category: "semi-formal",
      style: {
        primary: "#bc8c4d",
        secondary: "#f2dfbd",
        pants: "#4a5141",
        variant: "vest",
      },
    },
    {
      id: 9,
      name: "Skyline tank top",
      description: "A breathable tank top for high-energy quests.",
      price: 110,
      icon: "shirt",
      tone: "freeze",
      category: "sport",
      style: {
        primary: "#4e91c5",
        secondary: "#d9f2ff",
        pants: "#303b55",
        variant: "tank",
      },
    },
    {
      id: 10,
      name: "Sprint shorts",
      description: "Lightweight shorts with a contrast running stripe.",
      price: 135,
      icon: "shirt",
      tone: "boost",
      category: "sport",
      style: {
        primary: "#ef7659",
        secondary: "#ffd5c8",
        pants: "#343b54",
        variant: "shorts",
      },
    },
    {
      id: 11,
      name: "Motion tracksuit",
      description: "A sharp matching set made for active quests.",
      price: 280,
      icon: "shirt",
      tone: "forest",
      category: "sport",
      style: {
        primary: "#293047",
        secondary: "#c8f04b",
        pants: "#293047",
        variant: "tracksuit",
      },
    },
  ],
  bonusQuest: {
    title: "Make someone's day",
    detail: "Do one unexpected kind thing for someone around you.",
    duration: "15 min",
    coins: 25,
  },
  economy: { startingCoins: 100, coinsPerQuest: 15 },
  dashboard: {
    quote:
      "Great things are done by a series of small things brought together.",
    quoteAuthor: "Vincent van Gogh",
  },
};

const contentApiUrl = import.meta.env.VITE_CONTENT_API_URL;

export async function loadAppContent(): Promise<AppContent> {
  if (!contentApiUrl) return defaultAppContent;

  const response = await fetch(contentApiUrl);
  if (!response.ok) throw new Error("Unable to load app content");
  return (await response.json()) as AppContent;
}
