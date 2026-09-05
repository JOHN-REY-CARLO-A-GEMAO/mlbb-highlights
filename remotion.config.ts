import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(null);
// Transparent overlay renders (e.g. exporting just the popups as a ProRes 4444
// alpha layer for an NLE) work with:
//   npx remotion render KillStreak out/killstreak.mov --codec=prores --prores-profile=4444
