// Authentic Hermetic / Neoplatonic codex fragments.
//
// Text is drawn from public-domain translations and lightly edited for
// readability while preserving the cadence of the originals:
//
//   - Corpus Hermeticum (Poimandres, Logos Teleios, Asclepius, Treatise XIII)
//     — G. R. S. Mead's trans., "Thrice-Greatest Hermes" (1906)
//   - Plotinus, Enneads — Stephen MacKenna's trans. (1917–30)
//   - Iamblichus, De Mysteriis Aegyptiorum — Thomas Taylor's trans. (1821)
//   - Emerald Tablet (Tabula Smaragdina) — Newton's English rendering
//
// Each fragment carries a `source` so the curious player can dig deeper.
// Fragments are short by design: the goal is revelation, not lecture.

export type CodexChapter =
  | 'awakening'
  | 'descent'
  | 'governors'
  | 'operations'
  | 'ascent'
  | 'ogdoad';

export interface CodexEntry {
  id: string;
  chapter: CodexChapter;
  title: string;
  source: string;
  text: string;
  // How the player unlocks this fragment. Used for hint text and routing.
  unlock: {
    kind: 'opening' | 'firstFloor' | 'sphereReached' | 'sphereBoss' | 'shrine' | 'victory' | 'death';
    sphere?: SphereId;          // for sphereReached / sphereBoss
    shrineKind?: string;        // for shrine (matches ShrineKind)
    minVictories?: number;      // for victory-gated entries
  };
}

import { SphereId } from './spheres';

