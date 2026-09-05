#!/usr/bin/env node

/**
 * One-command ingest for the Remotion highlight kit.
 *
 * The script deliberately does not require an AI key. It creates a safe edit
 * from any local upload, then consumes a same-name JSON sidecar when one is
 * available. That makes the visual edit usable immediately while leaving a
 * clean data contract for a local or hosted analyzer to fill in later.
 */
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync} from 'node:fs';
import {basename, dirname, extname, isAbsolute, join, relative, resolve} from 'node:path';
import {spawnSync, spawn} from 'node:child_process';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const INPUT_DIR = join(ROOT, 'input');
const PUBLIC_RAW_DIR = join(ROOT, 'public', 'raw');
const AGENTIC_DIR = join(ROOT, '.agentic');
const PROPS_PATH = join(AGENTIC_DIR, 'current-props.json');
const SUPPORTED = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);
const FPS = 30;

const log = (message) => console.log(`\x1b[36m[agentic]\x1b[0m ${message}`);
const warn = (message) => console.warn(`\x1b[33m[agentic]\x1b[0m ${message}`);
const fail = (message) => {
	console.error(`\x1b[31m[agentic]\x1b[0m ${message}`);
	process.exit(1);
};

const args = process.argv.slice(2);
const valueAfter = (flag) => {
	const index = args.indexOf(flag);
	return index === -1 ? undefined : args[index + 1];
};
const has = (flag) => args.includes(flag);
const requestedInput = valueAfter('--input');
const requestedOutput = valueAfter('--output');
const requestedDuration = Number(valueAfter('--duration'));

const ensureFolders = () => {
	mkdirSync(INPUT_DIR, {recursive: true});
	mkdirSync(PUBLIC_RAW_DIR, {recursive: true});
	mkdirSync(AGENTIC_DIR, {recursive: true});
};

const isVideo = (file) => SUPPORTED.has(extname(file).toLowerCase());
const fileInfo = (file) => {
	try {
		const stat = statSync(file);
		return stat.isFile() && isVideo(file) ? stat : null;
	} catch {
		return null;
	}
};

const collectVideos = (directory) => {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, {withFileTypes: true})
		.filter((entry) => entry.isFile() && isVideo(entry.name))
		.map((entry) => join(directory, entry.name))
		.filter((file) => fileInfo(file))
		.sort((a, b) => fileInfo(b).mtimeMs - fileInfo(a).mtimeMs);
};

const findSource = () => {
	if (requestedInput) {
		const explicit = resolve(ROOT, requestedInput);
		if (!fileInfo(explicit)) fail(`--input must point to a supported video: ${requestedInput}`);
		return explicit;
	}

	const candidates = [
		...collectVideos(INPUT_DIR),
		...collectVideos(PUBLIC_RAW_DIR),
		// Also allow the frictionless version: paste gameplay beside package.json.
		...readdirSync(ROOT, {withFileTypes: true})
			.filter((entry) => entry.isFile() && isVideo(entry.name))
			.map((entry) => join(ROOT, entry.name)),
	]
		.filter((file, index, all) => all.indexOf(file) === index)
		.sort((a, b) => fileInfo(b).mtimeMs - fileInfo(a).mtimeMs);

	if (!candidates.length) {
		const showcase = join(ROOT, 'preview', 'HighlightDemo.mp4');
		if (fileInfo(showcase)) {
			warn('No upload found; using preview/HighlightDemo.mp4 so Studio can still open.');
			return showcase;
		}
		fail('No gameplay found. Paste an .mp4, .mov, .m4v, .webm, .mkv, or .avi into input/ and run npm run edit.');
	}
	if (candidates.length > 1) {
		log(`Found ${candidates.length} videos; using the newest: ${basename(candidates[0])}`);
	}
	return candidates[0];
};

