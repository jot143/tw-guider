import {Platform, Events} from '@ionic/angular';
import {DbBaseModel} from './db-base-model';
import {DbProvider} from '../../providers/db-provider';
import { DownloadService } from '../../services/download-service';

export class BaseFileMapInModel {
    public name: string;
    public url: string;
    public localPath: string;
}

export class FileMapInModel extends BaseFileMapInModel {
    public attachedFilesForDelete?: string[] = [];
    public notSavedModelUploadedFilePath?: string;
    public thumbnail?: BaseFileMapInModel;
}

/**
 * Extend this abstract Helper class for every API DB-Model.
 * This class contains a model from the remote API with taktwerk's boilerplate.
 *
 * IMPORTANT: Do not extend this class if you only want to create a DbModel but not a model that has to be synced
 * with the remote API. In that case you'd have to extend only DbHelper.
 */
export abstract class DbApiModel extends DbBaseModel {
    public defaultImage = '/assets/placeholder.jpg';
    /** flag that indicate either a record is synced with the API or not */
    public is_synced: boolean;
    /** primary key */
    public idApi: number;
    /** name of the primary key from API (required to sync records) */
    public abstract apiPk: string;

    //API boilerplate default fields members
    public created_at: Date;
    public local_created_at: Date;
    public created_by: number;
    public updated_at: Date;
    public local_updated_at: Date;
    public updated_by: number;
    public deleted_at: Date;
    public local_deleted_at: Date;
    public deleted_by: number;

    // download mapping
    public downloadMapping: FileMapInModel[];

    //API boilerplate default fields columns
    /** local column that indicates if the record is synced with the API */
    public COL_IS_SYNCED: string = '_is_synced';
    /** id's column name */
    public COL_ID_API: string = 'id';
    /** date time when this record was created on API */
    public COL_CREATED_AT: string = 'created_at';
    public COL_LOCAL_CREATED_AT: string = 'local_created_at';
    public COL_CREATED_BY: string = 'created_by';
    /** date time when this record was updated on API */
    public COL_UPDATED_AT: string = 'updated_at';
    public COL_LOCAL_UPDATED_AT: string = 'local_updated_at';
    public COL_UPDATED_BY: string = 'updated_by';
    /** date time when this record was deleted on API */
    public COL_DELETED_AT: string = 'deleted_at';
    public COL_LOCAL_DELETED_AT: string = 'local_deleted_at';
    public COL_DELETED_BY: string = 'deleted_by';

    /**
     * Constructor
     * @param platform
     * @param db
     * @param events
     * @param downloadService
     */
    constructor(public platform: Platform,
                public db: DbProvider,
                public events: Events,
                public downloadService: DownloadService
    ) {
        super(platform, db, events, downloadService);
    }

    /**
     * Loads an instance of this from a row received from the API.
     * @param apiObj row received from API
     * @param existObj
     */
    public loadFromApi(apiObj: any): DbApiModel {
        let obj: DbApiModel = null;
        obj = new (<any>this.constructor);
        obj.platform = this.platform;
        obj.db = this.db;
        obj.events = this.events;
        obj.downloadService = this.downloadService;

        obj.loadFromApiToCurrentObject(apiObj);

        return obj;
    }

    loadFromApiToCurrentObject(apiObj: any) {
        // iterate over table fields
        for (const column of this.TABLE) {
            const columnName = column[0];
            const type: number = parseInt(column[2]);
            const memberName = column[3] ? column[3] : columnName;
            if (apiObj[memberName] !== undefined) {
                this[memberName] = this.getObjectByType(apiObj[memberName], type);
            }
        }
        // default boilerplate fields
        this.idApi = this.getNumberValue(apiObj[this.apiPk]);
        this.created_at = this.getDateFromString(apiObj.created_at);
        this.local_created_at = this.getDateFromString(apiObj.local_created_at);
        this.created_by = this.getNumberValue(apiObj.created_by);
        this.updated_at = this.getDateFromString(apiObj.updated_at);
        this.local_updated_at = this.getDateFromString(apiObj.local_updated_at);
        this.updated_by = this.getNumberValue(apiObj.updated_by);
        this.deleted_at = this.getDateFromString(apiObj.deleted_at);
        this.local_deleted_at = this.getDateFromString(apiObj.local_deleted_at);
        this.deleted_by = this.getNumberValue(apiObj.deleted_by);
    }

