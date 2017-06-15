import {NgModule, ModuleWithProviders, Optional, SkipSelf} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NTranslateConfig, nTranslateConfigFactory} from './n-translate.config';
import {NTranslate} from './n-translate.service';
import {Ng2Webstorage} from 'ngx-webstorage';

export * from './n-translate.config';
export * from './n-translate.service';

@NgModule({
    imports: [
        CommonModule,
        Ng2Webstorage.forRoot({
            prefix: 'nt2',
            caseSensitive: true
        })
    ],
    providers: [
        NTranslate
    ]
})
export class NTranslateModule {
    public static forRoot(providedConfig: any = {
        provide: NTranslateConfig,
        useFactory: nTranslateConfigFactory
    }): ModuleWithProviders {
        return {
            ngModule: NTranslateModule,
            providers: [
                providedConfig
            ]
        };
    }

    constructor(@Optional() @SkipSelf() parentModule: NTranslateModule) {
        if (parentModule) {
            throw new Error(
                'NTranslateModule is already loaded. Import it in the AppModule only');
        }
    }
}
