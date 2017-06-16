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

interface IDataStore {
    keys: {};
    language: {};
};

@Injectable()
export class NTranslate {

    private config: INTranslateConfig;

    private _language: BehaviorSubject<{[key: string]: string}>;

    private dataStore: IDataStore = {
        keys: {},
        language: {}
    };

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

        this._language = <BehaviorSubject<any>>new BehaviorSubject({});

    }

    public  getAllSections(forceFetch?: boolean): Observable<any> {

        if(this.isExpired() || forceFetch) {

            if(this.config.debugEnabled) {
                console.info(`nTranslate getAllSections 
                    - pulling from API - because ${this.isExpired() ? 'isExpired' : 'forceFetch'}`);
            }

            return this.getFromApi();
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

        return this.getFromApi();

    }

    public getSection(sectionName: string, forceFetch?: boolean): Observable<any> {

        if(this.isExpired() || forceFetch) {

            if(this.config.debugEnabled) {
                console.info(`nTranslate getSection (${sectionName}) 
                    - pulling from API - because ${this.isExpired() ? 'isExpired' : 'forceFetch'}`);
            }

            return this.getFromApi(sectionName);
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

        return this.getFromApi(sectionName);

    }

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

    private getFromApi(section?: string): Observable<any> {

        const sectionName = section ? section : 'ALL';

        if(this.transmissionsStore[sectionName]) {
            if(this.config.debugEnabled) {
                console.info(`Already fetching via HTTP for section ${sectionName} - returning existing transmission`);
            }
            return this.transmissionsStore[sectionName];
        }

        this.transmissionsStore[sectionName] = this.requestHelper(section)
            .flatMap((response: Response) => {

                const body = response.json();


                this.persistInStorage(sectionName, body.data);
                this.setExpiration();

                return this.setObservable(sectionName, body.data);
            })
            .share();

        return this.transmissionsStore[sectionName];
    }

    private persistInStorage(key: string, value: string | number) {
        const k = this.config.storageIdentifier + '|' + key;

        this.dataStore.keys[key] = value;

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

    private requestHelper(section?: string) {
        const headers: Headers = new Headers({
            'X-Application-Id': this.config.appId,
            'X-Rest-Api-Key': this.config.apiKey
        });

        const url = [
            this.config.rootUrl,
            this.config.apiVersion,
            'translate',
            this.config.platform,
            'keys'
        ];

        if(section) {
            url.push(section);
        }

        return this.http.get(url.join('/'), {headers: headers})
            // .map((response) => response.json());

    }

}
