import {AfterViewChecked, ChangeDetectorRef, Component, DoCheck, OnChanges, OnInit} from '@angular/core';
import {GuideCategoryService} from '../../providers/api/guide-category-service';
import {GuiderService} from '../../providers/api/guider-service';
import {GuiderModel} from '../../models/db/api/guider-model';
import {AuthService} from '../../services/auth-service';
import {GuideCategoryModel} from '../../models/db/api/guide-category-model';
import {Events} from '@ionic/angular';
import {GuideCategoryBindingService} from '../../providers/api/guide-category-binding-service';
import {ProtocolTemplateService} from '../../providers/api/protocol-template-service';
import {ProtocolTemplateModel} from '../../models/db/api/protocol-template-model';
import {DownloadService} from '../../services/download-service';
import {PictureService} from '../../services/picture-service';

@Component({
  selector: 'app-list',
  templateUrl: 'list.page.html',
  styleUrls: ['list.page.scss']
})
export class ListPage implements OnInit {
  public guiders: GuiderModel[] = [];
  public guideCategories: GuideCategoryModel[] = [];
  public searchValue: string;

  public items: Array<{ title: string; note: string; icon: string }> = [];
  constructor(
      private guideCategoryBindingService: GuideCategoryBindingService,
      private guideCategoryService: GuideCategoryService,
      private guiderService: GuiderService,
      private protocolTemplateService: ProtocolTemplateService,
      public authService: AuthService,
      public events: Events,
      public changeDetectorRef: ChangeDetectorRef,
      private downloadService: DownloadService,
      private pictureService: PictureService
  ) {
    this.authService.checkAccess();
    this.findAllGuideCategories();
  }

  public searchGuides($event) {
    this.searchValue = $event.detail.value;

    this.guideCategoryService.findByGuides(this.searchValue).then(guideCategories => {
      this.guideCategories = guideCategories;
      this.setGuideInfo();
    });
  }

  findAllGuideCategories() {
    if (this.searchValue) {
      this.guideCategoryService.findByGuides(this.searchValue).then(guideCategories => {
        this.guideCategories = guideCategories;
        this.guideCategories.map((guideCategory) => {
          this.guideCategoryService.getGuides(guideCategory.idApi, this.searchValue).then((guides) => {
            guideCategory.guides = guides;
          });
        });
      });
    } else {
      this.guideCategoryService.findAll().then(guideCategories => {
        this.guideCategories = guideCategories;
        this.guideCategories.map((guideCategory) => {
          this.guideCategoryService.getGuides(guideCategory.idApi, this.searchValue).then((guides) => {
            guideCategory.guides = guides;
          });
        });
      });
    }
  }

  setGuideInfo() {
    this.guideCategories.map(guideCategory => {
      this.guideCategoryService.getGuides(guideCategory.idApi, this.searchValue).then((guides) => {
        guideCategory.guides = guides;
      });
    });
  }

  detectChanges() {
    if (!this.changeDetectorRef['destroyed']) {
      this.changeDetectorRef.detectChanges();
    }
  }

  trackByFn(item, index) {
    return item.id;
  }

  public editProtocol(protocolTemplate: ProtocolTemplateModel) {
    if (!protocolTemplate[ProtocolTemplateModel.COL_PROTOCOL_FILE]) {
      return;
    }
    const fileUrl = this.downloadService.getNativeFilePath(
        protocolTemplate[ProtocolTemplateModel.COL_PROTOCOL_FILE],
        protocolTemplate.TABLE_NAME
    );
    this.pictureService.editFile(
        protocolTemplate.getLocalFilePath(),
        protocolTemplate.name,
        protocolTemplate,
        0
    );
  }

  ngOnInit() {
    this.events.subscribe(this.guideCategoryBindingService.dbModelApi.TAG + ':update', (model) => {
      this.findAllGuideCategories();
    });
    this.events.subscribe(this.guideCategoryBindingService.dbModelApi.TAG + ':delete', (model) => {
      this.findAllGuideCategories();
    });
    this.events.subscribe(this.guideCategoryService.dbModelApi.TAG + ':update', (model) => {
      this.findAllGuideCategories();
    });
    this.events.subscribe(this.guideCategoryService.dbModelApi.TAG + ':create', (model) => {
      this.findAllGuideCategories();
    });
    this.events.subscribe(this.guideCategoryService.dbModelApi.TAG + ':delete', (model) => {
      this.findAllGuideCategories();
    });
    this.events.subscribe(this.guiderService.dbModelApi.TAG + ':update', (model) => {
      this.setGuideInfo();
    });
    this.events.subscribe(this.guiderService.dbModelApi.TAG + ':create', (model) => {
      this.setGuideInfo();
    });
    this.events.subscribe(this.guiderService.dbModelApi.TAG + ':delete', (model) => {
      this.setGuideInfo();
    });
    this.events.subscribe(this.protocolTemplateService.dbModelApi + ':create', (model) => {
      console.log('this.protocolTemplateService.dbModelApi + \':create\'');
      this.setGuideInfo();
    });
    this.events.subscribe(this.protocolTemplateService.dbModelApi + ':update', (model) => {
      console.log('this.protocolTemplateService.dbModelApi + \':update\'');
      this.setGuideInfo();
    });
    this.events.subscribe(this.protocolTemplateService.dbModelApi + ':delete', (model) => {
      console.log('this.protocolTemplateService.dbModelApi + \':delete\'');
      this.setGuideInfo();
    });
    this.events.subscribe('network:online', (isNetwork) => {
      this.authService.checkAccess();
    });
  }
}
