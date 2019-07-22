import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ColisEditSignaturePage } from './colis-edit-signature';

import { SignatureComponentModule } from '../../../../components/signature/signature-component.module';
@NgModule({
  declarations: [
    ColisEditSignaturePage,
  ],
  imports: [
    SignatureComponentModule,
    IonicPageModule.forChild(ColisEditSignaturePage)
  ],
  exports: [
    ColisEditSignaturePage
  ]
})
export class ColisEditSignaturePageModule { }
