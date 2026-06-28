export type Participant = {
  slot: 1 | 2;
  name: string;
  passwordHash: string;
  sessionToken: string;
  lastReadTs: number;
};

export type Room = {
  code: string;
  createdAt: number;
  participants: Participant[]; // max length 2
};

export type ChatMessage = {
  id: string;
  slot: 1 | 2;
  name: string;
  text: string;
  ts: number;
};

export type PublicParticipant = {
  slot: 1 | 2;
  name: string;
};
