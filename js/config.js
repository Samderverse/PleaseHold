// Please Hold: the game's data. No logic here.

export const START_BULBS = 3;
export const MAX_BULBS = 5;
export const RUN_LENGTH = 7;   // rooms before the Last Curtain

export const ROOM_TYPES = {
  drop: { name: 'The Drop', card: 'THE DROP', hint: 'DRAG TO AIM · TAP TO FIRE' },
  switchboard: { name: 'The Switchboard', card: 'SWITCHBOARD', hint: 'TAP A BULB · TURN THEM ALL OFF' },
  wiring: { name: 'The Wiring', card: 'THE WIRING', hint: 'TAP A TILE TO TURN IT · POWER THE LAMP' },
  same: { name: 'The Same Room', card: 'SAME ROOM', hint: 'LOOK · THEN SAY IF ANYTHING CHANGED' },
};

// Every deal pairs a boon with a cost, and each can land in a different room.
export const DEALS = [
  { id: 'spare', name: 'Spare Bulb', boon: '+1 bulb', cost: 'The next room starts in darkness for 5 seconds', now: 'spare' },
  { id: 'wick', name: 'Long Wick', boon: 'Puzzle timers 30% longer', cost: 'One fewer shot in the Drop', mods: { timerMul: 0.3, shots: -1 } },
  { id: 'flare', name: 'Flare', boon: 'More light in every room', cost: 'The look in the Same Room is a second shorter', mods: { light: 0.4, look: -1 } },
  { id: 'second', name: 'Second Look', boon: 'The Same Room shows each scene twice', cost: 'Puzzle timers 20% shorter', mods: { secondLook: 1, timerMul: -0.2 } },
  { id: 'extra', name: 'Extra Balls', boon: '+2 shots in the Drop', cost: 'The bucket stops moving and sits at the edge', mods: { shots: 2, bucketStill: 1 } },
  { id: 'steady', name: 'Steady Hand', boon: 'The aim line shows two bounces', cost: 'The music gets louder and further out of tune', mods: { twoBounces: 1, warp: 1 } },
  { id: 'hint', name: 'Hint', boon: 'Each puzzle shows one correct move', cost: 'Lose a bulb now', mods: { hint: 1 }, now: 'loseBulb', needsBulbs: 2 },
  { id: 'key', name: 'Skeleton Key', boon: 'Skip one room, once', cost: 'The Host picks your next curtain', now: 'key' },
  { id: 'third', name: 'Third Curtain', boon: 'Choose from three curtains', cost: 'The queue is one longer', mods: { third: 1 }, now: 'longer' },
  { id: 'quiet', name: 'Quiet', boon: 'The Host stops talking', cost: 'No more warnings when a lamp or fuse is nearly out', mods: { quiet: 1 } },
];

// The Host speaks like a recorded hold message that has gone slightly wrong.
export const HOST = {
  first: 'Please hold. Your call is important to us. You are number seven in the queue.',
  back: [
    'Thank you for holding. You are now number {n} in the queue.',
    'Thank you for your patience. You are number {n}.',
    'You have moved up. You are number {n}. Please continue to hold.',
  ],
  sorry: [
    'Sorry about that. Please continue to hold.',
    'Still there? Good. Please hold.',
    'That one is still waiting for you.',
  ],
  choose: [
    'Please choose a room. Both are lovely.',
    'Someone was just in there. They will not mind.',
    'Take your time. We have all of it.',
  ],
  deal: [
    'While you wait, may I offer you something?',
    'Our hold rewards scheme. Terms apply.',
    'Complimentary. Almost.',
  ],
  take: ['Wonderful. I have added it to your account.', 'Lovely. Hold on to that.', 'Noted on your file.'],
  refuse: ['Of course. Please hold.', 'Your loss. Literally.', 'I will keep them warm for you.'],
  picks: ['I will choose for you. It is no trouble.', 'Allow me.'],
  key: 'A key. How unusual. Off you go, then.',
  rooms: {
    drop: 'Drop something. See what it breaks.',
    switchboard: 'Lights off, please. All of them. We are trying to save money.',
    wiring: 'The lamp needs power. The wires are where you left them.',
    same: 'Look carefully. Then look again. Tell me if anything moved.',
  },
  warn: ['The lamp is nearly out.', 'Not long now.', 'Nearly, nearly.'],
  lost: ['Never mind. Back to the waiting room.', 'Oh dear. Back you go.'],
  bulb: ['One less light.', 'Darker now.', 'Mind the glass.'],
  last: 'Now serving: you. Something in here is not right. Show me, and you may go.',
  lastWrong: ['No. Look again.', 'That has always been there.'],
  win: 'Thank you for holding. Your call has been connected. Goodbye.',
  dead: 'We are sorry. All of our lines are busy. Please hang up and try again.',
};

export const SAME_CHANGES_TOLD = {
  chairTurned: 'The chair turned round.',
  chairMoved: 'The chair moved.',
  lampColour: 'The lamp changed colour.',
  lampOff: 'The lamp went out.',
  clockBack: 'The clock ran backwards.',
  clockTime: 'The clock jumped.',
  pictureUpside: 'The picture turned over.',
  pictureGone: 'The picture went.',
  phoneOff: 'The phone came off the hook.',
  tile: 'One tile turned red.',
  figure: 'Someone stood by the curtain.',
  curtain: 'The curtains changed colour.',
  extraChair: 'There was another chair.',
  tableMoved: 'The table moved.',
  musicLow: 'The music dropped a semitone.',
  tickStop: 'The clock stopped ticking.',
  queue: 'The number on the wall changed.',
  openingSide: 'The gap in the curtain moved.',
  lampMoved: 'The lamp moved.',
  phoneGone: 'The phone went.',
};