const publicPathFor = (source) => {
	const publicRoot = join(ROOT, 'public');
	const insidePublic = relative(publicRoot, source);
	if (!insidePublic.startsWith('..') && !isAbsolute(insidePublic)) {
		return insidePublic.split('\\').join('/');
	}
	const destination = join(PUBLIC_RAW_DIR, basename(source));
	if (resolve(source) !== resolve(destination)) {
		log(`Copying ${basename(source)} to public/raw/ for Remotion.`);
		copyFileSync(source, destination);
	}
	return `raw/${basename(destination)}`;
};

const bundledFfprobe = () => {
	const packageNames = [
		'@remotion/compositor-linux-x64-gnu/ffprobe',
		'@remotion/compositor-linux-x64-musl/ffprobe',
		'@remotion/compositor-darwin-arm64/ffprobe',
		'@remotion/compositor-darwin-x64/ffprobe',
		'@remotion/compositor-win32-x64-msvc/ffprobe.exe',
	];
	return packageNames.map((file) => join(ROOT, 'node_modules', file)).find(existsSync);
};

const probe = (source) => {
	if (Number.isFinite(requestedDuration) && requestedDuration > 0) {
		return {durationInSeconds: requestedDuration, width: 0, height: 0, fps: FPS, source: 'cli'};
	}
	const sidecarDuration = findSidecar(source)?.durationSeconds;
	if (Number.isFinite(sidecarDuration) && sidecarDuration > 0) {
		return {durationInSeconds: sidecarDuration, width: 0, height: 0, fps: FPS, source: 'sidecar'};
	}
	const ffprobe = bundledFfprobe() ?? 'ffprobe';
	const result = spawnSync(ffprobe, [
		'-v',
		'error',
		'-show_entries',
		'format=duration:stream=width,height,avg_frame_rate',
		'-of',
		'json',
		source,
	], {encoding: 'utf8'});
	if (result.status === 0) {
		try {
			const json = JSON.parse(result.stdout);
			const duration = Number(json.format?.duration);
			const stream = (json.streams ?? []).find((item) => item.width && item.height);
			if (Number.isFinite(duration) && duration > 0) {
				const frameRate = String(stream?.avg_frame_rate ?? '').split('/');
				const parsedFps = Number(frameRate[0]) / Number(frameRate[1] || 1);
				return {
					durationInSeconds: duration,
					width: Number(stream?.width ?? 0),
					height: Number(stream?.height ?? 0),
					fps: Number.isFinite(parsedFps) && parsedFps > 0 ? parsedFps : FPS,
					source: bundledFfprobe() ? 'remotion ffprobe' : 'ffprobe',
				};
			}
		} catch {
			// The fallback below gives the user a useful render even without ffprobe.
		}
	}
	warn('ffprobe was not found (or could not read this file); assuming 60 seconds. Use --duration for an exact one-off override.');
	return {durationInSeconds: 60, width: 0, height: 0, fps: FPS, source: 'fallback'};
};

const readJson = (file) => {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch (error) {
		warn(`Could not read ${relative(ROOT, file)} as JSON; ignoring it.`);
		return {};
	}
};

const findSidecar = (source) => {
	const stem = source.slice(0, source.length - extname(source).length);
	const options = [
		`${stem}.json`,
		join(dirname(source), 'edit.json'),
		join(INPUT_DIR, 'edit.json'),
		join(ROOT, 'edit.json'),
	];
	return options.find((file) => existsSync(file)) ? readJson(options.find((file) => existsSync(file))) : null;
};

const normaliseEvents = (events, duration) => {
	if (!Array.isArray(events)) return [];
	return events
		.map((item) => ({
			time: Number(item.time),
			kind: ['kill', 'streak', 'callout', 'impact'].includes(item.kind) ? item.kind : 'impact',
			tier: item.tier,
			label: item.label,
			sublabel: item.sublabel,
			tone: item.tone,
		}))
		.filter((item) => Number.isFinite(item.time) && item.time >= 0 && item.time < duration)
		.sort((a, b) => a.time - b.time);
};

