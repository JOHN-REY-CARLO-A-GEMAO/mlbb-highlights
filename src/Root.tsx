import React from 'react';
import {AbsoluteFill, Composition, Sequence} from 'remotion';
import {
	IntroTitleCard,
	introCardDurationInFrames,
} from './components/IntroTitleCard';
import {KillCounter} from './components/KillCounter';
import {
	KillStreakPopup,
	killStreakDurationInFrames,
} from './components/KillStreakPopup';
import {KineticCaption} from './components/KineticCaption';
import {MinimapRouteTracer} from './components/MinimapRouteTracer';
import {SplitScreenFrame} from './components/SplitScreenFrame';
import {
	StatusCallout,
	statusCalloutDurationInFrames,
} from './components/StatusCallout';
import {AgenticHighlight} from './agentic/AgenticHighlight';
import {
	DEFAULT_AGENTIC_PROPS,
	type AgenticHighlightProps,
} from './agentic/types';
import {DEMO_ROUTE, DEMO_TRANSCRIPT} from './demo/demoData';
import {HighlightDemo} from './demo/HighlightDemo';
import {MockGameplay, MockReactionCam} from './demo/MockFootage';

const W = 1080;
const H = 1920;
const FPS = 30;
const numberOrDefault = (value: number | undefined, fallback: number) =>
	Number.isFinite(value) ? (value as number) : fallback;

/** Wraps a single overlay on top of placeholder gameplay for solo previewing. */
const OnGameplay: React.FC<{children: React.ReactNode}> = ({children}) => (
	<AbsoluteFill>
		<MockGameplay />
		{children}
	</AbsoluteFill>
);

export const RemotionRoot: React.FC = () => {
	return (
		<>
			{/* ============ hands-off upload cut ============ */}
			<Composition
				id="AgenticHighlight"
				component={AgenticHighlight}
				durationInFrames={DEFAULT_AGENTIC_PROPS.durationInFrames}
				fps={FPS}
				width={W}
				height={H}
				defaultProps={DEFAULT_AGENTIC_PROPS as AgenticHighlightProps}
				calculateMetadata={({props}) => {
					const agenticProps = props as unknown as AgenticHighlightProps;
					return {
						durationInFrames: Math.max(
							1,
							numberOrDefault(agenticProps.durationInFrames, DEFAULT_AGENTIC_PROPS.durationInFrames),
						),
						fps: numberOrDefault(agenticProps.fps, FPS),
					};
				}}
			/>

			{/* ============ full cut ============ */}
			<Composition
				id="HighlightDemo"
				component={HighlightDemo}
				durationInFrames={20 * FPS}
				fps={FPS}
				width={W}
				height={H}
			/>

			{/* ============ 1. kill streak ============ */}
			<Composition
				id="KillStreak"
				component={(props: React.ComponentProps<typeof KillStreakPopup>) => (
					<OnGameplay>
						<KillStreakPopup {...props} />
					</OnGameplay>
				)}
				durationInFrames={killStreakDurationInFrames(FPS, 1000) + 10}
				fps={FPS}
				width={W}
				height={H}
				defaultProps={{killTier: 'SAVAGE'} as React.ComponentProps<typeof KillStreakPopup>}
			/>

			{/* all four tiers back to back */}
			<Composition
				id="KillStreakAllTiers"
				component={() => (
					<OnGameplay>
						{(['DOUBLE', 'TRIPLE', 'MANIAC', 'SAVAGE'] as const).map((tier, i) => (
							<Sequence key={tier} from={i * 50} durationInFrames={50}>
								<KillStreakPopup killTier={tier} />
							</Sequence>
						))}
					</OnGameplay>
				)}
				durationInFrames={200}
				fps={FPS}
				width={W}
				height={H}
			/>

			{/* ============ 2. status callout ============ */}
			<Composition
				id="StatusCallout"
				component={(props: React.ComponentProps<typeof StatusCallout>) => (
					<OnGameplay>
						<StatusCallout {...props} />
					</OnGameplay>
				)}
				durationInFrames={statusCalloutDurationInFrames(FPS, 2600) + 10}
				fps={FPS}
				width={W}
				height={H}
				defaultProps={
					{
						label: 'CC Immune',
						sublabel: 'Purify active',
						corner: 'upper-left',
						tone: 'yellow',
					} as React.ComponentProps<typeof StatusCallout>
				}
			/>

			{/* ============ 3. intro title card ============ */}
			<Composition
				id="IntroTitleCard"
				component={(props: React.ComponentProps<typeof IntroTitleCard>) => (
					<OnGameplay>
						<IntroTitleCard {...props} />
					</OnGameplay>
				)}
				durationInFrames={introCardDurationInFrames(FPS, 2500) + 20}
				fps={FPS}
				width={W}
				height={H}
				defaultProps={
					{
						playerName: 'ONIC.KAIRI',
						event: 'M4 World Championship 2022',
						matchup: 'ONIC PH vs BLACKLIST',
					} as React.ComponentProps<typeof IntroTitleCard>
				}
			/>

			{/* ============ 4. kinetic caption ============ */}
			<Composition
				id="KineticCaption"
				component={(props: React.ComponentProps<typeof KineticCaption>) => (
					<OnGameplay>
						<KineticCaption {...props} />
					</OnGameplay>
				)}
				durationInFrames={15 * FPS}
				fps={FPS}
				width={W}
				height={H}
				defaultProps={
					{transcript: DEMO_TRANSCRIPT} as React.ComponentProps<typeof KineticCaption>
				}
			/>

			{/* ============ 5. split screen ============ */}
			<Composition
				id="SplitScreen"
				component={() => (
					<SplitScreenFrame
						topVideo={<MockGameplay />}
						bottomVideo={<MockReactionCam />}
						channelName="@clutchmoments"
					/>
				)}
				durationInFrames={6 * FPS}
				fps={FPS}
				width={W}
				height={H}
			/>

			{/* ============ 6. kill counter ============ */}
			<Composition
				id="KillCounter"
				component={(props: React.ComponentProps<typeof KillCounter>) => (
					<OnGameplay>
						<KillCounter {...props} />
					</OnGameplay>
				)}
				durationInFrames={12 * FPS}
				fps={FPS}
				width={W}
				height={H}
				defaultProps={
					{
						killTimes: [1, 2.6, 4.4, 6.5, 8.8],
						timeUnit: 'seconds',
					} as React.ComponentProps<typeof KillCounter>
				}
			/>

			{/* ============ 7. minimap route tracer ============ */}
			<Composition
				id="MinimapRouteTracer"
				component={(props: React.ComponentProps<typeof MinimapRouteTracer>) => (
					<OnGameplay>
						<AbsoluteFill style={{background: 'rgba(3,5,10,0.45)'}} />
						<MinimapRouteTracer {...props} />
					</OnGameplay>
				)}
				durationInFrames={6 * FPS}
				fps={FPS}
				width={W}
				height={H}
				defaultProps={
					{
						routePath: DEMO_ROUTE,
						teamColor: 'blue',
						drawSeconds: 2.6,
						title: 'Kairi rotation',
						startLabel: 'Blue buff',
						endLabel: 'Lord pit',
					} as React.ComponentProps<typeof MinimapRouteTracer>
				}
			/>
		</>
	);
};
