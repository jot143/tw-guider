import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { GuidePage } from './guide.page';
import {SyncSpinnerComponentModule} from '../../components/sync-spinner-component/sync-spinner-component.module';
import {MainPipe} from '../../pipes/main-pipe.module';
import {HtmlDescriptionComponentModule} from '../../components/html-description/html-description-component.module';
import {LanguageSelectorComponentModule} from '../../components/language-selector-component/language-selector-component.module';
import {TranslateModule} from '@ngx-translate/core';
import {DefaultFilePreviewComponentModule} from '../../components/default-file-preview-component/default-file-preview-component.module';

@NgModule({
  declarations: [
      GuidePage
  ],
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild([
            {
                path: '',
                component: GuidePage
            }
        ]),
        SyncSpinnerComponentModule,
        HtmlDescriptionComponentModule,
        MainPipe,
        LanguageSelectorComponentModule,
        TranslateModule,
        DefaultFilePreviewComponentModule
    ],
})

export class GuidePageModule {}