const normaliseTranscript = (transcript) => {
	if (!Array.isArray(transcript)) return [];
	return transcript
		.map((word) => ({
			text: String(word.text ?? '').trim(),
			start: Number(word.start),
			...(word.end === undefined ? {} : {end: Number(word.end)}),
			...(word.emphasis === undefined ? {} : {emphasis: word.emphasis}),
			...(word.lineBreak ? {lineBreak: true} : {}),
		}))
		.filter((word) => word.text && Number.isFinite(word.start) && word.start >= 0)
		.sort((a, b) => a.start - b.start);
};

const buildProps = (source, sourcePublicPath, metadata, sidecar) => {
	const fps = Number(sidecar?.fps ?? metadata.fps ?? FPS);
	const durationInFrames = Math.max(1, Math.ceil(metadata.durationInSeconds * fps));
	const sourceLabel = basename(source, extname(source)).replace(/[._-]+/g, ' ').trim();
	const events = normaliseEvents(sidecar?.events, metadata.durationInSeconds);
	const transcript = normaliseTranscript(sidecar?.transcript);
	return {
		source: sourcePublicPath,
		sourceName: basename(source),
		durationInFrames,
		fps,
		playerName: String(sidecar?.playerName ?? 'MLBB HIGHLIGHTS'),
		event: String(sidecar?.event ?? 'AUTO CUT'),
		matchup: String(sidecar?.matchup ?? sourceLabel.toUpperCase()),
		channelName: String(sidecar?.channelName ?? 'AUTO EDIT'),
		accentColor: String(sidecar?.accentColor ?? '#3FA9FF'),
		introHoldMs: Number(sidecar?.introHoldMs ?? 2200),
		events,
		transcript,
		showIntro: sidecar?.showIntro !== false,
		_metadata: {
			durationInSeconds: metadata.durationInSeconds,
			width: metadata.width,
			height: metadata.height,
			probedBy: metadata.source,
		},
	};
};

const prepare = () => {
	ensureFolders();
	const source = findSource();
	const sourcePublicPath = publicPathFor(source);
	const metadata = probe(source);
	const sidecar = findSidecar(source) ?? {};
	const props = buildProps(source, sourcePublicPath, metadata, sidecar);
	writeFileSync(PROPS_PATH, `${JSON.stringify(props, null, 2)}\n`);
	writeFileSync(join(AGENTIC_DIR, 'last-plan.json'), `${JSON.stringify(props, null, 2)}\n`);
	log(`Ready: ${props.sourceName} (${metadata.durationInSeconds.toFixed(1)}s)`);
	log(`Plan: ${props.events.length} event beats, ${props.transcript.length} caption words`);
	log(`Props: ${relative(ROOT, PROPS_PATH)}`);
	return props;
};

const runRemotion = (commandArgs, inherit = true) => {
	const cli = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'remotion.cmd' : 'remotion');
	if (!existsSync(cli)) fail('Dependencies are missing. Run npm install first.');
	const child = spawn(cli, commandArgs, {
		cwd: ROOT,
		stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
		env: process.env,
	});
	return child;
};

const main = () => {
	const props = prepare();
	if (has('--plan-only')) return;
	if (has('--studio')) {
		log('Opening Remotion Studio with the generated plan.');
		const child = runRemotion([
			'studio',
			'--props',
			PROPS_PATH,
			'--port',
			valueAfter('--port') ?? '3000',
			'--ipv4',
		]);
		child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
		return;
	}

	const output = resolve(ROOT, requestedOutput ?? join('out', 'mlbb-highlight.mp4'));
	mkdirSync(dirname(output), {recursive: true});
	log(`Rendering ${relative(ROOT, output)} ...`);
	const result = spawnSync(
		join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'remotion.cmd' : 'remotion'),
		['render', 'AgenticHighlight', output, '--props', PROPS_PATH],
		{cwd: ROOT, stdio: 'inherit', env: process.env},
	);
	if (result.status !== 0) process.exit(result.status ?? 1);
	log(`Done: ${relative(ROOT, output)}`);
};

main();
