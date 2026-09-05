import type {CaptionWord} from '../components/KineticCaption';
import type {KillTier} from '../components/KillStreakPopup';

export type AgenticEventKind = 'kill' | 'streak' | 'callout' | 'impact';

/** A beat supplied by the optional sidecar, or by a future analyzer. */
export type AgenticEvent = {
	time: number;
	kind: AgenticEventKind;
	tier?: KillTier;
	label?: string;
	sublabel?: string;
	tone?: 'white' | 'yellow' | 'red' | 'blue';
};

export type AgenticHighlightProps = {
	/** Path relative to public/, for example raw/my-gameplay.mp4. */
	source?: string;
	sourceName?: string;
	/** Exact output length. The prepare script fills this from ffprobe. */
	durationInFrames?: number;
	fps?: number;
	playerName?: string;
	event?: string;
	matchup?: string;
	channelName?: string;
	accentColor?: string;
	introHoldMs?: number;
	events?: AgenticEvent[];
	transcript?: CaptionWord[];
	/** Keep the clean footage visible under the intro instead of using mock footage. */
	showIntro?: boolean;
};

export const DEFAULT_AGENTIC_PROPS: Required<
	Pick<
		AgenticHighlightProps,
		| 'source'
		| 'sourceName'
		| 'durationInFrames'
		| 'fps'
		| 'playerName'
		| 'event'
		| 'matchup'
		| 'channelName'
		| 'accentColor'
		| 'introHoldMs'
		| 'events'
		| 'transcript'
		| 'showIntro'
	>
> = {
	source: '',
	sourceName: 'demo footage',
	durationInFrames: 30 * 30,
	fps: 30,
	playerName: 'MLBB HIGHLIGHTS',
	event: 'AUTO CUT',
	matchup: 'DROP FOOTAGE TO START',
	channelName: 'AUTO EDIT',
	accentColor: '#3FA9FF',
	introHoldMs: 2200,
	events: [],
	transcript: [],
	showIntro: true,
};