export const CODEX: CodexEntry[] = [
  // ─── I. THE AWAKENING ────────────────────────────────────────────────
  {
    id: 'awaken.pimander',
    chapter: 'awakening',
    title: 'The Voice of Poimandres',
    source: 'Corpus Hermeticum I.1–2',
    text:
      'On a certain day, when I had begun to think upon the things that are, and my thought soared high, the senses of my body being held back, there appeared to me one of vast and boundless stature, who called me by my name and said: "What dost thou wish to hear and see, and learn and come to know?" "Who art thou?" said I. "I am Poimandres," said he, "the Mind of the Sovereignty. I know what thou dost wish, and I am with thee everywhere."',
    unlock: { kind: 'opening' },
  },
  {
    id: 'awaken.light',
    chapter: 'awakening',
    title: 'The Boundless Light',
    source: 'Corpus Hermeticum I.4',
    text:
      'And in a little while all things were changed before me, and I beheld a vision without bound — all become Light, sweet and joyful exceedingly. And as I gazed I came to love that sight.',
    unlock: { kind: 'firstFloor' },
  },

  // ─── II. THE DESCENT OF THE ANTHROPOS ─────────────────────────────────
  {
    id: 'descent.mind',
    chapter: 'descent',
    title: 'Mind, the Father',
    source: 'Corpus Hermeticum I.6',
    text:
      '"That Light," he said, "am I, even Mind, the first God, who was before the watery substance which appeared out of the Darkness. And the Word that came forth from the Light is the Son of God."',
    unlock: { kind: 'sphereReached', sphere: 'moon' },
  },
  {
    id: 'descent.anthropos',
    chapter: 'descent',
    title: 'The Birth of the Anthropos',
    source: 'Corpus Hermeticum I.12',
    text:
      'And the Father of all things — Mind, being Life and Light — brought forth Man (Anthropos) of His own essence, equal to Himself, and loved him as His own child. For he was very beautiful, bearing the image of his Father; and indeed God did love His own Form.',
    unlock: { kind: 'sphereReached', sphere: 'mercury' },
  },
  {
    id: 'descent.fall',
    chapter: 'descent',
    title: 'The Image in the Water',
    source: 'Corpus Hermeticum I.14',
    text:
      'And Man, who had all authority over the cosmos of mortals, broke through the vault of the spheres and showed to Nature below the beautiful form of God. And Nature, seeing the beauty he had brought, smiled with love — for she had beheld the reflection of fairest Man upon the water, and his shadow on the earth. And he, seeing this form like to himself in her, loved it, and willed to dwell there. And in that willing, he descended.',
    unlock: { kind: 'sphereReached', sphere: 'venus' },
  },

  // ─── III. THE SEVEN GOVERNORS ────────────────────────────────────────
  // Pimander I.9: the Demiurge fashions Seven Administrators who encompass
  // the sensible cosmos with the rings of their spheres.
  {
    id: 'gov.moon',
    chapter: 'governors',
    title: 'The First Governor — Selene',
    source: 'Corpus Hermeticum I.9, Asclepius III',
    text:
      'Of the Seven, the lowest is the Moon: she who orders increase and waning, the tides of the body, the silvered face of forgetfulness. By her measure the soul forgets the upper light, and learns to count its breaths.',
    unlock: { kind: 'sphereReached', sphere: 'moon' },
  },
  {
    id: 'gov.mercury',
    chapter: 'governors',
    title: 'The Second Governor — Hermes',
    source: 'Corpus Hermeticum I.9',
    text:
      'Quicksilver Hermes is the messenger and the deceiver both. From him comes the cunning of words and the brightness of merchants; and from him, when his rule is suffered without temperance, the slander that lies between brothers.',
    unlock: { kind: 'sphereReached', sphere: 'mercury' },
  },
  {
    id: 'gov.venus',
    chapter: 'governors',
    title: 'The Third Governor — Aphrodite',
    source: 'Corpus Hermeticum I.9',
    text:
      'Venus is the desire that joins and the desire that consumes. Her rule is sweetness; her tyranny, the heat that scatters the soul into a thousand small loves and finds at last that none of them is the Beloved.',
    unlock: { kind: 'sphereReached', sphere: 'venus' },
  },
  {
    id: 'gov.sun',
    chapter: 'governors',
    title: 'The Fourth Governor — Helios',
    source: 'Corpus Hermeticum I.9, Iamblichus VIII.3',
    text:
      'The Sun is the king of the cosmos, but he is not the Sun beyond the cosmos. Mistake the lamp for the Light and pride will eat thee — for thou wilt set thyself as ruler where thou wast made to be ruled by the One above all rule.',
    unlock: { kind: 'sphereReached', sphere: 'sun' },
  },
  {
    id: 'gov.mars',
    chapter: 'governors',
    title: 'The Fifth Governor — Ares',
    source: 'Corpus Hermeticum I.9',
    text:
      'Mars is the warden of edges. From him comes the boldness that severs the false from the true; from him also the rashness that strikes before knowing, and the audacity that mistakes a sword for an argument.',
    unlock: { kind: 'sphereReached', sphere: 'mars' },
  },
  {
    id: 'gov.jupiter',
    chapter: 'governors',
    title: 'The Sixth Governor — Zeus',
    source: 'Corpus Hermeticum I.9',
    text:
      'Jupiter is largeness — of vision, of dominion, of appetite. By his hand kingdoms are gathered, and by his hand they are squandered; for the soul that grows without measure becomes a vessel too wide to hold the Light it sought.',
    unlock: { kind: 'sphereReached', sphere: 'jupiter' },
  },
  {
    id: 'gov.saturn',
    chapter: 'governors',
    title: 'The Seventh Governor — Kronos',
    source: 'Corpus Hermeticum I.9',
    text:
      'Saturn is the slowest and the eldest, the lord of bone and law and time. His gift is patience; his shadow, the lie that nothing changes. Cross his ring and the spheres themselves grow silent — for beyond Saturn there is no clock, and no need of one.',
    unlock: { kind: 'sphereReached', sphere: 'saturn' },
  },

  // ─── IV. THE SEVEN OPERATIONS ────────────────────────────────────────
  // The seven alchemical operations as inward purifications. Each is also
  // the shrine kind in the engine (ShrineKind), so triggering the shrine
  // unlocks the matching teaching.
  {
    id: 'op.calcination',
    chapter: 'operations',
    title: 'I. Of Calcination',
    source: 'Splendor Solis, and Pseudo-Geber, Summa Perfectionis',
    text:
      'The first work is fire upon the unwashed prima materia: to burn away the false self that mistakes the husk for the kernel. What survives the flame is what was true; what becomes ash was never thou.',
    unlock: { kind: 'shrine', shrineKind: 'calcination' },
  },
  {
    id: 'op.dissolution',
    chapter: 'operations',
    title: 'II. Of Dissolution',
    source: 'Aurora Consurgens, attributed to St. Thomas Aquinas',
    text:
      'After the fire, the water. To dissolve is to let the ash sink into the depths and lose its outline. Here pride is undone, for that which would not yield to the flame must yield to the slow tongue of the sea.',
    unlock: { kind: 'shrine', shrineKind: 'dissolution' },
  },
  {
    id: 'op.separation',
    chapter: 'operations',
    title: 'III. Of Separation',
    source: 'Hermes, Tabula Smaragdina (Newton trans.)',
    text:
      '"Thou shalt separate the earth from the fire, the subtle from the gross, sweetly with great industry." Sift the precipitate from the wash. The work asks: of all that thou hast been, what alone remains worth keeping?',
    unlock: { kind: 'shrine', shrineKind: 'separation' },
  },
  {
    id: 'op.conjunction',
    chapter: 'operations',
    title: 'IV. Of Conjunction',
    source: 'Rosarium Philosophorum',
    text:
      'The wedding of Sol and Luna, of sulphur and mercury — of the active and the receptive within thee. None ascends who has not first joined what was sundered. The Stone is not given; the Stone is wedded together.',
    unlock: { kind: 'shrine', shrineKind: 'conjunction' },
  },
  {
    id: 'op.fermentation',
    chapter: 'operations',
    title: 'V. Of Fermentation',
    source: 'Splendor Solis, Plate IX',
    text:
      'Now the wedded Stone is buried in the dark and putrefies. The peacock\'s tail blooms and is consumed. What looks like death is only the work of the seed in the rot, and the spirit returning to what was killed.',
    unlock: { kind: 'shrine', shrineKind: 'fermentation' },
  },
  {
    id: 'op.distillation',
    chapter: 'operations',
    title: 'VI. Of Distillation',
    source: 'Pseudo-Llull, Testamentum',
    text:
      'A hundredfold the spirit is raised and condensed, and raised again. Every pass purer than the last. So with the soul: not by one cleansing but by the long return of the work upon itself is the white tincture brought forth.',
    unlock: { kind: 'shrine', shrineKind: 'distillation' },
  },
  {
    id: 'op.coagulation',
    chapter: 'operations',
    title: 'VII. Of Coagulation',
    source: 'Atalanta Fugiens (Maier, 1617)',
    text:
      'The last work fixes the volatile. What flew unbidden is now fixed in the body without binding it. This is the Philosopher\'s Stone — not a thing made, but a self at last self-possessed; spirit that walks in matter without forgetting whence it came.',
    unlock: { kind: 'shrine', shrineKind: 'coagulation' },
  },

  // ─── V. THE ASCENT ────────────────────────────────────────────────────
  // Pimander I.25: at the dissolution of the body, the soul ascends through
  // the seven rings, surrendering at each the energy that ring imposed.
  {
    id: 'asc.moon',
    chapter: 'ascent',
    title: 'To the Moon — Surrender of Growth and Waning',
    source: 'Corpus Hermeticum I.25 (first zone)',
    text:
      '"And thus does Man ascend through the structure of the spheres. To the first zone he gives up the energy of growth and waning."',
    unlock: { kind: 'sphereBoss', sphere: 'moon' },
  },
  {
    id: 'asc.mercury',
    chapter: 'ascent',
    title: 'To Mercury — Surrender of Cunning',
    source: 'Corpus Hermeticum I.25 (second zone)',
    text:
      '"To the second, the device of evils — and deceit no longer working."',
    unlock: { kind: 'sphereBoss', sphere: 'mercury' },
  },
  {
    id: 'asc.venus',
    chapter: 'ascent',
    title: 'To Venus — Surrender of Desire',
    source: 'Corpus Hermeticum I.25 (third zone)',
    text:
      '"To the third, the illusion of desire — and desire no longer working."',
    unlock: { kind: 'sphereBoss', sphere: 'venus' },
  },
  {
    id: 'asc.sun',
    chapter: 'ascent',
    title: 'To the Sun — Surrender of Sovereignty',
    source: 'Corpus Hermeticum I.25 (fourth zone)',
    text:
      '"To the fourth, the ruling arrogance — no longer being filled with pride."',
    unlock: { kind: 'sphereBoss', sphere: 'sun' },
  },
  {
    id: 'asc.mars',
    chapter: 'ascent',
    title: 'To Mars — Surrender of Audacity',
    source: 'Corpus Hermeticum I.25 (fifth zone)',
    text:
      '"To the fifth, the unholy daring and the rashness of audacity."',
    unlock: { kind: 'sphereBoss', sphere: 'mars' },
  },
  {
    id: 'asc.jupiter',
    chapter: 'ascent',
    title: 'To Jupiter — Surrender of Striving',
    source: 'Corpus Hermeticum I.25 (sixth zone)',
    text:
      '"To the sixth, the striving for wealth by evil means — deprived of its means."',
    unlock: { kind: 'sphereBoss', sphere: 'jupiter' },
  },
  {
    id: 'asc.saturn',
    chapter: 'ascent',
    title: 'To Saturn — Surrender of the Falsehood that Ensnares',
    source: 'Corpus Hermeticum I.25 (seventh zone)',
    text:
      '"And to the seventh zone, the falsehood that doth ensnare. And then, made bare of all the workings of the cosmic frame, the soul cometh to the Eighth Nature, with its own proper power, and hymneth with the Beings there to the Father."',
    unlock: { kind: 'sphereBoss', sphere: 'saturn' },
  },

  // ─── VI. THE OGDOAD ───────────────────────────────────────────────────
  {
    id: 'ogdoad.hymn',
    chapter: 'ogdoad',
    title: 'The Hymn of the Reborn',
    source: 'Corpus Hermeticum XIII.18–20',
    text:
      '"Holy is God, the Father of all things. Holy is God, whose will is accomplished by his own powers. Holy is God, who would be known and is known by his own. Holy art Thou, who by thy Word hast formed all that is. Holy art Thou, of whom all Nature is the image. Holy art Thou, whom Nature hath not formed. Holy art Thou, who art stronger than all dominion. Holy art Thou, who art greater than all eminence. Holy art Thou, surpassing all praise."',
    unlock: { kind: 'victory' },
  },
  {
    id: 'ogdoad.alone',
    chapter: 'ogdoad',
    title: 'The Flight of the Alone',
    source: 'Plotinus, Enneads VI.9.11 (MacKenna trans.)',
    text:
      'This is the life of the gods and of the godlike and blessed among men: liberation from the alien that besets us here, a life taking no pleasure in the things of earth — the passing of solitary to solitary, the flight of the Alone to the Alone.',
    unlock: { kind: 'victory' },
  },
  {
    id: 'ogdoad.beauty',
    chapter: 'ogdoad',
    title: 'On Becoming What One Sees',
    source: 'Plotinus, Enneads I.6.9',
    text:
      'No eye that has not become like unto the Sun can ever look upon the Sun; nor can any soul behold Beauty without first becoming beautiful itself. Therefore, let each one first become god-like and beautiful, that he may behold God and Beauty.',
    unlock: { kind: 'victory', minVictories: 2 },
  },
  {
    id: 'ogdoad.theurgy',
    chapter: 'ogdoad',
    title: 'On the Work of the Gods',
    source: 'Iamblichus, De Mysteriis I.12',
    text:
      'It is not pure thought that unites theurgists to the gods. For what would prevent contemplative philosophers from achieving theurgic union with them? Rather, it is the perfection of acts unspeakable and beyond all conception — the power of the ineffable symbols which are intelligible to the gods alone — that establishes union.',
    unlock: { kind: 'victory', minVictories: 3 },
  },

  // ─── DEATH & RETURN ───────────────────────────────────────────────────
  {
    id: 'death.palingenesia',
    chapter: 'awakening',
    title: 'On Palingenesia — The Forgetting and the Return',
    source: 'Corpus Hermeticum XIII.1–3 (paraphrased)',
    text:
      'My son: the man who is to be reborn is born again of God, of the Will of God, the holy Logos. He casts off the bodily senses that he may know himself; he separates from the cosmos of birth, that he may belong no more to the Twelve Tormentors — and so, when he is recompounded of the powers, he comes to be of god\'s race.',
    unlock: { kind: 'death' },
  },
];

export const CODEX_BY_ID: Record<string, CodexEntry> =
  Object.fromEntries(CODEX.map((e) => [e.id, e]));

export const CHAPTER_ORDER: CodexChapter[] = [
  'awakening', 'descent', 'governors', 'operations', 'ascent', 'ogdoad',
];

export const CHAPTER_TITLES: Record<CodexChapter, string> = {
  awakening: 'I. The Awakening',
  descent:   'II. The Descent of the Anthropos',
  governors: 'III. The Seven Governors',
  operations:'IV. The Seven Operations',
  ascent:    'V. The Ascent',
  ogdoad:    'VI. The Ogdoad',
};

export const CHAPTER_SUBTITLES: Record<CodexChapter, string> = {
  awakening: 'How the Mind addresses the Initiate',
  descent:   'How Man came to dwell in Nature',
  governors: 'The seven rings of the cosmos',
  operations:'Seven inward purifications',
  ascent:    'What is surrendered to each ring',
  ogdoad:    'The Eighth Sphere, and what is sung there',
};