    /**
     * Creates the db table for the extended db class.
     * @returns {Promise<any>}
     */
    protected dbCreateTable(): Promise<any> {
        this.TABLE.push([this.COL_IS_SYNCED, 'TINYINT(1) DEFAULT 1', DbBaseModel.TYPE_BOOLEAN, 'is_synced']);
        this.TABLE.push([this.COL_CREATED_AT, 'DATETIME', DbBaseModel.TYPE_DATE]);
        this.TABLE.push([this.COL_LOCAL_CREATED_AT, 'DATETIME', DbBaseModel.TYPE_DATE]);
        this.TABLE.push([this.COL_CREATED_BY, 'INT', DbBaseModel.TYPE_NUMBER]);
        this.TABLE.push([this.COL_UPDATED_AT, 'DATETIME', DbBaseModel.TYPE_DATE]);
        this.TABLE.push([this.COL_LOCAL_UPDATED_AT, 'DATETIME', DbBaseModel.TYPE_DATE]);
        this.TABLE.push([this.COL_UPDATED_BY, 'INT', DbBaseModel.TYPE_NUMBER]);
        this.TABLE.push([this.COL_DELETED_AT, 'DATETIME', DbBaseModel.TYPE_DATE]);
        this.TABLE.push([this.COL_LOCAL_DELETED_AT, 'DATETIME', DbBaseModel.TYPE_DATE]);
        this.TABLE.push([this.COL_DELETED_BY, 'INT', DbBaseModel.TYPE_NUMBER]);
        if (!this.hasOwnProperty('user_id')) {
            this.TABLE.push([this.COL_ID_API, 'INT UNIQUE', DbBaseModel.TYPE_NUMBER, 'idApi']);
        } else {
            this.TABLE.push([this.COL_ID_API, 'INT', DbBaseModel.TYPE_NUMBER, 'idApi']);
        }
        return super.dbCreateTable();
    }

    /**
     * Loads additional boilerplate fields and calls the super method.
     * @inheritDoc
     */
    public loadFromAttributes(item: any): DbBaseModel {
        this.idApi = item[this.COL_ID_API];
        this.is_synced = item[this.COL_IS_SYNCED];
        this.created_at = this.getDateValue(item[this.COL_CREATED_AT]);
        this.local_created_at = this.getDateValue(item[this.COL_LOCAL_CREATED_AT]);
        this.created_by = this.getNumberValue(item[this.COL_CREATED_BY]);
        this.updated_at = this.getDateValue(item[this.COL_UPDATED_AT]);
        this.local_updated_at = this.getDateValue(item[this.COL_LOCAL_UPDATED_AT]);
        this.updated_by = this.getNumberValue(item[this.COL_UPDATED_BY]);
        this.deleted_at = this.getDateValue(item[this.COL_DELETED_AT]);
        this.local_deleted_at = this.getDateValue(item[this.COL_LOCAL_DELETED_AT]);
        this.deleted_by = this.getNumberValue(item[this.COL_DELETED_BY]);
        return super.loadFromAttributes(item);
    }

    /**
     * Event before this instance is saved in local db.
     * @param isSynced optional param that indicates whether this record is synced with api or not
     */
    protected beforeSave(isSynced?: boolean) {
        this.is_synced = isSynced;
    }

    /**
     * Stores this api synced instance in sql lite db and creates
     * a new entry or updates this entry if the primary key is not empty.
     * @param forceCreation optional param to force creation
     */
    public saveSynced(forceCreation?: boolean): Promise<any> {
        return this.save(forceCreation, true, null, false);
    }

    /**
     * Stores this instance in sql lite db and creates a new entry
     * or updates this entry if the primary key is not empty.
     * @param forceCreation optional param to force creation
     * @param isSynced optional param that indicates whether this record is synced with api or not
     * @param updateCondition optional fix updateCondition
     * @override
     */
    public save(forceCreation?: boolean, isSynced?: boolean, updateCondition?: string, isSaveLocaleDates: boolean = true): Promise<any> {
        if (updateCondition) {
            // Provided by the service
            this.updateCondition = updateCondition;
        } else {
            this.setUpdateCondition();
        }
        return new Promise((resolve) => {
            this.beforeSave(isSynced);
            this.exists().then((res) => {
                if (res) {
                    if (isSaveLocaleDates) {
                        this[this.COL_LOCAL_UPDATED_AT] = new Date();
                    }
                    this.update().then(() => {
                        this.unsetNotSavedModelUploadedFilePaths();
                        resolve(true);
                    });
                } else {
                    if (isSaveLocaleDates) {
                        this[this.COL_LOCAL_CREATED_AT] = new Date();
                        this[this.COL_LOCAL_UPDATED_AT] = new Date();
                    }
                    this.create().then(() => {
                        this.unsetNotSavedModelUploadedFilePaths();
                        resolve(true);
                    });
                }
            });
        });
    }

    public setUpdateCondition() {
        this.updateCondition = [[this.COL_ID_API, this.idApi]];
    }

    public remove(): Promise<any> {
        return new Promise(resolve => {
            this[this.COL_LOCAL_DELETED_AT] = new Date();
            this.delete().then(() => resolve(true));
        });
    }

