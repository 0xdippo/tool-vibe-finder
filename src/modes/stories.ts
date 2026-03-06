import { HttpError } from "../lib/http.js";
import { generateText } from "../lib/llm.js";
import { tokenize } from "../lib/text.js";
import { buildStorySystemPrompt, buildStoryUserPrompt } from "../prompts/writeStory.js";
import type { ChatResponse, VibeProfile } from "../types.js";

function buildFallbackStory(message: string, profile: VibeProfile): string {
  const toneWords = profile.stories.tone.join(", ");
  const flavor = tokenize(`${message} ${profile.global_preferences.soft_memory.join(" ")}`).slice(0, 6);
  const anchors = flavor.length > 0 ? flavor.join(", ") : "cozy details, gentle romance, and warmth";

  return [
    `Title: The Light Left On`,
    ``,
    `Mae left the bakery later than she meant to, palms still warm from the sheet pans she had carried in and out of the old deck oven all afternoon. March had turned the sidewalks glossy, and the shop windows along the square wore the soft halos that only happened when evening rain lingered just long enough to catch every streetlamp. On nights like that, the town felt edited down to its best lines: a florist closing her shutters by hand, a man in a navy coat jogging across the street with tulips tucked under one arm, a diner sign humming in the distance like it had a memory of summer. Mae usually loved that hour. Tonight she was too tired to love anything cleanly. She only wanted silence, a bowl of soup, and maybe the private comfort of knowing tomorrow would ask nothing difficult of her.`,
    `At the corner by the old cinema, she found the front marquee half lit and a ladder leaned against the brick as if someone had abandoned a plan midway through it. Noah, who had returned to town in January to help his aunt sort out the theater, was standing beneath the sign with a box of replacement bulbs at his feet and rain darkening the shoulders of his coat. He looked over when he heard Mae’s steps and smiled with an expression so immediately familiar that it felt unfair. They had not been close in school, not exactly, but they had belonged to the same weather: same town, same winter concerts, same habit of staying after everything else had ended because neither of them liked rushing home to empty rooms. “I know this is a terrible sales pitch,” he said, glancing up at the dead letters over his head, “but would you ever trust a movie recommendation from a man visibly losing a fight with a ladder?”`,
    `Mae laughed before she could help it, and the sound relieved something in her. Noah climbed down and confessed that he had promised his aunt the place would be ready for a small weekend revival series, only to discover that old buildings held grudges. A fuse panel had gone out. Two bulbs had shattered. One reel of promotional film was missing. Mae listened with the polite interest of someone expecting to be released in a minute, then found herself still there ten minutes later, offering him the practical kind of sympathy that translated into useful suggestions. Call Ezra at the hardware store because he still kept strange parts in labeled drawers. Ask Mrs. Bell at the library if the missing reel had been lent out during the high school film club years. Stop buying coffee from the gas station because there was real coffee two blocks over and the night would be long anyway.`,
    `He asked if she had time for that real coffee now, and because exhaustion had already pulled her out of her usual routines, Mae said yes. They walked to the diner under his umbrella, shoulders almost touching, and took a booth by the window where the glass had fogged at the edges. Noah remembered she hated raw onions. Mae remembered he used to underline library due dates in green pen and then return books three days early as if discipline were its own small superstition. They traded the harmless stories adults use to bridge the years between who they were and who they had become. Yet beneath the harmlessness ran something quieter and more electric: the realization that both of them had come back to town not because they had nowhere else to go, but because somewhere along the way they had grown tired of places that only knew how to make ambition visible and tenderness invisible.`,
    `When Mae admitted the bakery was hers now, though she still felt like she was borrowing the role from the woman who had run it before her, Noah nodded as if that made perfect sense. He said the theater felt the same way, less like a business than a set of promises he was learning to keep. There was no grand confession inside the conversation, nothing polished or cinematic. Instead there were smaller offerings: the way he asked what she wanted the bakery to become and waited through her pause without filling it; the way she told him the truth, which was that she wanted it to feel like a place where tired people could come back to themselves for fifteen minutes before the world made its next demand. “That sounds like a place worth protecting,” he said. It was such a simple line that Mae nearly missed what made it dangerous. He wasn’t talking about the bakery alone.`,
    `Over the next week, their errands developed the logic of a story before either of them would name it. Mae dropped off scones for the volunteers painting the cinema lobby and stayed to help alphabetize old posters while they dried. Noah delivered a set of framed menus he had found in the theater basement that belonged to Mae’s grandparents’ restaurant and watched her brush dust off the glass with a reverence that made him understand, suddenly, how much of love was simply attention paid over time. They moved around each other with the ease of people who recognized the same values long before they admitted the same feelings: steadiness, usefulness, humor that never tried to win the room, kindness expressed in specifics. When Mae grew quiet, Noah did not press. When Noah tried to carry everything himself, Mae ignored the performance and took half the weight anyway.`,
    `The night of the revival opening, the rain finally stopped. A line curled around the block, every coat collar turned up against the cold, every conversation carrying that small-town astonishment that something beloved had come back before it was too late. Mae arrived with two boxes of cardamom buns for the volunteers and found the marquee fully lit, the missing letters restored, the old gold trim on the ticket booth glowing as if it had been waiting all season for permission. Noah stepped out from behind the crowd when he saw her, and for a moment the square shrank down to the two of them and the breath they both forgot to take. “I saved you a seat,” he said, then, more softly, “unless you’d rather leave before it starts and walk for a while.” Mae looked at the theater, at the line, at the kind of night she would once have described as enough. Then she looked at Noah and recognized the difference between enough and true.`,
    `They walked instead. Past the florist, past the darkened windows above the pharmacy, past the bakery with the proofing lights still on in the back kitchen. Towns like theirs were often described as small because people imagined smallness as limitation, but Mae had begun to suspect the opposite. There was courage in choosing a life where details mattered, where people remembered what you could not eat and what you had once hoped for and whether your front room needed a lamp replaced. Under the clear break in the clouds, Noah told her he had almost not come back after his aunt first called. Mae admitted she had nearly sold the bakery during her first month running it alone. Each confession landed not like a tragedy but like an opening. By the time they stopped at her door, both of them were smiling with that quiet astonishment reserved for feelings that do not arrive loudly and therefore cannot be doubted.`,
    `Noah did not kiss her right away. He asked, because that was his way, and Mae loved him a little for asking before she loved him for anything else. The kiss itself was gentle, rain-cool, and brief enough to promise more without trying to claim it. Somewhere down the street the restored marquee still threw warm light over the pavement, and inside the bakery the last lamp glowed in the front window because Mae had forgotten to switch it off before leaving. She glanced past Noah’s shoulder and laughed softly. “I left the light on,” she said. He followed her gaze and smiled. “Maybe,” he said, “some lights are doing exactly what they’re meant to do.” The line should have sounded practiced in anyone else’s mouth. With him it sounded like a fact. Mae opened the door, and the warm dark of the bakery folded around them, carrying cardamom, sugar, old wood, and the first clear sense she’d had in months that a life could be both calm and vivid at once. Outside, the square settled into its ordinary hush. Inside, with flour on the counters and tomorrow’s dough resting in metal trays, everything felt newly lit.`,
    ``,
    `Story notes: generated locally because no OpenClaw-compatible LLM configuration was detected. Tone guide: ${toneWords}. Flavor anchors: ${anchors}.`,
  ].join("\n\n");
}

