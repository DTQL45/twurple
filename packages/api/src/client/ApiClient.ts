import { isNode } from '@d-fischer/detect-node';
import { createLogger, type LoggerOptions } from '@d-fischer/logger';
import { TimeBasedRateLimiter } from '@d-fischer/rate-limiter';
import { callTwitchApiRaw, type TwitchApiCallFetchOptions, type TwitchApiCallOptions } from '@twurple/api-call';
import { type AuthProvider } from '@twurple/auth';
import { extractUserId, rtfm, type UserIdResolvable } from '@twurple/common';
import { HelixRateLimiter } from '../api/helix/HelixRateLimiter';
import { ConfigError } from '../errors/ConfigError';
import { BaseApiClient } from './BaseApiClient';
import { UserContextApiClient } from './UserContextApiClient';

/**
 * Configuration for an {@link ApiClient} instance.
 */
export interface ApiConfig {
	/**
	 * An authentication provider that supplies tokens to the client.
	 *
	 * For more information, see the {@link AuthProvider} documentation.
	 */
	authProvider: AuthProvider;

	/**
	 * Additional options to pass to the fetch method.
	 */
	fetchOptions?: TwitchApiCallFetchOptions;

	/**
	 * Options to pass to the logger.
	 */
	logger?: Partial<LoggerOptions>;
}

/**
 * @private
 */
export interface TwitchApiCallOptionsInternal {
	options: TwitchApiCallOptions;
	clientId?: string;
	accessToken?: string;
	authorizationType?: string;
	fetchOptions?: TwitchApiCallFetchOptions;
}

/**
 * An API client for the Twitch Helix API and other miscellaneous endpoints.
 *
 * @meta category main
 * @hideProtected
 */
@rtfm('api', 'ApiClient')
export class ApiClient extends BaseApiClient {
	/**
	 * Creates a new API client instance.
	 *
	 * @param config Configuration for the client instance.
	 */
	constructor(config: ApiConfig) {
		if (!(config as Partial<ApiConfig>).authProvider) {
			throw new ConfigError('No auth provider given. Please supply the `authProvider` option.');
		}

		const rateLimitLoggerOptions: LoggerOptions = { name: 'twurple:api:rate-limiter', ...config.logger };
		super(
			config,
			createLogger({ name: 'twurple:api:client', ...config.logger }),
			isNode
				? new HelixRateLimiter({ logger: rateLimitLoggerOptions })
				: new TimeBasedRateLimiter({
						logger: rateLimitLoggerOptions,
						bucketSize: 800,
						timeFrame: 64000,
						doRequest: async ({ options, clientId, accessToken, authorizationType, fetchOptions }) =>
							await callTwitchApiRaw(options, clientId, accessToken, authorizationType, fetchOptions)
				  })
		);
	}

	/**
	 * Creates a contextualized ApiClient that can be used to call the API in the context of a given user.
	 *
	 * @param user The user to use as context.
	 * @param runner The callback to execute.
	 *
	 * A parameter is passed that should be used in place of the normal `ApiClient`
	 * to ensure that all requests are executed in the given user's context.
	 *
	 * Please note that requests which require scope authorization ignore this context.
	 */
	async asUser<T>(user: UserIdResolvable, runner: (ctx: BaseApiClient) => Promise<T>): Promise<T> {
		const ctx = new UserContextApiClient(this._config, this._logger, this._rateLimiter, extractUserId(user));

		return await runner(ctx);
	}
}