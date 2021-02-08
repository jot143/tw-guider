import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Platform, Events } from '@ionic/angular';
import { ApiService } from './base/api-service';
import { DbProvider } from '../db-provider';
import { AuthService } from '../../services/auth-service';
import { HttpClient } from '../../services/http-client';
import { DownloadService } from '../../services/download-service';
import { GuideAssetPivotModel } from '../../models/db/api/guide-asset-pivot-model';
import { AppSetting } from '../../services/app-setting';
import { LoggerService } from 'src/services/logger-service';

@Injectable()
export class GuideAssetPivotService extends ApiService {
    data: GuideAssetPivotModel[] = [];
    loadUrl: string = '/guide-asset-pivot';
    dbModelApi: GuideAssetPivotModel = new GuideAssetPivotModel(this.p, this.db, this.events, this.downloadService,    this.loggerService);

    /**
     * Constructor
     * @param http
     * @param p
     * @param db
     * @param authService
     * @param events
     * @param downloadService
     * @param appSetting
     */
    constructor(http: HttpClient,
        private p: Platform,
        private db: DbProvider,
        public authService: AuthService,
        public events: Events,
        public downloadService: DownloadService,
        public loggerService: LoggerService,

        public appSetting: AppSetting) {
        super(http, events, appSetting);
        console.debug('GuideAssetPivotService', 'initialized');
    }

    /**
     * Create a new instance of the service model
     * @returns {GuideAssetPivotModel}
     */
    public newModel() {
        return new GuideAssetPivotModel(this.p, this.db, this.events, this.downloadService,    this.loggerService);
    }
}
