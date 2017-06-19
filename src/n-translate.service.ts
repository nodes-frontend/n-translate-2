import { Injectable, ErrorHandler } from '@angular/core';
import { Headers, Response } from '@angular/http';

import { NHttp } from 'n-http-2';
import { INTranslateConfig, NTranslateConfig } from './n-translate.config';
import { LocalStorageService } from 'ngx-webstorage';

import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/share';
import 'rxjs/add/observable/throw';

declare interface IDataStore {
    keys: {};
    language: {};
};

declare interface Window {
    navigator: any;
}
declare const window: Window;

@Injectable()
export class NTranslate {

    private config: INTranslateConfig;

    private language: BehaviorSubject<{[key: string]: string}>;

    private subjectStore: {
        [key: string]: BehaviorSubject<any>;
    } = {};
    private observableStore: {
        [key: string]: Observable<any>
    } = {};
    private transmissionsStore: {
        [key: string]: any
    } = {};

    constructor(
        private options: NTranslateConfig,
        private http: NHttp,
        private localStorage: LocalStorageService,
        private errorHandler: ErrorHandler
    ) {
        this.config = options.getConfig();

    }

    public getAllSections(forceFetch?: boolean): Observable<any> {

        if(this.isExpired() || forceFetch) {

            if(this.config.debugEnabled) {
                console.info(`nTranslate getAllSections 
                    - pulling from API - because ${this.isExpired() ? 'isExpired' : 'forceFetch'}`);
            }

            return this.getKeysFromApi();
        }

        if(this.observableStore.hasOwnProperty('ALL')) {

            if(this.config.debugEnabled) {
                console.info(`nTranslate getSection getAllSections - pulling from In Memory`);
            }

            return this.getObservable('ALL');
        }

        if(this.getFromStorage('ALL')) {

            if(this.config.debugEnabled) {
                console.info(`nTranslate getSection getAllSections - pulling from Local Storage`);
            }

            return this.setObservable('ALL', this.getFromStorage('ALL'));
        }

        if(this.config.debugEnabled) {
            console.info(`nTranslate getSection getAllSections - pulling from API`);
        }

        return this.getKeysFromApi();

    }

    public getSection(sectionName: string, forceFetch?: boolean): Observable<any> {

        if(this.isExpired() || forceFetch) {

            if(this.config.debugEnabled) {
                console.info(`nTranslate getSection (${sectionName}) 
                    - pulling from API - because ${this.isExpired() ? 'isExpired' : 'forceFetch'}`);
            }

            return this.getKeysFromApi(sectionName);
        }

        if(this.observableStore.hasOwnProperty(sectionName)) {

            if(this.config.debugEnabled) {
                console.info(`nTranslate getSection (${sectionName}) - pulling from In Memory`);
            }

            return this.getObservable(sectionName);
        }

        if(this.getFromStorage(sectionName)) {

            if(this.config.debugEnabled) {
                console.info(`nTranslate getSection (${sectionName}) - pulling from Local Storage`);
            }

            return this.setObservable(sectionName, this.getFromStorage(sectionName));
        }

        if(this.config.debugEnabled) {
            console.info(`nTranslate getSection (${sectionName}) - pulling from API`);
        }

        return this.getKeysFromApi(sectionName);

    }

    public getLanguages(forceFetch?: boolean) {}

    public getBestFitLanguage() {}

    public getActiveLanguage() {}

    public getBrowserCultureLanguage(): string {
        if(typeof window === 'undefined' || typeof window.navigator === 'undefined') {
            return undefined;
        }

        let browserCultureLang: any = window.navigator.languages ? window.navigator.languages[0] : null;
        browserCultureLang = browserCultureLang || window.navigator.language || window.navigator.browserLanguage || window.navigator.userLanguage;

        return browserCultureLang;
    }

    public setLanguage(forceReload = true) {}

    private getObservable(sectionName: string): Observable<any> {
        return this.observableStore[sectionName];
    }
    private setObservable(sectionName: string, data: any): Observable<any> {
        if(!this.observableStore.hasOwnProperty(sectionName)) {
            this.subjectStore[sectionName] = new BehaviorSubject(data);
            this.observableStore[sectionName] = this.subjectStore[sectionName].asObservable();
        } else {
            this.subjectStore[sectionName].next(data);
        }

        return this.observableStore[sectionName];
    }

    private getKeysFromApi(section?: string): Observable<any> {

        const sectionName = section ? section : 'ALL';

        if(this.transmissionsStore[sectionName]) {
            if(this.config.debugEnabled) {
                console.info(`Already fetching via HTTP for section ${sectionName} - returning existing transmission`);
            }
            return this.transmissionsStore[sectionName];
        }

        this.transmissionsStore[sectionName] = this.requestHelper('keys', section)
            .flatMap((response: Response) => {

                const body = response.json();


                this.persistInStorage(sectionName, body.data);
                this.setExpiration();

                return this.setObservable(sectionName, body.data);
            })
            .share();

        return this.transmissionsStore[sectionName];
    }

    private getLanguagesFromApi(all?: boolean) {
        // TODO CONST THIS
        if(this.transmissionsStore['LANGUAGE']) {
            if(this.config.debugEnabled) {
                console.info(`Already fetching via HTTP for languages - returning existing transmission`);
            }
            return this.transmissionsStore['LANGUAGE'];
        }

        this.transmissionsStore['LANGUAGE'] = this.requestHelper(all ? 'bestFit' : 'languages')
            .flatMap((response: Response) => {

                const body = response.json();


                this.persistInStorage('LANGUAGE', body.data);
                this.setExpiration();

                return this.setObservable(sectionName, body.data);
            })
            .share();

        return this.transmissionsStore[sectionName];
    }

    private persistInStorage(key: string, value: string | number) {
        const k = this.config.storageIdentifier + '|' + key;

        this.localStorage.store(k, value);
    }
    private getFromStorage(key: string) {
        const k = this.config.storageIdentifier + '|' + key;

        return this.localStorage.retrieve(k);
    }

    private setExpiration() {
        const expires = new Date().getTime() + this.config.expires;
        this.persistInStorage('EXPIRES', expires);
    }
    private isExpired(): boolean {
        const now = new Date().getTime();
        const expires = this.localStorage.retrieve(this.config.storageIdentifier + '|' + 'EXPIRES');

        if(!expires) {
            if(this.config.debugEnabled) {
                console.info(`nTranslate isExpired - no expires token found in storage`);
            }

            return true;
        }

        if(this.config.debugEnabled) {
            console.info(`nTranslate isExpired evaluates to ${now > expires}`);
        }
        return now > expires;
    }

    private requestHelper(slug: 'keys' | 'languages' | 'bestFit', section?: string, locale?: string) {
        const headers: Headers = new Headers({
            'X-Application-Id': this.config.appId,
            'X-Rest-Api-Key': this.config.apiKey
        });
        if(locale) {
            headers.append('X-Accept-Language', locale);
        }

        const url = [
            this.config.rootUrl,
            this.config.apiVersion,
            'translate',
            this.config.platform
        ];

        switch (slug) {
            case 'keys':
                url.push('keys');
                if(section) {
                    url.push(section);
                }
                break;
            case 'languages':
                url.push('languages');
                break;
            case 'bestFit':
                url.push('languages/best_fit');
                break;
            default:
                url.push('keys');
        }

        return this.http.get(url.join('/'), {headers: headers});

    }

}
