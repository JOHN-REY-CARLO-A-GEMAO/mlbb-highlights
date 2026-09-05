import React from 'react';
import {AbsoluteFill, OffthreadVideo, useVideoConfig} from 'remotion';
import {COLORS, FONT_CONDENSED} from '../theme';

export type VideoSource = string | React.ReactNode;

export type SplitScreenFrameProps = {
	/** Gameplay. A src string renders <OffthreadVideo>; a node renders as-is. */
	topVideo?: VideoSource;
	/** Reaction cam. Same rules. */
	bottomVideo?: VideoSource;
	/** Share of the height given to gameplay. 0.7 = 70/30. */
	topRatio?: number;
	/** Hard thin divider. */
	dividerThickness?: number;
	dividerColor?: string;
	dividerGlow?: string;
	/** Optional tag sitting on the divider. */
	channelName?: string;
	channelAlign?: 'left' | 'center' | 'right';
	/** Overlays for the gameplay half (kill streak, callouts, counter, minimap). */
	children?: React.ReactNode;
	/** Overlays for the reaction half. */
	bottomOverlay?: React.ReactNode;
	/** Mute source audio (usually you keep gameplay audio, mute the cam or vice versa). */
	muteTop?: boolean;
	muteBottom?: boolean;
	/** Trim offsets in frames, passed to OffthreadVideo. */
	topStartFrom?: number;
	bottomStartFrom?: number;
	background?: string;
};

const renderSource = (
	source: VideoSource | undefined,
	opts: {muted?: boolean; startFrom?: number},
) => {
	if (source === undefined || source === null) return null;
	if (typeof source === 'string') {
		return (
			<OffthreadVideo
				src={source}
				muted={opts.muted}
				trimBefore={opts.startFrom}
				style={{width: '100%', height: '100%', objectFit: 'cover'}}
			/>
		);
	}
	return source;
};

export const SplitScreenFrame: React.FC<SplitScreenFrameProps> = ({
	topVideo,
	bottomVideo,
	topRatio = 0.7,
	dividerThickness,
	dividerColor = '#FFFFFF',
	dividerGlow = COLORS.blue,
	channelName,
	channelAlign = 'right',
	children,
	bottomOverlay,
	muteTop = false,
	muteBottom = false,
	topStartFrom,
	bottomStartFrom,
	background = '#05060A',
}) => {
	const {width, height} = useVideoConfig();
	const thickness = dividerThickness ?? Math.max(2, Math.round(width * 0.0035));
	const topHeight = height * topRatio;

	const justify =
		channelAlign === 'left'
			? 'flex-start'
			: channelAlign === 'right'
				? 'flex-end'
				: 'center';

	return (
		<AbsoluteFill style={{background}}>
			{/* ---------------- gameplay ---------------- */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width,
					height: topHeight,
					overflow: 'hidden',
				}}
			>
				<AbsoluteFill>
					{renderSource(topVideo, {muted: muteTop, startFrom: topStartFrom})}
				</AbsoluteFill>

				{/*
				  Overlay layer for the top half. It is its own stacking context sized
				  to the gameplay area, so a centred kill-streak popup lands in the
				  centre of the GAMEPLAY, not the centre of the 1080x1920 canvas.
				*/}
				<AbsoluteFill style={{pointerEvents: 'none'}}>{children}</AbsoluteFill>
			</div>

			{/* ---------------- divider ---------------- */}
			<div
				style={{
					position: 'absolute',
					top: topHeight - thickness / 2,
					left: 0,
					width,
					height: thickness,
					background: dividerColor,
					boxShadow: `0 0 ${thickness * 5}px ${dividerGlow}, 0 0 ${
						thickness * 14
					}px ${dividerGlow}66`,
					zIndex: 5,
				}}
			/>

			{channelName ? (
				<div
					style={{
						position: 'absolute',
						top: topHeight,
						left: 0,
						width,
						transform: 'translateY(-50%)',
						display: 'flex',
						justifyContent: justify,
						padding: `0 ${width * 0.045}px`,
						zIndex: 6,
						pointerEvents: 'none',
					}}
				>
					<div
						style={{
							fontFamily: FONT_CONDENSED,
							fontSize: width * 0.026,
							letterSpacing: '0.2em',
							textTransform: 'uppercase',
							color: '#FFFFFF',
							background: 'linear-gradient(90deg, #0B0E16 0%, #131A2A 100%)',
							border: `1px solid ${dividerGlow}88`,
							boxShadow: `0 0 ${width * 0.02}px ${dividerGlow}55`,
							padding: `${width * 0.008}px ${width * 0.022}px`,
							borderRadius: 3,
							whiteSpace: 'nowrap',
						}}
					>
						{channelName.toUpperCase()}
					</div>
				</div>
			) : null}

			{/* ---------------- reaction cam ---------------- */}
			<div
				style={{
					position: 'absolute',
					top: topHeight,
					left: 0,
					width,
					height: height - topHeight,
					overflow: 'hidden',
				}}
			>
				<AbsoluteFill>
					{renderSource(bottomVideo, {
						muted: muteBottom,
						startFrom: bottomStartFrom,
					})}
				</AbsoluteFill>
				<AbsoluteFill style={{pointerEvents: 'none'}}>
					{bottomOverlay}
				</AbsoluteFill>
			</div>
		</AbsoluteFill>
	);
};
