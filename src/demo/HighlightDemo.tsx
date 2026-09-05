import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {IntroTitleCard} from '../components/IntroTitleCard';
import {KillCounter} from '../components/KillCounter';
import {KillStreakPopup} from '../components/KillStreakPopup';
import {KineticCaption} from '../components/KineticCaption';
import {MinimapRouteTracer} from '../components/MinimapRouteTracer';
import {SplitScreenFrame} from '../components/SplitScreenFrame';
import {StatusCallout} from '../components/StatusCallout';
import {DEMO_ROUTE, DEMO_TRANSCRIPT} from './demoData';
import {MockGameplay, MockReactionCam} from './MockFootage';

/**
 * Everything wired together the way you'd actually cut a highlight.
 * Timings are in seconds and converted with fps, so retiming = edit one number.
 */
export const HighlightDemo: React.FC = () => {
	const {fps} = useVideoConfig();
	const s = (seconds: number) => Math.round(seconds * fps);

	/** The moment each kill lands in the footage. */
	const killTimes = [4.2, 6.4, 8.3, 10.6, 12.9];

	return (
		<SplitScreenFrame
			topVideo={<MockGameplay />}
			bottomVideo={<MockReactionCam name="ONIC.KAIRI" />}
			topRatio={0.7}
			channelName="@clutchmoments"
			channelAlign="right"
		>
			{/* ---------- 1. intro title card ---------- */}
			<Sequence from={0} durationInFrames={s(3.2)}>
				<IntroTitleCard
					playerName="ONIC.KAIRI"
					event="M4 World Championship 2022"
					matchup="ONIC PH vs BLACKLIST"
					accentColor="#3FA9FF"
				/>
			</Sequence>

			{/* ---------- 6. running kill counter ---------- */}
			{/* Starts at 0 so `killTimes` stay in absolute clip seconds; it simply
			    stays hidden until the first kill lands. */}
			<Sequence from={0}>
				<KillCounter
					killTimes={killTimes}
					timeUnit="seconds"
					corner="top-right"
					hideBeforeFirstKill
				/>
			</Sequence>

			{/* ---------- 2. status callouts ---------- */}
			<Sequence from={s(3.9)} durationInFrames={s(3.1)}>
				<StatusCallout label="CC Immune" sublabel="Purify active" corner="upper-left" tone="yellow" holdMs={2600} />
			</Sequence>
			<Sequence from={s(8.0)} durationInFrames={s(2.8)}>
				<StatusCallout label="Stunned" corner="upper-left" tone="white" holdMs={2300} />
			</Sequence>
			<Sequence from={s(12.4)} durationInFrames={s(2.8)}>
				<StatusCallout label="Absorb" sublabel="Shield popped" corner="upper-left" tone="blue" holdMs={2300} />
			</Sequence>

			{/* ---------- 1. kill-streak popups, one per tier ---------- */}
			<Sequence from={s(6.4)} durationInFrames={s(1.4)}>
				<KillStreakPopup killTier="DOUBLE" offsetY={-120} />
			</Sequence>
			<Sequence from={s(8.3)} durationInFrames={s(1.4)}>
				<KillStreakPopup killTier="TRIPLE" offsetY={-120} />
			</Sequence>
			<Sequence from={s(10.6)} durationInFrames={s(1.5)}>
				<KillStreakPopup killTier="MANIAC" offsetY={-120} holdMs={1100} />
			</Sequence>
			<Sequence from={s(12.9)} durationInFrames={s(1.6)}>
				<KillStreakPopup killTier="SAVAGE" offsetY={-120} holdMs={1200} />
			</Sequence>

			{/* ---------- 4. kinetic commentary captions ---------- */}
			<Sequence from={s(3.6)}>
				<KineticCaption transcript={DEMO_TRANSCRIPT} bottomRatio={0.05} />
			</Sequence>

			{/* ---------- 7. minimap route tracer ---------- */}
			<Sequence from={s(15.2)} durationInFrames={s(4.6)}>
				<AbsoluteFill style={{background: 'rgba(3,5,10,0.45)'}} />
				<MinimapRouteTracer
					routePath={DEMO_ROUTE}
					teamColor="blue"
					drawSeconds={2.6}
					position="center"
					sizeRatio={0.62}
					title="Kairi rotation"
					startLabel="Blue buff"
					endLabel="Lord pit"
				/>
			</Sequence>
		</SplitScreenFrame>
	);
};