    /**
     * Stores passed models in remote API server.
     * @param models
     */
    public prepareBatchPost(models: DbApiModel[]): Promise<any[]> {
        return new Promise((resolve) => {
            let modelBodies: any[] = [];
            for (let model of models) {
                // Push the model in the data
                modelBodies.push(model.getBodyJson());
            }
            resolve(modelBodies);
        });
    }

    /**
     * Returns a Promise with information about the existing
     * of this DbApiModel instance by its `updateCondition`
     * @returns {Promise<T>}
     */
    public exists(): Promise<boolean> {
        return new Promise((resolve) => {
            this.dbReady().then((db) => {
                if (db == null) {
                    resolve(false);
                } else {
                    let query = "SELECT * FROM " + this.TABLE_NAME + " WHERE " + this.parseWhere(this.updateCondition);
                    if (query.indexOf('undefined') >= 0) {
                        resolve(false);
                    } else {
                        db.query(query).then((res) => {
                            resolve(res.rows.length > 0);
                        }).catch((err) => {
                            resolve(false);
                        });
                    }
                }
            });
        });
    }

    /**
     * Returns a json object with all attributes and its values.
     * This json is needed for the api batch sync.
     * @return {}
     */
    public getBodyJson(): {} {
        let obj = {};
        let columns = this.attributeNames();
        let types = this.columnTypes();

        obj[this.apiPk] = this.idApi;
        obj['_id'] = this.id;

        obj['deleted_at'] = this.formatApiDate(this[this.COL_DELETED_AT]);
        obj['local_deleted_at'] = this.formatApiDate(this[this.COL_LOCAL_DELETED_AT]);
        obj['local_updated_at'] = this.formatApiDate(this[this.COL_LOCAL_UPDATED_AT]);
        obj['local_created_at'] = this.formatApiDate(this[this.COL_LOCAL_CREATED_AT]);

        for (let i = 0; i < columns.length; i++) {
            const type: number = types[i];
            let value: any = this[columns[i]];

            //format value if required
            switch (type) {
                case DbBaseModel.TYPE_NUMBER:
                    if (isNaN(value)) value = null;
                    break;
                case DbBaseModel.TYPE_DATE:
                    value = this.formatApiDate(value);
                    break;
            }
            obj[columns[i]] = value;
        }
        return obj;
    }

    public getNativePath(columnName:string) {
        const path = this[columnName];

        return this.downloadService.getNativeFilePath(path, this.TABLE_NAME);
    }

    /// Model file part
    /**
     * Download new files of a model
     *
     * @param {DbApiModel} oldModel the previous values
     * @param authorizationToken
     * @returns {boolean}
     */
    pullFiles(oldModel: any, authorizationToken: string) {
        return new Promise(async (resolve) => {
            // No use downloading if not on app
            if (/*model.platform.is('core') || */ this.platform.is('mobileweb')) {
                resolve(true);
            }

            // Do we have files to upload?
            if (!(this.downloadMapping && this.downloadMapping.length > 0)) {
                resolve(true);
                return;
            }
            for (const fileMap of this.downloadMapping) {
                this.downloadAndSaveFile(fileMap, oldModel, authorizationToken).then((result) => {
                    resolve(result);
                    return;
                });
            }
        });
    }

    protected async downloadAndSaveFile(fileMap: any, oldModel, authorizationToken) {
        if (!this.isExistFilePathInModel(fileMap)) {
            return false;
        }
        // If we have a local path but no api path, we need to upload the file!
        // Only download if the new file is different than the old one? We don't have this information here.
        const finalPath = await this.downloadService.downloadAndSaveFile(
            this[fileMap.url],
            this[fileMap.name],
            this.TABLE_NAME,
            authorizationToken
        );
        if (!finalPath) {
            return false;
        }
        this[fileMap.localPath] = finalPath;
        // We received the local path back if it's successful
        await this.saveSynced(true);
        // Delete old file
        if (oldModel && oldModel[fileMap.localPath] !== this[fileMap.localPath]) {
            await this.downloadService.deleteFile(oldModel[fileMap.localPath]);
        }
        if (this.isExistThumbnail(fileMap)) {
            await this.downloadAndSaveFile(fileMap.thumbnail, oldModel, authorizationToken);
        }

        return true;
    }

    isExistFilePathInModel(fileMap) {
        return fileMap.name &&
            fileMap.url &&
            this[fileMap.name] &&
            this[fileMap.url];
    }

    isExistThumbnail(fileMap: any) {
        return fileMap.thumbnail &&
            fileMap.thumbnail.name &&
            fileMap.thumbnail.url &&
            this[fileMap.thumbnail.name] &&
            this[fileMap.thumbnail.url];
    }

