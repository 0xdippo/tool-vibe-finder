import { searchWeb } from "../../lib/webSearch.js";
import { tokenize } from "../../lib/text.js";
import type { ShowCandidate } from "../../types.js";

const GENRE_HINTS = [
  "romance",
  "drama",
  "comedy",
  "thriller",
  "family",
  "mystery",
  "cozy",
  "fantasy",
  "period",
  "teen",
];

const LOCAL_SHOW_LIBRARY: Array<Pick<ShowCandidate, "title" | "description" | "genres" | "url">> = [
  {
    title: "Hart of Dixie",
    description: "Warm small-town dramedy with romance, banter, and a comfort-watch rhythm.",
    genres: ["romance", "drama", "cozy"],
    url: "https://www.imdb.com/title/tt1832979/",
  },
  {
    title: "Sweet Magnolias",
    description: "Friendship-driven small-town romance with a softer emotional tone.",
    genres: ["romance", "drama", "family"],
    url: "https://www.imdb.com/title/tt9073748/",
  },
  {
    title: "The Good Witch",
    description: "Gentle community stories, light romance, and very low-stress stakes.",
    genres: ["cozy", "family", "romance"],
    url: "https://www.imdb.com/title/tt3906732/",
  },
  {
    title: "All Creatures Great and Small",
    description: "Tender, humane ensemble storytelling with warmth and countryside charm.",
    genres: ["drama", "family", "cozy"],
    url: "https://www.imdb.com/title/tt10590066/",
  },
  {
    title: "Parenthood",
    description: "Character-first family drama with heart, humor, and strong emotional payoff.",
    genres: ["drama", "family", "comedy"],
    url: "https://www.imdb.com/title/tt1416765/",
  },
  {
    title: "Friday Night Lights",
    description: "Earnest, grounded drama with intimacy, community, and strong relationships.",
    genres: ["drama", "family", "romance"],
    url: "https://www.imdb.com/title/tt0758745/",
  },
  {
    title: "Somebody Somewhere",
    description: "Quietly funny adult dramedy with kindness, vulnerability, and intimacy.",
    genres: ["comedy", "drama", "cozy"],
    url: "https://www.imdb.com/title/tt12759100/",
  },
  {
    title: "Anne with an E",
    description: "Lyrical comfort drama with warmth, family feeling, and emotional sincerity.",
    genres: ["drama", "family", "period"],
    url: "https://www.imdb.com/title/tt5421602/",
  },
  {
    title: "The Durrells",
    description: "Sunny ensemble drama with warmth, family chaos, and low-pressure charm.",
    genres: ["drama", "family", "comedy"],
    url: "https://www.imdb.com/title/tt5014882/",
  },
  {
    title: "Shrinking",
    description: "Character-led dramedy with warmth, grief, humor, and hopeful connection.",
    genres: ["comedy", "drama", "romance"],
    url: "https://www.imdb.com/title/tt15677150/",
  },
  {
    title: "Everwood",
    description: "Heartfelt small-town drama with family tension and gentle romance.",
    genres: ["drama", "family", "romance"],
    url: "https://www.imdb.com/title/tt0318883/",
  },
  {
    title: "When Calls the Heart",
    description: "Earnest period comfort series with romance, kindness, and community.",
    genres: ["romance", "family", "period"],
    url: "https://www.imdb.com/title/tt2874692/",
  },
];

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|:-]\s*(IMDb|Rotten Tomatoes|Netflix|Hulu|Prime Video|TV Guide|Vulture|Screen Rant).*/i, "")
    .trim();
}

function localCandidates(query: string): ShowCandidate[] {
  const tokens = tokenize(query);

  return LOCAL_SHOW_LIBRARY.map((item, index) => {
    const haystack = tokenize(`${item.title} ${item.description} ${item.genres.join(" ")}`);
    const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);

    return {
      id: `local-show:${index}`,
      title: item.title,
      description: item.description,
      genres: item.genres,
      source: "web" as const,
      url: item.url,
      score,
    };
  })
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 8);
}

export async function getWebShowCandidates(query: string): Promise<ShowCandidate[]> {
  const searchQuery = query.includes("shows like")
    ? `${query} site:imdb.com/title/`
    : `site:imdb.com/title/ ${query} tv series`;
  const results = await searchWeb(searchQuery);
  const locals = localCandidates(query);

  const webCandidates = results
    .filter((result) => !/tv guide|on tv tonight|schedule|listings/i.test(`${result.title} ${result.url}`))
    .map((result, index) => ({
      id: `web-show:${index}:${result.url}`,
      title: cleanTitle(result.title),
      description: result.snippet || "Web result",
      genres: GENRE_HINTS.filter((hint) => result.snippet.toLowerCase().includes(hint)),
      source: "web" as const,
      url: result.url,
    }));

  const seen = new Set<string>();
  return [...locals, ...webCandidates].filter((candidate) => {
    const key = candidate.title.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