function normalizeStoryOutput(raw: string): string {
  if (/^title:/im.test(raw)) {
    return raw.trim();
  }

  return `Title: A Story for Tonight\n\n${raw.trim()}`;
}

export async function runStoriesMode(message: string, profile: VibeProfile): Promise<ChatResponse> {
  if (!profile.global_preferences.enabled_features.stories) {
    return {
      mode: "system",
      reply: "Stories are disabled in your local profile. Re-run the setup wizard or reset your vibe to turn them back on.",
      chips: [],
      cards: [],
    };
  }

  try {
    const story = await generateText({
      systemPrompt: buildStorySystemPrompt(),
      userPrompt: buildStoryUserPrompt(message, profile),
      temperature: 0.9,
      maxTokens: Math.max(1600, Math.floor(profile.stories.target_words * 1.5)),
    });

    return {
      mode: "stories",
      reply: story ? normalizeStoryOutput(story) : buildFallbackStory(message, profile),
      chips: ["shorter", "sweeter", "more dramatic", "another one"],
      cards: [],
    };
  } catch (error) {
    if (error instanceof HttpError && error.isRateLimited) {
      return {
        mode: "stories",
        reply: "Your configured language model is rate limited right now. I can retry in a minute, or I can generate a local fallback story instead.",
        chips: ["retry story", "shorter", "sweeter", "more dramatic"],
        cards: [],
        rateLimited: true,
      };
    }

    return {
      mode: "stories",
      reply: buildFallbackStory(message, profile),
      chips: ["shorter", "sweeter", "more dramatic", "another one"],
      cards: [],
    };
  }
}
