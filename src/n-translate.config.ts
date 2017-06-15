export interface INTranslateConfig {
    rootUrl: string;
    apiVersion: string;
    platform: string;
    endpoints: {
        languages: string,
        bestFit: string,
        keys: string
    };
    apiKey: string;
    appId: string;
    storageIdentifier: string;
    persist: boolean;
    expires: number;
    debugEnabled: boolean;
}

// This is the interface to merge!
export interface INTranslateConfigOptional {
    rootUrl?: string;
    apiVersion?: string;
    platform?: string;
    endpoints?: {
        languages?: string,
        bestFit?: string,
        keys?: string
    };
    apiKey?: string;
    appId?: string;
    storageIdentifier?: string;
    persist?: boolean;
    expires?: number;
    debugEnabled?: boolean;
}
// This is to merge!
export const NTranslateConfigDefaults: INTranslateConfig = {
    rootUrl: 'https://nstack.io/api',
    apiVersion: 'v1',
    platform: 'web',
    endpoints: {
        languages: 'languages',
        bestFit: 'languages/best_fit',
        keys: 'keys'
    },
    apiKey: null,
    appId: null,
    storageIdentifier: null,
    persist: true,
    expires: Date.now() + (24 * 60 * 60 * 1000),
    debugEnabled: false
};

export function nTranslateConfigFactory(config: INTranslateConfigOptional): NTranslateConfig {
    return new NTranslateConfig(config);
}

export class NTranslateConfig {
    private _config: INTranslateConfig;

    constructor(_config: INTranslateConfigOptional) {
        _config = _config || {};

        if(!_config.hasOwnProperty('apiKey') || _config.apiKey === null) {
            throw new Error(
                `NTranslate apiKey is missing`
            );
        }
        if(!_config.hasOwnProperty('appId') || _config.appId === null) {
            throw new Error(
                `NTranslate appId is missing`
            );
        }
        if(!_config.hasOwnProperty('storageIdentifier') || _config.storageIdentifier === null) {
            throw new Error(
                `NTranslate storageIdentifier is missing`
            );
        }

        this._config = Object.assign({}, NTranslateConfigDefaults, _config);
    }

    public getConfig(): INTranslateConfig {
        return this._config;
    }
}
