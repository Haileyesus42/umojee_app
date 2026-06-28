/**
 * placeCategoryImages.ts
 *
 * Maps place categories (from AI recommendations) to curated, reliable Unsplash images.
 * Each category has multiple images to add variety across cards.
 */

// ─── Category → Image Pool ───────────────────────────────────────────────────

const CATEGORY_IMAGE_MAP: Record<string, string[]> = {
    // Beach
    "beach": [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?auto=format&fit=crop&w=800&q=80",
    ],
    "beach & urban": [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516496636080-14fb876e029d?auto=format&fit=crop&w=800&q=80",
    ],
    "beach & culture": [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80",
    ],

    // City
    "city break": [
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=800&q=80",
    ],
    "city": [
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80",
    ],
    "urban": [
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=80",
    ],

    // Nature & Mountains
    "mountain": [
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
    ],
    "nature": [
        "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=800&q=80",
    ],
    "wildlife": [
        "https://images.unsplash.com/photo-1547970827-c6e10d8c8f2e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1504173010664-32509107de05?auto=format&fit=crop&w=800&q=80",
    ],
    "safari": [
        "https://images.unsplash.com/photo-1547970827-c6e10d8c8f2e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80",
    ],

    // Adventure
    "adventure": [
        "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    ],

    // Culture & History
    "culture": [
        "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80",
    ],
    "cultural": [
        "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=800&q=80",
    ],
    "history": [
        "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=800&q=80",
    ],
    "heritage": [
        "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1536662788222-6927ce05daea?auto=format&fit=crop&w=800&q=80",
    ],

    // Romance & Luxury
    "romantic": [
        "https://images.unsplash.com/photo-1529250673396-55fbc4d7a3e5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
    ],
    "luxury": [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    ],

    // Tropical & Island
    "tropical": [
        "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1582978212966-03c2a40a78c0?auto=format&fit=crop&w=800&q=80",
    ],
    "island": [
        "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=800&q=80",
    ],

    // Food & Art
    "food & art": [
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1534535009397-1fb0a46440f1?auto=format&fit=crop&w=800&q=80",
    ],
    "food": [
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    ],
    "art": [
        "https://images.unsplash.com/photo-1534535009397-1fb0a46440f1?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&w=800&q=80",
    ],

    // Winter & Snow
    "winter": [
        "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516912481808-3406841bd33c?auto=format&fit=crop&w=800&q=80",
    ],
    "ski": [
        "https://images.unsplash.com/photo-1548707305-97e5fec5b95e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516912481808-3406841bd33c?auto=format&fit=crop&w=800&q=80",
    ],

    // Desert & Arid
    "desert": [
        "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?auto=format&fit=crop&w=800&q=80",
    ],

    // Destination (generic)
    "destination": [
        "https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80",
    ],
};

// Fallback pool used when no category match is found
const FALLBACK_IMAGES: string[] = [
    "https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=800&q=80",
];

// ─── Resolver ────────────────────────────────────────────────────────────────

/**
 * Returns a curated image URL for a place based on its category.
 * Falls back gracefully through partial matches and then to a generic travel image.
 *
 * @param category  - The category string from the place data (case-insensitive)
 * @param placeId   - Used to pick different images from the pool for variety
 */
export function getPlaceCategoryImage(category: string, placeId: string): string {
    const key = category?.toLowerCase().trim() ?? "";

    // 1. Exact match
    if (CATEGORY_IMAGE_MAP[key]) {
        const pool = CATEGORY_IMAGE_MAP[key];
        return pool[hashCode(placeId) % pool.length];
    }

    // 2. Partial match — find a key that the category string contains
    for (const mapKey of Object.keys(CATEGORY_IMAGE_MAP)) {
        if (key.includes(mapKey) || mapKey.includes(key)) {
            const pool = CATEGORY_IMAGE_MAP[mapKey];
            return pool[hashCode(placeId) % pool.length];
        }
    }

    // 3. Generic fallback
    return FALLBACK_IMAGES[hashCode(placeId) % FALLBACK_IMAGES.length];
}

/** Simple deterministic hash to pick a consistent image per place */
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}
