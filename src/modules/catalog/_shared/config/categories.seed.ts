export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

/**
 * Hardcoded Static Compounded IDs (UUIDv4 format) to keep parent-child linkages
 * completely deterministic across repeated system evaluations and fresh migrations.
 */
export const SEED_CATEGORIES: SeedCategory[] = [
  // --- LAYER 1: ROOT SECTIONS ---
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    name: "AI Generated Imagery",
    slug: "ai-generated-imagery",
    parentId: null,
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    name: "AI Audio & Voice Over",
    slug: "ai-audio-voice",
    parentId: null,
  },
  {
    id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    name: "AI Video Generation",
    slug: "ai-video-generation",
    parentId: null,
  },

  // --- LAYER 2: LEAF SUB-CATEGORIES (Imagery Parent) ---
  {
    id: "10101010-2020-3030-4040-505050505050",
    name: "Concept Art & Illustrations",
    slug: "concept-art-illustrations",
    parentId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  },
  {
    id: "20202020-3030-4040-5050-606060606060",
    name: "Product Mockups & ArchViz",
    slug: "product-mockups-archviz",
    parentId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  },
  {
    id: "30303030-4040-5050-6060-707070707070",
    name: "Game Asset Textures",
    slug: "game-asset-textures",
    parentId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  },

  // --- LAYER 2: LEAF SUB-CATEGORIES (Audio Parent) ---
  {
    id: "40404040-5050-6060-7070-808080808080",
    name: "Synthetic Voice Cloning",
    slug: "synthetic-voice-cloning",
    parentId: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
  },
  {
    id: "50505050-6060-7070-8080-909090909090",
    name: "AI Music Soundtracks",
    slug: "ai-music-soundtracks",
    parentId: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
  },

  // --- LAYER 2: LEAF SUB-CATEGORIES (Video Parent) ---
  {
    id: "60606060-7070-8080-9090-a0a0a0a0a0a0",
    name: "Cinematic Prompts & Trailers",
    slug: "cinematic-prompts-trailers",
    parentId: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
  },
  {
    id: "70707070-8080-9090-a0a0-b0b0b0b0b0b0",
    name: "AI Virtual Avatars",
    slug: "ai-virtual-avatars",
    parentId: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
  },
];
