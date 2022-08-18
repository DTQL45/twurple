import type { Capability } from 'ircv3';
import { ClearMsg } from './messageTypes/ClearMsg';
import { GlobalUserState } from './messageTypes/GlobalUserState';

/**
 * This capability mostly just adds tags to existing commands.
 *
 * @private
 */
export const TwitchTagsCapability: Capability = {
	name: 'twitch.tv/tags',
	usesTags: true,
	messageTypes: [GlobalUserState, ClearMsg]
};
