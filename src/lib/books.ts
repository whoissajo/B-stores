export type Book = {
  id: string;
  title: string;
  author: string;
  price: number;
  category: string;
  description: string;
  badge?: string;
  cover: "sage" | "ink" | "rose" | "ochre" | "blue" | "plum" | "cream" | "forest";
  mark: string;
};

export const books: Book[] = [
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    price: 200,
    category: "Personal Growth",
    description: "Tiny changes, remarkable results. A practical guide to building good habits and breaking bad ones.",
    badge: "Bestseller",
    cover: "sage",
    mark: "A"
  },
  {
    id: "creative-act",
    title: "The Creative Act",
    author: "Rick Rubin",
    price: 2000,
    category: "Creativity",
    description: "A beautiful invitation to create, notice the world, and bring something meaningful into being.",
    badge: "Editor's pick",
    cover: "ink",
    mark: "THE\nCREATIVE\nACT"
  },
  {
    id: "midnight-library",
    title: "The Midnight Library",
    author: "Matt Haig",
    price: 500,
    category: "Fiction",
    description: "Between life and death there is a library, and within it, the chance to try another life.",
    cover: "blue",
    mark: "THE\nMIDNIGHT\nLIBRARY"
  },
  {
    id: "educated",
    title: "Educated",
    author: "Tara Westover",
    price: 800,
    category: "Memoir",
    description: "A powerful memoir about family, identity, and the transformative power of education.",
    cover: "ochre",
    mark: "EDUCATED"
  },
  {
    id: "design-everyday",
    title: "The Design of Everyday Things",
    author: "Don Norman",
    price: 1200,
    category: "Design",
    description: "A foundational book on how thoughtful design makes the world easier to understand.",
    cover: "rose",
    mark: "THE\nDESIGN OF\nEVERYDAY\nTHINGS"
  },
  {
    id: "ikigai",
    title: "Ikigai",
    author: "Héctor García & Francesc Miralles",
    price: 300,
    category: "Personal Growth",
    description: "Discover the Japanese philosophy of finding purpose, balance, and joy in everyday life.",
    badge: "Reader favourite",
    cover: "cream",
    mark: "IKIGAI"
  },
  {
    id: "sapiens",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    price: 1500,
    category: "History",
    description: "A sweeping exploration of humankind, from early humans to the world we live in today.",
    cover: "plum",
    mark: "SAPIENS"
  },
  {
    id: "alchemist",
    title: "The Alchemist",
    author: "Paulo Coelho",
    price: 1000,
    category: "Fiction",
    description: "A timeless story about following your dreams, listening to your heart, and finding your own way.",
    cover: "forest",
    mark: "THE\nALCHEMIST"
  }
];

export function formatPrice(value: number): string {
  return "PKR " + new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
}

export function getBook(id: string): Book | undefined {
  return books.find((book) => book.id === id);
}