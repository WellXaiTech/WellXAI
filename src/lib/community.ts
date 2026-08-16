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
