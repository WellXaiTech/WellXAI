import { kv } from "@vercel/kv";

export type CommunityMessage = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
};

// Single global room shared by every ChatGiZa user -- unlike collab.ts's
// per-code sessions, there is only ever one key here.
export const COMMUNITY_KEY = "chatgiza:community:messages";

// Keeps the KV value bounded -- this is a public firehose, not a
// per-user conversation, so it can grow without limit otherwise.
export const COMMUNITY_MESSAGE_LIMIT = 300;

const COMMUNITY_VERSION_KEY = "chatgiza:community:version";
const MAX_CAS_ATTEMPTS = 5;

// Same compare-and-swap approach as mutateAds (src/lib/ads.ts) -- see there
// for why a Lua EVAL is what atomicity looks like on Upstash's REST API.
// Every write here used to be a plain get+push+set: two people posting in
// the same instant could both read the same list, and whichever save
// landed last silently discarded the other's message. This retries the
// mutator against the latest list whenever it loses the race instead.
const CAS_SCRIPT = `
local current = redis.call('GET', KEYS[2])
if current == false then current = '0' end
if current == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2])
  redis.call('SET', KEYS[2], ARGV[3])
  return 1
end
return 0
`;

export async function mutateCommunityMessages(
  mutator: (messages: CommunityMessage[]) => CommunityMessage[]
): Promise<CommunityMessage[]> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const [messages, version] = await Promise.all([
      kv.get<CommunityMessage[]>(COMMUNITY_KEY),
      kv.get<number>(COMMUNITY_VERSION_KEY),
    ]);
    const currentVersion = version ?? 0;
    const next = mutator(messages ?? []);
    const ok = await kv.eval<[string, string, string], number>(
      CAS_SCRIPT,
      [COMMUNITY_KEY, COMMUNITY_VERSION_KEY],
      [String(currentVersion), JSON.stringify(next), String(currentVersion + 1)]
    );
    if (ok === 1) return next;
  }
  throw new Error("Couldn't post -- too much activity right now, please try again");
}
