import React, {useMemo} from 'react';
import {
	AbsoluteFill,
	OffthreadVideo,
	Sequence,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {
	IntroTitleCard,
	introCardDurationInFrames,
} from '../components/IntroTitleCard';
import {KillCounter} from '../components/KillCounter';
import {KillStreakPopup} from '../components/KillStreakPopup';
import {KineticCaption} from '../components/KineticCaption';
import {StatusCallout} from '../components/StatusCallout';
import {COLORS, FONT_CONDENSED, FONT_UI} from '../theme';
import {
	DEFAULT_AGENTIC_PROPS,
	type AgenticEvent,
	type AgenticHighlightProps,
} from './types';

const s = (seconds: number, fps: number) => Math.round(seconds * fps);

const clampFrame = (value: number, duration: number) =>
	Math.max(0, Math.min(Math.max(0, duration - 1), Math.round(value)));

/** A tiny, self-contained hit flash used for moments that are not kill tiers. */
const ImpactFlash: React.FC<{event: AgenticEvent}> = ({event}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const duration = Math.max(1, s(0.42, fps));
	const progress = Math.min(1, frame / duration);
	const opacity = progress < 0.18 ? progress / 0.18 : 1 - (progress - 0.18) / 0.82;
	const accent = event.tone === 'red' ? COLORS.red : event.tone === 'yellow' ? COLORS.gold : COLORS.blue;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(circle at 50% 45%, ${accent}55 0%, transparent 58%)`,
					opacity: Math.max(0, opacity) * 0.8,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: '50%',
					top: '42%',
					transform: `translate(-50%, -50%) scale(${1 + progress * 0.2})`,
					border: `${Math.max(3, width * 0.006)}px solid ${accent}`,
					width: width * (0.2 + progress * 0.34),
					height: width * (0.2 + progress * 0.34),
					borderRadius: '50%',
					boxShadow: `0 0 ${width * 0.06}px ${accent}`,
					opacity: Math.max(0, opacity) * 0.72,
				}}
			/>
			{event.label ? (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: height * 0.34,
						textAlign: 'center',
						fontFamily: FONT_CONDENSED,
						fontSize: width * 0.065,
						letterSpacing: '0.13em',
						color: '#fff',
						textShadow: `0 3px 0 #08090d, 0 0 24px ${accent}`,
						opacity: Math.max(0, opacity),
					}}
				>
					{event.label.toUpperCase()}
				</div>
			) : null}
		</AbsoluteFill>
	);
};

const VideoCanvas: React.FC<{source?: string}> = ({source}) => {
	const src = source ? staticFile(source) : null;
	if (!src) {
		return (
			<AbsoluteFill
				style={{
					background:
						'radial-gradient(circle at 50% 35%, #173653 0%, #0b101b 42%, #05060a 100%)',
				}}
			/>
		);
	}

	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#05060a'}}>
			{/* The blurred plate keeps a landscape upload from becoming dead black
			   when it is cropped into a vertical short. It is muted so the real
			   gameplay audio is emitted only once by the sharp plate. */}
			<OffthreadVideo
				src={src}
				muted
				volume={0}
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					transform: 'scale(1.08)',
					filter: 'blur(26px) saturate(1.15)',
					opacity: 0.65,
				}}
			/>
			<AbsoluteFill style={{background: 'rgba(2, 5, 11, 0.32)'}} />
			<OffthreadVideo
				src={src}
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
				}}
			/>
		</AbsoluteFill>
	);
};

const EventOverlay: React.FC<{event: AgenticEvent; fps: number; duration: number}> = ({
	event,
	fps,
	duration,
}) => {
	const from = clampFrame(s(event.time, fps), duration);
	if (event.kind === 'streak') {
		return (
			<Sequence from={from} durationInFrames={s(1.8, fps)}>
				<KillStreakPopup
					killTier={event.tier ?? 'DOUBLE'}
					offsetY={-100}
					holdMs={event.tier === 'SAVAGE' ? 1200 : 900}
				/>
			</Sequence>
		);
	}
	if (event.kind === 'callout') {
		return (
			<Sequence from={from} durationInFrames={s(2.2, fps)}>
				<StatusCallout
					label={event.label ?? 'OUTPLAY'}
					sublabel={event.sublabel}
					corner="upper-left"
					tone={event.tone ?? 'yellow'}
					holdMs={1700}
				/>
			</Sequence>
		);
	}
	return (
		<Sequence from={from} durationInFrames={s(0.5, fps)}>
			<ImpactFlash event={event} />
		</Sequence>
	);
};