    setFileProperty(columnNameIndex, fileName, willDeleteFile = false) {
        if (!this.downloadMapping || !this.downloadMapping[columnNameIndex]) {
            return;
        }
        const modelFileMap = this.downloadMapping[columnNameIndex];
        if (willDeleteFile) {
            if (this[modelFileMap.name]) {
                const attachedFileForDelete = this.downloadService.getNativeFilePath(this[modelFileMap.name], this.TABLE_NAME);
                if (!this.downloadMapping[columnNameIndex].attachedFilesForDelete) {
                    this.downloadMapping[columnNameIndex].attachedFilesForDelete = [];
                }
                this.downloadMapping[columnNameIndex].attachedFilesForDelete.push(attachedFileForDelete);
            }
        }
        this[modelFileMap.name] = fileName.substr(fileName.lastIndexOf('/') + 1);
        this[modelFileMap.url] = '';
        this[modelFileMap.localPath] = fileName;
        this.downloadMapping[columnNameIndex].notSavedModelUploadedFilePath = fileName;
    }

    deleteAttachedFilesForDelete() {
        if (!this.downloadMapping) {
            return;
        }
        this.downloadMapping.map((value, columnNameIndex) => {
            const fileMap = this.downloadMapping[columnNameIndex];
            if (fileMap.attachedFilesForDelete && fileMap.attachedFilesForDelete.length) {
                for (const attachedFileForDelete of this.downloadMapping[columnNameIndex].attachedFilesForDelete) {
                    console.log('attachedFileForDelete', attachedFileForDelete);
                    console.log('fileMap.localPath', this[fileMap.localPath]);
                    if (attachedFileForDelete !== this[fileMap.localPath]) {
                        this.downloadService.deleteFile(attachedFileForDelete);
                    }
                }
            }
            this.downloadMapping[columnNameIndex].attachedFilesForDelete = [];
            if (this.downloadMapping[columnNameIndex].notSavedModelUploadedFilePath) {
                this.downloadService.deleteFile(this.downloadMapping[columnNameIndex].notSavedModelUploadedFilePath);
            }
            this.downloadMapping[columnNameIndex].notSavedModelUploadedFilePath = '';
        });
    }

    deleteAllFiles() {
        if (!this.downloadMapping) {
            return;
        }
        this.downloadMapping.map((fileMap, columnNameIndex) => {
            const filePath = this[fileMap.localPath];
            if (filePath) {
                this.downloadService.deleteFile(filePath);
            }
        });
        this.deleteAttachedFilesForDelete();
    }

    unsetNotSavedModelUploadedFilePaths() {
        if (!this.downloadMapping) {
            return;
        }
        this.downloadMapping.map((value, columnNameIndex) => {
            if (this.downloadMapping[columnNameIndex].notSavedModelUploadedFilePath) {
                this.unsetNotSavedModelUploadedFilePath(columnNameIndex);
            }
        });
    }

    unsetNotSavedModelUploadedFilePath(columnNameIndex) {
        if (!this.downloadMapping ||
            !this.downloadMapping[columnNameIndex] ||
            !this.downloadMapping[columnNameIndex].notSavedModelUploadedFilePath
        ) {
            return;
        }

        this.downloadMapping[columnNameIndex].notSavedModelUploadedFilePath = '';
    }

    public getLocalFilePath(fileTypeInDownloadMap = 0) {
        return this[this.downloadMapping[fileTypeInDownloadMap].localPath];
    }

    public getApiFilePath(fileTypeInDownloadMap = 0) {
        return this[this.downloadMapping[fileTypeInDownloadMap].name];
    }

    public isExistFormatFile() {
        return this.isVideoFile() || this.isImageFile() || this.isAudioFile();
    }

    public isAudioFile() {
        const localFilePath = this.getLocalFilePath();
        const apiFilePath = this.getApiFilePath();

        return (localFilePath && (localFilePath.indexOf('.mp3') > -1)) ||
            (apiFilePath && (apiFilePath.indexOf('.mp3') > -1));
    }

    public isVideoFile() {
        const localFilePath = this.getLocalFilePath();
        const apiFilePath = this.getApiFilePath();

        return (localFilePath && (localFilePath.indexOf('.MOV') > -1 || localFilePath.indexOf('.mp4') > -1)) ||
            (apiFilePath && (apiFilePath.indexOf('.MOV') > -1 || apiFilePath.indexOf('.mp4') > -1));
    }

    public isImageFile() {
        const localFilePath = this.getLocalFilePath();
        const apiFilePath = this.getApiFilePath();

        return (localFilePath && (localFilePath.indexOf('.jpg') > -1 || localFilePath.indexOf('.png') > -1)) ||
            (apiFilePath && (apiFilePath.indexOf('.jpg') > -1 || apiFilePath.indexOf('.png') > -1));
    }
}
