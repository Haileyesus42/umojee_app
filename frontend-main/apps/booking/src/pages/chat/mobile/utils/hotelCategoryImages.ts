/**
 * hotelCategoryImages.ts
 *
 * Maps hotel categories, types, or name keywords to curated, reliable Unsplash images.
 * Provides visual variety for hotel cards when a direct image URL is not available.
 */

// ─── Category → Image Pool ───────────────────────────────────────────────────

const HOTEL_IMAGE_MAP: Record<string, string[]> = {
  // Luxury & Boutique
  "luxury": [
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  ],
  "boutique": [
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
  ],
  "resort": [
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  ],

  // Location-based
  "beach": [
    "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
  ],
  "city": [
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551882547-ff43c61f3c3a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  ],
  "urban": [
    "https://images.unsplash.com/photo-1517840901100-8179e982ad91?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
  ],

  // Nature & Rural
  "mountain": [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
  ],
  "forest": [
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=80",
  ],

  // Style
  "modern": [
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551882547-ff43c61f3c3a?auto=format&fit=crop&w=800&q=80",
  ],
  "classic": [
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  ],
};

// Fallback pool used when no category match is found
const FALLBACK_HOTEL_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
];

// ─── Resolver ────────────────────────────────────────────────────────────────

/**
 * Returns a curated image URL for a hotel based on its name or category.
 * Falls back gracefully through partial matches and then to a generic hotel image.
 *
 * @param query    - A string containing hotel name, category, or amenities (case-insensitive)
 * @param hotelId  - Used to pick different images from the pool for variety
 */
export function getHotelCategoryImage(query: string, hotelId: string): string {
  const normalizedQuery = query?.toLowerCase().trim() ?? "";

  // 1. Partial match — find a key that the query string contains
  for (const mapKey of Object.keys(HOTEL_IMAGE_MAP)) {
    if (normalizedQuery.includes(mapKey) || mapKey.includes(normalizedQuery)) {
      const pool = HOTEL_IMAGE_MAP[mapKey];
      return pool[hashCode(hotelId) % pool.length];
    }
  }

  // 2. Generic fallback
  return FALLBACK_HOTEL_IMAGES[hashCode(hotelId) % FALLBACK_HOTEL_IMAGES.length];
}

/** Simple deterministic hash to pick a consistent image per hotel */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