const ScanlineFrame: React.FC<{accentColor: string}> = ({accentColor}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill
				style={{
					border: '2px solid rgba(255,255,255,0.16)',
					boxShadow: `inset 0 0 90px ${accentColor}24`,
				}}
			/>
			<AbsoluteFill
				style={{
					opacity: 0.1,
					backgroundImage:
						'repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 5px)',
					backgroundPositionY: `${(frame / fps) * 140}px`,
					mixBlendMode: 'overlay',
				}}
			/>
			<AbsoluteFill
				style={{
					background:
						'radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.66) 100%)',
				}}
			/>
		</AbsoluteFill>
	);
};

const AutoLabel: React.FC<{text: string; accentColor: string}> = ({text, accentColor}) => (
	<div
		style={{
			position: 'absolute',
			top: 44,
			left: 42,
			fontFamily: FONT_UI,
			fontSize: 22,
			letterSpacing: '0.16em',
			color: '#fff',
			background: 'rgba(5,8,15,0.72)',
			borderLeft: `4px solid ${accentColor}`,
			padding: '10px 16px 9px',
			textTransform: 'uppercase',
			boxShadow: `0 0 26px ${accentColor}33`,
		}}
	>
		{text}
	</div>
);

/**
 * The hands-off composition. The only required prop is a local video path;
 * the prepare script supplies the rest from the upload and its sidecar.
 * Events and captions are data-driven so an AI analyzer can be added later
 * without touching the visual edit.
 */
export const AgenticHighlight: React.FC<AgenticHighlightProps> = (props) => {
	const {
		source = DEFAULT_AGENTIC_PROPS.source,
		durationInFrames = DEFAULT_AGENTIC_PROPS.durationInFrames,
		fps = DEFAULT_AGENTIC_PROPS.fps,
		playerName = DEFAULT_AGENTIC_PROPS.playerName,
		event = DEFAULT_AGENTIC_PROPS.event,
		matchup = DEFAULT_AGENTIC_PROPS.matchup,
		channelName = DEFAULT_AGENTIC_PROPS.channelName,
		accentColor = DEFAULT_AGENTIC_PROPS.accentColor,
		introHoldMs = DEFAULT_AGENTIC_PROPS.introHoldMs,
		events = DEFAULT_AGENTIC_PROPS.events,
		transcript = DEFAULT_AGENTIC_PROPS.transcript,
		showIntro = DEFAULT_AGENTIC_PROPS.showIntro,
	} = props;
	const {width, height} = useVideoConfig();
	const sortedEvents = useMemo(
		() => events.slice().sort((a, b) => a.time - b.time),
		[events],
	);
	const killTimes = sortedEvents
		.filter((item) => item.kind === 'kill' || item.kind === 'streak')
		.map((item) => item.time);
	const introDuration = introCardDurationInFrames(fps, introHoldMs);

	return (
		<AbsoluteFill style={{background: '#05060a', color: '#fff'}}>
			<VideoCanvas source={source} />
			{showIntro ? (
				<Sequence from={0} durationInFrames={Math.min(durationInFrames, introDuration + 4)}>
					<IntroTitleCard
						playerName={playerName}
						event={event}
						matchup={matchup}
						accentColor={accentColor}
						holdMs={introHoldMs}
					/>
				</Sequence>
			) : null}

			{/* A small label makes a raw upload feel intentional even when there is
			   no transcript or event sidecar yet. */}
			<AutoLabel text={channelName} accentColor={accentColor} />

			{killTimes.length ? (
				<KillCounter
					killTimes={killTimes}
					timeUnit="seconds"
					corner="top-right"
					hideBeforeFirstKill
				/>
			) : null}

			{sortedEvents.map((item, index) => (
				<EventOverlay
					key={`${item.time}-${item.kind}-${index}`}
					event={item}
					fps={fps}
					duration={durationInFrames}
				/>
			))}

			{transcript.length ? (
				<KineticCaption
					transcript={transcript}
					bottomRatio={0.08}
					maxWordsPerLine={6}
				/>
			) : null}

			<ScanlineFrame accentColor={accentColor} />
			<div
				style={{
					position: 'absolute',
					bottom: height * 0.024,
					left: 0,
					width,
					textAlign: 'center',
					fontFamily: FONT_CONDENSED,
					fontSize: width * 0.022,
					letterSpacing: '0.3em',
					color: 'rgba(255,255,255,0.45)',
				}}
			>
				{matchup.toUpperCase()}
			</div>
		</AbsoluteFill>
	);
};
